"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import { uploadFile } from "../../../../lib/uploadUtils";
import Link from "next/link";

export default function VendorAddProductPage() {
  const router = useRouter();
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
  });

  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
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
        loadInitialData();
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setImages(prev => [...prev, ...files]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (images.length === 0) return [];
    
    setUploadingImages(true);
    try {
      const uploadPromises = images.map(file => uploadFile(file, `products/${Date.now()}-${file.name}`));
      const urls = await Promise.all(uploadPromises);
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
      // Upload images
      const imageUrls = await uploadImages();

      // Create product
      const { data: product, error: productError } = await supabase
        .from("products")
        .insert({
          name: formData.name,
          description: formData.description,
          category_id: formData.category_id,
          vendor_id: vendorId,
          price: parseFloat(formData.price),
          mrp_price: formData.mrp_price ? parseFloat(formData.mrp_price) : null,
          cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
          sku: formData.sku || null,
          images: imageUrls,
          return_policy: formData.return_policy || null,
          replacement_policy_days: formData.replacement_policy_days ? parseInt(formData.replacement_policy_days) : null,
          is_active: true,
        })
        .select("id")
        .single();

      if (productError) throw productError;

      // Create variants if sizes/colors selected
      if (selectedSizes.length > 0 || selectedColors.length > 0) {
        const variants: any[] = [];
        
        const sizeList = selectedSizes.length > 0 ? selectedSizes : [null];
        const colorList = selectedColors.length > 0 ? selectedColors : [null];

        for (const sizeId of sizeList) {
          for (const colorId of colorList) {
            variants.push({
              product_id: product.id,
              size_id: sizeId,
              color_id: colorId,
              quantity: 0,
              price: parseFloat(formData.price),
              mrp_price: formData.mrp_price ? parseFloat(formData.mrp_price) : null,
              cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
              sku: formData.sku ? `${formData.sku}-${sizeId || 'N'}-${colorId || 'N'}` : null,
            });
          }
        }

        if (variants.length > 0) {
          const { error: variantError } = await supabase
            .from("product_variants")
            .insert(variants);

          if (variantError) {
            console.error("Error creating variants:", variantError);
            // Continue even if variants fail
          }
        }
      }

      alert("Product created successfully!");
      router.push("/vendor/products");
    } catch (error: any) {
      console.error("Error creating product:", error);
      alert(`Error creating product: ${error.message}`);
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
            <h1 className="text-2xl font-bold text-gray-900">Add New Product</h1>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Sizes</label>
            <div className="flex flex-wrap gap-2">
              {sizes.map(size => (
                <label key={size.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedSizes.includes(size.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSizes(prev => [...prev, size.id]);
                      } else {
                        setSelectedSizes(prev => prev.filter(id => id !== size.id));
                      }
                    }}
                  />
                  <span>{size.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Colors</label>
            <div className="flex flex-wrap gap-2">
              {colors.map(color => (
                <label key={color.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedColors.includes(color.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedColors(prev => [...prev, color.id]);
                      } else {
                        setSelectedColors(prev => prev.filter(id => id !== color.id));
                      }
                    }}
                  />
                  <span>{color.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Images</label>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
            {images.length > 0 && (
              <div className="mt-4 grid grid-cols-4 gap-4">
                {images.map((img, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(img)}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 object-cover rounded"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Return Policy</label>
              <textarea
                name="return_policy"
                value={formData.return_policy}
                onChange={handleInputChange}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Replacement Policy Days</label>
              <input
                type="number"
                name="replacement_policy_days"
                value={formData.replacement_policy_days}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={submitting || uploadingImages}
              className="flex-1 px-6 py-2 bg-[#F53F7A] text-white rounded-lg hover:bg-[#F53F7A]/90 disabled:opacity-50"
            >
              {submitting || uploadingImages ? "Creating..." : "Create Product"}
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

