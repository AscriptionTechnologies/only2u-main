"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams, usePathname } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import { exportToExcel } from "../../../../lib/exportUtils";

// --- Hover Image Component ---
function HoverEnlargeImage({
  src,
  alt,
  className = "",
  aspectRatio = "4/3"
}: {
  src: string | null;
  alt: string;
  className?: string;
  aspectRatio?: string;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (e: React.MouseEvent) => {
    setIsHovered(true);
    updatePosition(e);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    updatePosition(e);
  };

  const updatePosition = (e: React.MouseEvent) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate position relative to viewport
    // Image will be 25vw width, max 300px, min 200px
    const enlargedWidth = Math.min(Math.max(viewportWidth * 0.25, 200), 300);
    const enlargedHeight = enlargedWidth * (aspectRatio === "1/1" ? 1 : aspectRatio === "4/3" ? 0.75 : 1);

    let x = e.clientX + 16; // 16px offset from cursor
    let y = e.clientY - enlargedHeight / 2;

    // Prevent going off right edge
    if (x + enlargedWidth > viewportWidth - 16) {
      x = e.clientX - enlargedWidth - 16;
    }

    // Prevent going off top/bottom edges
    if (y < 16) {
      y = 16;
    } else if (y + enlargedHeight > viewportHeight - 16) {
      y = viewportHeight - enlargedHeight - 16;
    }

    setPosition({ x, y });
  };

  if (!src) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        className={`relative overflow-hidden cursor-zoom-in ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsHovered(false)}
        onMouseMove={handleMouseMove}
      >
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Enlarged Image Overlay */}
      {isHovered && (
        <div
          className="fixed z-[9999] pointer-events-none animate-in fade-in zoom-in-95 duration-200"
          style={{
            left: position.x,
            top: position.y,
            width: 'clamp(200px, 25vw, 300px)',
          }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
            style={{ aspectRatio }}
          >
            <img
              src={src}
              alt={alt}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}
    </>
  );
}

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

type VideoCountBySize = {
  sizeName: string;
  videoCount: number;
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
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize state from URL params
  const [searchSku, setSearchSku] = useState(searchParams?.get("searchSku") || "");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">((searchParams?.get("statusFilter") as "all" | "active" | "inactive") || "all");
  const [featuredFilter, setFeaturedFilter] = useState<"all" | "best_seller" | "trending" | "none">((searchParams?.get("featuredFilter") as "all" | "best_seller" | "trending" | "none") || "all");
  const [vendorFilter, setVendorFilter] = useState<string>(searchParams?.get("vendorFilter") || "all");
  const [videoFilter, setVideoFilter] = useState<"all" | "with_videos" | "without_videos">((searchParams?.get("videoFilter") as "all" | "with_videos" | "without_videos") || "all");

  const initialMinPrice = searchParams?.get("minPrice") ? Number(searchParams.get("minPrice")) : "";
  const initialMaxPrice = searchParams?.get("maxPrice") ? Number(searchParams.get("maxPrice")) : "";

  const [minPrice, setMinPrice] = useState<number | "">(initialMinPrice);
  const [maxPrice, setMaxPrice] = useState<number | "">(initialMaxPrice);

  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Sync state changes to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams ? searchParams.toString() : "");

    if (searchSku) params.set("searchSku", searchSku);
    else params.delete("searchSku");

    if (statusFilter !== "all") params.set("statusFilter", statusFilter);
    else params.delete("statusFilter");

    if (featuredFilter !== "all") params.set("featuredFilter", featuredFilter);
    else params.delete("featuredFilter");

    if (vendorFilter !== "all") params.set("vendorFilter", vendorFilter);
    else params.delete("vendorFilter");

    if (videoFilter !== "all") params.set("videoFilter", videoFilter);
    else params.delete("videoFilter");

    if (minPrice !== "") params.set("minPrice", minPrice.toString());
    else params.delete("minPrice");

    if (maxPrice !== "") params.set("maxPrice", maxPrice.toString());
    else params.delete("maxPrice");

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchSku, statusFilter, featuredFilter, vendorFilter, videoFilter, minPrice, maxPrice, pathname, router, searchParams]);

  const hasActiveFilters =
    searchSku.trim() ||
    statusFilter !== "all" ||
    featuredFilter !== "all" ||
    vendorFilter !== "all" ||
    videoFilter !== "all" ||
    minPrice !== "" ||
    maxPrice !== "";

  const resetFilters = () => {
    setSearchSku("");
    setStatusFilter("all");
    setFeaturedFilter("all");
    setVendorFilter("all");
    setVideoFilter("all");
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

  // Helper to get video counts by size for a product
  const getVideoCountsBySize = (product: Product): VideoCountBySize[] => {
    if (!product.variants || product.variants.length === 0) {
      return [];
    }

    const sizeVideoMap: Map<string, number> = new Map();

    product.variants.forEach((variant) => {
      const sizeName = variant.size?.name || "Unknown";
      const videoCount = variant.video_urls?.length || 0;

      sizeVideoMap.set(
        sizeName,
        (sizeVideoMap.get(sizeName) || 0) + videoCount
      );
    });

    return Array.from(sizeVideoMap.entries())
      .map(([sizeName, videoCount]) => ({ sizeName, videoCount }))
      .sort((a, b) => a.sizeName.localeCompare(b.sizeName));
  };

  // Helper to check if product has any videos
  const hasVideos = (product: Product): boolean => {
    if (!product.variants || product.variants.length === 0) {
      return false;
    }
    return product.variants.some(
      (variant) => variant.video_urls && variant.video_urls.length > 0
    );
  };

  // Helper to get total video count for a product
  const getTotalVideoCount = (product: Product): number => {
    if (!product.variants || product.variants.length === 0) {
      return 0;
    }
    return product.variants.reduce(
      (sum, variant) => sum + (variant.video_urls?.length || 0),
      0
    );
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

    if (videoFilter !== "all") {
      const productHasVideos = hasVideos(product);
      if (videoFilter === "with_videos" && !productHasVideos) {
        return false;
      }
      if (videoFilter === "without_videos" && productHasVideos) {
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
            className={`flex items-center gap-2 py-2 px-4 rounded-lg transition-colors cursor-pointer border ${exporting || products.length === 0
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

                <div className="min-w-[180px]">
                  <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                    Videos
                  </label>
                  <div className="relative">
                    <select
                      value={videoFilter}
                      onChange={(e) => setVideoFilter(e.target.value as typeof videoFilter)}
                      className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm focus:border-[#F53F7A] focus:ring-2 focus:ring-[#F53F7A]/20 transition-all"
                    >
                      <option value="all">All Products</option>
                      <option value="with_videos">With Videos</option>
                      <option value="without_videos">Without Videos</option>
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
            <table className="min-w-full divide-y divide-gray-200 hidden md:table">
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
                    Videos
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
                    <td colSpan={9} className="px-6 py-10 text-center text-gray-500">
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
                            <HoverEnlargeImage
                              src={getFirstImage(product)}
                              alt={product.name}
                              className="h-10 w-10 rounded-lg"
                              aspectRatio="1/1"
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                            <div className="text-sm text-gray-500 line-clamp-1 max-w-[200px]">{product.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getFirstSku(product)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {getSmallestPrice(product) ? `₹${getSmallestPrice(product)}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {product.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.vendor_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(() => {
                          const videoCounts = getVideoCountsBySize(product);
                          const totalVideos = getTotalVideoCount(product);
                          if (totalVideos === 0) {
                            return <span className="text-gray-400 text-sm">-</span>;
                          }
                          return (
                            <div className="group relative">
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700 cursor-help">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {totalVideos} video{totalVideos !== 1 ? 's' : ''}
                              </span>
                              {/* Tooltip */}
                              <div className="absolute left-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                                <p className="text-xs font-semibold text-gray-700 mb-2">Videos by Size:</p>
                                <div className="space-y-1">
                                  {videoCounts.map(({ sizeName, videoCount }) => (
                                    <div key={sizeName} className="flex justify-between text-xs">
                                      <span className="text-gray-600">{sizeName}:</span>
                                      <span className="font-medium text-orange-600">{videoCount} video{videoCount !== 1 ? 's' : ''}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.featured_type === 'best_seller' && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                            Best Seller
                          </span>
                        )}
                        {product.featured_type === 'trending' && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            Trending
                          </span>
                        )}
                        {!product.featured_type && '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleProductStatus(product)}
                            className={`p-1 rounded-md transition-colors ${product.is_active
                              ? 'text-red-600 hover:bg-red-50'
                              : 'text-green-600 hover:bg-green-50'
                              }`}
                            title={product.is_active ? "Deactivate" : "Activate"}
                          >
                            {product.is_active ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="p-1 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-md transition-colors"
                            title="Edit"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product)}
                            className="p-1 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-md transition-colors"
                            title="Delete"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Mobile & Tablet Tile View (Always Visible on smaller screens, replaced table for consistent look if desired, but here replacing hidden class logic to allow grid everywhere if needed, or just mobile. 
                User asked for "tile view for all products", implying grid view might be better for Desktop too. 
                Let's implement a responsive Grid view that REPLACES the table entirely, as per "I also want the same tile view for all products" request which likely means ALL screens. 
            */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 p-1">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group flex flex-col"
                >
                  {/* Product Image & Badge */}
                  <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                    <HoverEnlargeImage
                      src={getFirstImage(product)}
                      alt={product.name}
                      className="w-full h-full"
                      aspectRatio="4/3"
                    />

                    {/* Status Badge */}
                    <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                      <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md shadow-sm ${product.is_active ? 'bg-white/90 text-green-700 backdrop-blur-sm' : 'bg-white/90 text-red-700 backdrop-blur-sm'
                        }`}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {product.featured_type === 'best_seller' && (
                        <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md shadow-sm bg-purple-500/90 text-white backdrop-blur-sm">
                          Best Seller
                        </span>
                      )}
                      {product.featured_type === 'trending' && (
                        <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md shadow-sm bg-blue-500/90 text-white backdrop-blur-sm">
                          Trending
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="mb-2">
                      <h3 className="font-semibold text-gray-900 line-clamp-1 mb-0.5" title={product.name}>
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                          {getFirstSku(product)}
                        </span>
                        {product.vendor_name && (
                          <span className="truncate max-w-[100px]" title={product.vendor_name}>
                            • {product.vendor_name}
                          </span>
                        )}
                      </div>
                      {/* Video Count */}
                      {(() => {
                        const videoCounts = getVideoCountsBySize(product);
                        const totalVideos = getTotalVideoCount(product);
                        if (totalVideos === 0) return null;
                        return (
                          <div className="group relative inline-block mt-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded cursor-help">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {totalVideos} video{totalVideos !== 1 ? 's' : ''}
                            </span>
                            {/* Tooltip */}
                            <div className="absolute left-0 bottom-full mb-2 w-44 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                              <p className="text-xs font-semibold text-gray-700 mb-2">Videos by Size:</p>
                              <div className="space-y-1">
                                {videoCounts.map(({ sizeName, videoCount }) => (
                                  <div key={sizeName} className="flex justify-between text-xs">
                                    <span className="text-gray-600">{sizeName}:</span>
                                    <span className="font-medium text-orange-600">{videoCount} video{videoCount !== 1 ? 's' : ''}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Video Count Badge */}
                    {(getTotalVideoCount(product) > 0 || videoFilter !== "all") && (
                      <div className="mb-2">
                        {getTotalVideoCount(product) > 0 ? (
                          <div className="inline-flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                              </svg>
                              <span className="text-xs font-medium text-green-600">
                                {getTotalVideoCount(product)} videos
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {getVideoCountsBySize(product).map(({ sizeName, videoCount }) => (
                                videoCount > 0 && (
                                  <span
                                    key={sizeName}
                                    className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-700 rounded border border-green-200"
                                  >
                                    {sizeName}: {videoCount}
                                  </span>
                                )
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            No videos
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between">
                      <div>
                        {getSmallestPrice(product) ? (
                          <div className="flex items-baseline gap-1">
                            <span className="text-sm font-bold text-gray-900">₹{getSmallestPrice(product)}</span>
                            {computeMaxPrice(product.variants || []) !== getSmallestPrice(product) && (
                              <span className="text-xs text-gray-400 font-medium">
                                - {computeMaxPrice(product.variants || [])}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">No price</span>
                        )}
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {computeTotalQuantity(product.variants || [])} units in stock
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleProductStatus(product)}
                          className={`p-2 rounded-lg transition-colors ${product.is_active
                            ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                            : 'text-green-600 hover:bg-green-50'
                            }`}
                          title={product.is_active ? "Deactivate" : "Activate"}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 5.636a9 9 0 0112.728 0A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEditProduct(product)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add New Product Card (at the end of grid) */}
              <button
                onClick={handleAddProduct}
                className="min-h-[300px] rounded-xl border-2 border-dashed border-gray-200 hover:border-[#F53F7A]/50 hover:bg-[#F53F7A]/5 transition-all duration-200 flex flex-col items-center justify-center gap-4 group"
              >
                <div className="w-16 h-16 rounded-full bg-gray-50 group-hover:bg-white group-hover:shadow-md flex items-center justify-center transition-all duration-200">
                  <svg className="w-8 h-8 text-gray-400 group-hover:text-[#F53F7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <span className="font-medium text-gray-500 group-hover:text-[#F53F7A]">Add New Product</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}