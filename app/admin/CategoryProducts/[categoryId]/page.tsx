"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import { exportToExcel } from "../../../../lib/exportUtils";

// --- Types ---
type Category = {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  is_active: boolean;
};

type Product = {
  id: string;
  created_at: string;
  name: string;
  description: string;
  category_id: string;
  is_active: boolean;
  updated_at: string;
  featured_type?: "trending" | "best_seller" | null;
  like_count?: number;
  return_policy?: string;
  vendor_id?: string | null;
  vendor_name?: string;
  alias_vendor?: string;
  variants?: ProductVariant[];
  min_price?: number | null;
};

type VendorOption = {
  id: string;
  business_name: string;
};

type ProductVariant = {
  id: string;
  product_id: string;
  color_id?: string | null;
  size_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  price: number;
  sku: string;
  mrp_price: number;
  rsp_price: number;
  cost_price: number;
  discount_percentage: number;
  image_urls: string[];
  video_urls: string[];
  size?: {
    name: string;
  };
};

export default function CategoryProducts() {
  const params = useParams();
  const router = useRouter();
  const categoryId = Array.isArray((params as any)?.categoryId)
    ? ((params as any)?.categoryId[0] as string | undefined)
    : ((params as any)?.categoryId as string | undefined);
  
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [searchSku, setSearchSku] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [featuredFilter, setFeaturedFilter] = useState<"all" | "best_seller" | "trending" | "none">("all");
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [minPrice, setMinPrice] = useState<number | "">("");
  const [maxPrice, setMaxPrice] = useState<number | "">("");
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [exporting, setExporting] = useState(false);

  const hasActiveFilters =
    searchSku.trim() ||
    statusFilter !== "all" ||
    featuredFilter !== "all" ||
    vendorFilter !== "all" ||
    minPrice !== "" ||
    maxPrice !== "";

  const resetFilters = () => {
    setSearchSku("");
    setStatusFilter("all");
    setFeaturedFilter("all");
    setVendorFilter("all");
    setMinPrice("");
    setMaxPrice("");
  };

  useEffect(() => {
    if (!categoryId) {
      setLoading(false);
      setLoadingProducts(false);
      return;
    }

    fetchCategory(categoryId);
    fetchCategoryProducts(categoryId);
    fetchVendors();
  }, [categoryId]);

  const fetchCategory = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        console.error('Error fetching category:', error);
        return;
      }
      setCategory(data);
    } catch (error) {
      console.error('Error fetching category:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryProducts = async (id: string) => {
    try {
      setLoadingProducts(true);
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          created_at,
          name,
          description,
          category_id,
          is_active,
          updated_at,
          featured_type,
          like_count,
          return_policy,
          vendor_id,
          vendor_name,
          alias_vendor,
          variants:product_variants(
            id,
            product_id,
            color_id,
            size_id,
            quantity,
            created_at,
            updated_at,
            price,
            sku,
            mrp_price,
            rsp_price,
            cost_price,
            discount_percentage,
            image_urls,
            video_urls,
            size:sizes(name)
          )
        `)
        .eq('category_id', id)
        .order('created_at', { ascending: false });
      if (error) {
        console.log(error), 'error';
        console.error('Error fetching category products:', error);
        return;
      }
      const transformedData = (data || []).map((product: any) => ({
        ...product,
        variants: product.variants || [],
        min_price: computeMinPrice(product.variants || []),
      }));
      setProducts(transformedData);
    } catch (error) {
      console.error('Error fetching category products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, business_name')
        .eq('is_verified', true)
        .order('business_name', { ascending: true });

      if (error) {
        console.error('Error fetching vendors:', error);
        return;
      }
      setVendors((data || []) as VendorOption[]);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const computeMinPrice = (variants: ProductVariant[]): number | null => {
    if (!variants || variants.length === 0) {
      return null;
    }
    const sortedVariants = [...variants].sort(
      (a: ProductVariant, b: ProductVariant) => (a.price || 0) - (b.price || 0)
    );
    const first = sortedVariants[0];
    if (!first || first.price == null) {
      return null;
    }
    return Number(first.price);
  };

  const computeMaxPrice = (variants: ProductVariant[]): number | null => {
    if (!variants || variants.length === 0) {
      return null;
    }
    const sortedVariants = [...variants].sort(
      (a: ProductVariant, b: ProductVariant) => (b.price || 0) - (a.price || 0)
    );
    const first = sortedVariants[0];
    if (!first || first.price == null) {
      return null;
    }
    return Number(first.price);
  };

  const computeTotalQuantity = (variants: ProductVariant[]): number => {
    if (!variants || variants.length === 0) {
      return 0;
    }
    return variants.reduce((sum, variant) => {
      const qty = Number(variant.quantity ?? 0);
      return sum + (Number.isFinite(qty) ? qty : 0);
    }, 0);
  };

  const getSmallestPrice = (product: Product) => {
    if (product.min_price == null) {
      return "";
    }
    return product.min_price;
  };

  const getFirstImage = (product: Product) => {
    if (!product.variants || product.variants.length === 0) {
      return null;
    }
    const firstVariant = product.variants[0];
    return firstVariant.image_urls && firstVariant.image_urls.length > 0 
      ? firstVariant.image_urls[0] 
      : null;
  };

  const getFirstSku = (product: Product) => {
    if (!product.variants || product.variants.length === 0) {
      return "-";
    }
    return product.variants[0].sku || "-";
  };

  const filteredProducts = products.filter((product) => {
    if (searchSku.trim()) {
      const lookup = searchSku.trim().toLowerCase();
      const matchesSku =
        product.variants?.some((variant) => variant.sku?.toLowerCase().includes(lookup)) ?? false;
      if (!matchesSku) {
        return false;
      }
    }

    if (statusFilter !== "all") {
      const shouldBeActive = statusFilter === "active";
      if (product.is_active !== shouldBeActive) {
        return false;
      }
    }

    if (featuredFilter !== "all") {
      if (featuredFilter === "none") {
        if (product.featured_type) {
          return false;
        }
      } else if (product.featured_type !== featuredFilter) {
        return false;
      }
    }

    if (vendorFilter !== "all") {
      if (product.vendor_id !== vendorFilter) {
        return false;
      }
    }

    if (minPrice !== "" || maxPrice !== "") {
      const price = product.min_price ?? null;
      if (price == null) {
        return false;
      }
      if (minPrice !== "" && price < Number(minPrice)) {
        return false;
      }
      if (maxPrice !== "" && price > Number(maxPrice)) {
        return false;
      }
    }

    return true;
  });

  const handleExportToExcel = async () => {
    if (products.length === 0) {
      alert("There are no products to export right now.");
      return;
    }

    try {
      setExporting(true);
      const dataset = products;

      const rows = dataset.map((product, index) => {
        const variants = product.variants || [];
        const skuList = variants.map((variant) => variant.sku).filter(Boolean).join(", ");
        const sizeList = variants
          .map((variant) => variant.size?.name || "")
          .filter(Boolean)
          .join(", ");
        const variantDetails = variants
          .map((variant, variantIndex) => {
            const details = [
              `#${variantIndex + 1}`,
              `SKU: ${variant.sku || "-"}`,
              `Size: ${variant.size?.name || "-"}`,
              `Qty: ${variant.quantity ?? 0}`,
              `Price: ${variant.price ?? "-"}`,
              `MRP: ${variant.mrp_price ?? "-"}`,
            ];
            return details.join(" | ");
          })
          .join(" || ");

        return {
          "S.No": index + 1,
          "Product ID": product.id,
          "Product Name": product.name,
          "Category": category?.name || "-",
          "Vendor": product.vendor_name || "-",
          "Alias Vendor": product.alias_vendor || "-",
          "Featured Type": product.featured_type
            ? product.featured_type === "best_seller"
              ? "Best Seller"
              : "Trending"
            : "Not Featured",
          Status: product.is_active ? "Active" : "Inactive",
          "Total Variants": variants.length,
          "SKU(s)": skuList || "-",
          "Primary SKU": getFirstSku(product),
          Sizes: sizeList || "-",
          "Inventory (Units)": computeTotalQuantity(variants),
          "Lowest Price": product.min_price ?? "",
          "Highest Price": computeMaxPrice(variants) ?? "",
          "Like Count": product.like_count ?? 0,
          "Return Policy": product.return_policy || "-",
          "Created At": product.created_at,
          "Last Updated": product.updated_at,
          "Variant Breakdown": variantDetails || "-",
        };
      });

      const summaryData = [
        ["Inventory Overview", ""],
        ["Category", category?.name || "-"],
        ["Total Products", dataset.length],
        ["Active Products", dataset.filter((product) => product.is_active).length],
        ["Inactive Products", dataset.filter((product) => !product.is_active).length],
        [
          "Featured (Best Sellers)",
          dataset.filter((product) => product.featured_type === "best_seller").length,
        ],
        [
          "Featured (Trending)",
          dataset.filter((product) => product.featured_type === "trending").length,
        ],
        ["Products In View After Filters", filteredProducts.length],
        [
          "Total Variants",
          dataset.reduce((sum, product) => sum + (product.variants?.length ?? 0), 0),
        ],
        [
          "Total Inventory Units",
          dataset.reduce(
            (sum, product) => sum + computeTotalQuantity(product.variants || []),
            0
          ),
        ],
      ];

      await exportToExcel({
        filename: `${category?.name || "inventory"}-products`,
        summary: summaryData,
        sheets: [
          {
            name: "Products",
            data: rows,
          },
        ],
      });
    } catch (error) {
      console.error("Error exporting inventory:", error);
      alert("Failed to export inventory. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleEditProduct = (product: Product) => {
    if (!categoryId) return;
    router.push(`/admin/ProductForm?edit=${product.id}&category=${categoryId}`);
  };

  const handleAddProduct = () => {
    if (!categoryId) return;
    router.push(`/admin/ProductForm?category=${categoryId}`);
  };

  const handleDeleteProduct = async (product: Product) => {
    if (typeof window !== 'undefined' && !window.confirm(`Are you sure you want to delete ${product.name}?`)) return;
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);
      if (error) {
        console.error('Error deleting product:', error);
        return;
      }
      if (categoryId) {
        fetchCategoryProducts(categoryId);
      }
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const toggleProductStatus = async (product: Product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({
          is_active: !product.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', product.id);
      if (error) {
        console.error('Error updating product status:', error);
        return;
      }
      if (categoryId) {
        fetchCategoryProducts(categoryId);
      }
    } catch (error) {
      console.error('Error updating product status:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F53F7A] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading category...</p>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Category Not Found</h2>
          <p className="text-gray-600 mb-4">The category you're looking for doesn't exist.</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-[#F53F7A] text-white rounded-lg hover:bg-[#F53F7A]/90"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            Products in {category.name}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportToExcel}
            disabled={exporting || products.length === 0}
            className={`flex items-center gap-2 py-2 px-4 rounded-lg transition-colors cursor-pointer border ${
              exporting || products.length === 0
                ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"
            }`}
          >
            {exporting ? (
              <svg className="h-4 w-4 animate-spin text-[#F53F7A]" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3.5-3.5L12 0v4a8 8 0 00-8 8h4z"></path>
              </svg>
            ) : (
              <svg className="w-4 h-4 text-[#F53F7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M8 12l4 4m0 0l4-4m-4 4V4" />
              </svg>
            )}
            {exporting ? "Preparing..." : "Export to Excel"}
          </button>
          <button
            onClick={handleAddProduct}
            className="flex items-center gap-2 py-2 px-4 bg-[#F53F7A] text-white rounded-lg hover:bg-[#F53F7A]/90 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Product
          </button>
        </div>
      </div>

      {/* Products List */}
      <div className="bg-white">
        {loadingProducts ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F53F7A] mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-6 text-center">
            <div className="text-gray-400 mb-3">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600 mb-3">Get started by adding your first product to this category.</p>
            <button
              onClick={handleAddProduct}
              className="flex items-center gap-2 px-4 py-2 bg-[#F53F7A] text-white rounded-lg hover:bg-[#F53F7A]/90"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add First Product
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 mb-4">
              <div className="flex flex-wrap items-start gap-4">
                <div className="flex-1 min-w-[220px]">
                  <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                    Search SKU
                  </label>
                  <div className="relative rounded-xl border border-gray-200 focus-within:border-[#F53F7A] focus-within:ring-2 focus-within:ring-[#F53F7A]/20 transition-all">
                    <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 pointer-events-none">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      value={searchSku}
                      onChange={(e) => setSearchSku(e.target.value)}
                      placeholder="Search by SKU or partial match"
                      className="w-full rounded-xl border-0 bg-transparent pl-10 pr-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="min-w-[160px]">
                  <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                    Status
                  </label>
                  <div className="relative">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                      className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm focus:border-[#F53F7A] focus:ring-2 focus:ring-[#F53F7A]/20 transition-all"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </div>
                </div>

                <div className="min-w-[180px]">
                  <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                    Featured Type
                  </label>
                  <div className="relative">
                    <select
                      value={featuredFilter}
                      onChange={(e) => setFeaturedFilter(e.target.value as typeof featuredFilter)}
                      className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm focus:border-[#F53F7A] focus:ring-2 focus:ring-[#F53F7A]/20 transition-all"
                    >
                      <option value="all">All Feature Types</option>
                      <option value="best_seller">Best Seller</option>
                      <option value="trending">Trending</option>
                      <option value="none">Not Featured</option>
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </div>
                </div>

                <div className="min-w-[200px]">
                  <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                    Vendor
                  </label>
                  <div className="relative">
                    <select
                      value={vendorFilter}
                      onChange={(e) => setVendorFilter(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm focus:border-[#F53F7A] focus:ring-2 focus:ring-[#F53F7A]/20 transition-all"
                    >
                      <option value="all">All Vendors</option>
                      {vendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.business_name}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </div>
                </div>

                <div className="min-w-[220px]">
                  <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                    Price Range (₹)
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value ? Number(e.target.value) : "")}
                        placeholder="Min"
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 shadow-sm focus:border-[#F53F7A] focus:ring-2 focus:ring-[#F53F7A]/20 transition-all"
                      />
                      <span className="absolute inset-y-0 right-3 flex items-center text-gray-300 text-sm">₹</span>
                    </div>
                    <span className="text-gray-300 font-medium">—</span>
                    <div className="relative flex-1">
                      <input
                        type="number"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : "")}
                        placeholder="Max"
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 shadow-sm focus:border-[#F53F7A] focus:ring-2 focus:ring-[#F53F7A]/20 transition-all"
                      />
                      <span className="absolute inset-y-0 right-3 flex items-center text-gray-300 text-sm">₹</span>
                    </div>
                  </div>
                </div>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 19.5l15-15m-15 0h15v15" />
                    </svg>
                    Clear filters
                  </button>
                )}
              </div>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    S.No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Featured
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                      No products match the current filters.
                    </td>
                  </tr>
                ) : (
                filteredProducts.map((product, index) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {getFirstImage(product) ? (
                            <img
                              className="h-10 w-10 rounded-lg object-cover"
                              src={getFirstImage(product)!}
                              alt={product.name}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                              <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500 max-w-xs truncate">
                            {product.description || "No description"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getFirstSku(product)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-[#F53F7A]">
                        ₹{getSmallestPrice(product)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        product.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}>
                        {product.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.vendor_name || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.featured_type ? (product.featured_type === "best_seller" ? "Best Seller" : "Trending") : "None"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => handleEditProduct(product)}
                          className="flex items-center gap-1.5 text-[#F53F7A] hover:text-[#F53F7A]/80 font-medium px-2 py-1 rounded-md hover:bg-[#F53F7A]/10 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                        <button
                          onClick={() => toggleProductStatus(product)}
                          className={`flex items-center gap-1.5 font-medium px-2 py-1 rounded-md transition-colors ${
                            product.is_active
                              ? "text-orange-600 hover:text-orange-800 hover:bg-orange-50"
                              : "text-green-600 hover:text-green-800 hover:bg-green-50"
                          }`}
                        >
                          {product.is_active ? (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                              </svg>
                              Deactivate
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Activate
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product)}
                          className="flex items-center gap-1.5 text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded-md hover:bg-red-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 