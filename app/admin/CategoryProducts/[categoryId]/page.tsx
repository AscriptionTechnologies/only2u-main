"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

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
  vendor_name?: string;
  alias_vendor?: string;
  variants?: ProductVariant[];
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
  const categoryId = params.categoryId as string;
  
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    if (categoryId) {
      fetchCategory();
      fetchCategoryProducts();
    }
  }, [categoryId]);

  const fetchCategory = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', categoryId)
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

  const fetchCategoryProducts = async () => {
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
        .eq('category_id', categoryId)
        .order('created_at', { ascending: false });
      if (error) {
        console.log(error), 'error';
        console.error('Error fetching category products:', error);
        return;
      }
      const transformedData = (data || []).map((product: any) => ({
        ...product,
        variants: product.variants || [],
      }));
      setProducts(transformedData);
    } catch (error) {
      console.error('Error fetching category products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const getSmallestPrice = (product: Product) => {
    if (!product.variants || product.variants.length === 0) {
      return "";
    }
    const sortedVariants = [...product.variants].sort(
      (a: ProductVariant, b: ProductVariant) => (a.price || 0) - (b.price || 0)
    );
    return sortedVariants[0]?.price || "";
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

  const handleEditProduct = (product: Product) => {
    router.push(`/admin/ProductForm?edit=${product.id}&category=${categoryId}`);
  };

  const handleAddProduct = () => {
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
      fetchCategoryProducts();
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
      fetchCategoryProducts();
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
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
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
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 