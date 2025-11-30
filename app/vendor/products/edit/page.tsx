"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import { uploadFile } from "../../../../lib/uploadUtils";
import Link from "next/link";

function VendorEditProductContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams?.get("id");
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [sizes, setSizes] = useState<any[]>([]);
  const [colors, setColors] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category_id: "",
    price: "",
    mrp_price: "",
    cost_price: "",
    sku: "",
    return_policy: "",
    replacement_policy_days: "",
    is_active: true,
  });

  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (productId) {
      checkAuthAndLoadProduct();
    }
  }, [productId]);

  const checkAuthAndLoadProduct = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        router.push("/auth/Login");
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role, vendor_id, is_active")
        .eq("id", user.id)
        .single();

      if (userError || !userData || userData.role !== "vendor" || !userData.is_active) {
        router.push("/auth/Login");
        return;
      }

      if (userData.vendor_id) {
        setVendorId(userData.vendor_id);
        await loadInitialData();
        await loadProduct(productId!, userData.vendor_id);
      }
    } catch (error: any) {
      console.error("Error:", error);
      router.push("/auth/Login");
    } finally {
      setLoading(false);
    }
  };

  const loadInitialData = async () => {
    try {
      const [categoriesRes, sizesRes, colorsRes] = await Promise.all([
        supabase.from("categories").select("*").eq("is_active", true).order("name"),
        supabase.from("sizes").select("*").order("name"),
        supabase.from("colors").select("*").order("name"),
      ]);

      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (sizesRes.data) setSizes(sizesRes.data);
      if (colorsRes.data) setColors(colorsRes.data);
    } catch (error: any) {
      console.error("Error loading data:", error);
    }
  };

  const loadProduct = async (productId: string, vendorId: string) => {
    try {
      const { data: product, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .eq("vendor_id", vendorId)
        .single();

      if (error) throw error;
      if (!product) {
        alert("Product not found or you don't have permission to edit it");
        router.push("/vendor/products");
        return;
      }

      setFormData({
        name: product.name || "",
        description: product.description || "",
        category_id: product.category_id || "",
        price: product.price?.toString() || "",
        mrp_price: product.mrp_price?.toString() || "",
        cost_price: product.cost_price?.toString() || "",
        sku: product.sku || "",
        return_policy: product.return_policy || "",
        replacement_policy_days: product.replacement_policy_days?.toString() || "",
        is_active: product.is_active ?? true,
      });

      if (product.images) {
        setExistingImages(Array.isArray(product.images) ? product.images : []);
      }

      // Load variants to get selected sizes/colors
      const { data: variants } = await supabase
        .from("product_variants")
        .select("size_id, color_id")
        .eq("product_id", productId);

      if (variants) {
        const sizeIds = new Set(variants.map((v: any) => v.size_id).filter(Boolean));
        const colorIds = new Set(variants.map((v: any) => v.color_id).filter(Boolean));
        setSelectedSizes(Array.from(sizeIds));
        setSelectedColors(Array.from(colorIds));
      }
    } catch (error: any) {
      console.error("Error loading product:", error);
      alert("Error loading product");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setNewImages(prev => [...prev, ...files]);
    }
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    setNewImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadNewImages = async (): Promise<string[]> => {
    if (newImages.length === 0) return [];
    
    setUploadingImages(true);
    try {
      const uploadPromises = newImages.map(file => uploadFile(file, `products/${Date.now()}-${file.name}`));
      const results = await Promise.all(uploadPromises);
      
      // Extract URLs and filter out failed uploads
      const urls: string[] = [];
      for (const result of results) {
        if (result.error) {
          console.error("Upload error:", result.error);
          throw new Error(`Failed to upload image: ${result.error}`);
        }
        if (result.url) {
          urls.push(result.url);
        }
      }
      
      return urls;
    } catch (error: any) {
      throw new Error(`Failed to upload images: ${error.message}`);
    } finally {
      setUploadingImages(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.category_id || !formData.price) {
      alert("Please fill in all required fields");
      return;
    }

    setSubmitting(true);

    try {
      // Upload new images
      const newImageUrls = await uploadNewImages();
      const allImages = [...existingImages, ...newImageUrls];

      // Update product
      const { error: productError } = await supabase
        .from("products")
        .update({
          name: formData.name,
          description: formData.description,
          category_id: formData.category_id,
          price: parseFloat(formData.price),
          mrp_price: formData.mrp_price ? parseFloat(formData.mrp_price) : null,
          cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
          sku: formData.sku || null,
          images: allImages,
          return_policy: formData.return_policy || null,
          replacement_policy_days: formData.replacement_policy_days ? parseInt(formData.replacement_policy_days) : null,
          is_active: formData.is_active,
        })
        .eq("id", productId)
        .eq("vendor_id", vendorId);

      if (productError) throw productError;

      alert("Product updated successfully!");
      router.push("/vendor/products");
    } catch (error: any) {
      console.error("Error updating product:", error);
      alert(`Error updating product: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F53F7A]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/vendor/products" className="text-gray-600 hover:text-gray-900">
              ← Back to Products
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                required
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MRP</label>
              <input
                type="number"
                name="mrp_price"
                value={formData.mrp_price}
                onChange={handleInputChange}
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price</label>
              <input
                type="number"
                name="cost_price"
                value={formData.cost_price}
                onChange={handleInputChange}
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Images</label>
            {existingImages.length > 0 && (
              <div className="mb-4 grid grid-cols-4 gap-4">
                {existingImages.map((url, index) => (
                  <div key={index} className="relative">
                    <img
                      src={url}
                      alt={`Existing ${index + 1}`}
                      className="w-full h-32 object-cover rounded"
                    />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
            {newImages.length > 0 && (
              <div className="mt-4 grid grid-cols-4 gap-4">
                {newImages.map((img, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(img)}
                      alt={`New ${index + 1}`}
                      className="w-full h-32 object-cover rounded"
                    />
                    <button
                      type="button"
                      onClick={() => removeNewImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="w-4 h-4"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
              Product is active
            </label>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={submitting || uploadingImages}
              className="flex-1 px-6 py-2 bg-[#F53F7A] text-white rounded-lg hover:bg-[#F53F7A]/90 disabled:opacity-50"
            >
              {submitting || uploadingImages ? "Updating..." : "Update Product"}
            </button>
            <Link
              href="/vendor/products"
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function VendorEditProductPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F53F7A]"></div>
        </div>
      }
    >
      <VendorEditProductContent />
    </Suspense>
  );
}

