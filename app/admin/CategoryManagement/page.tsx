"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

// --- Types ---
type Category = {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  is_active: boolean;
};

export default function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching categories:', error);
        return;
      }
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };



  const handleAddCategory = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      image_url: '',
      is_active: true,
    });
    setImageFile(null);
    setModalVisible(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description,
      image_url: category.image_url || '',
      is_active: category.is_active,
    });
    setImageFile(null);
    setModalVisible(true);
  };

  const handleDeleteCategory = async (category: Category) => {
    if (typeof window !== 'undefined' && !window.confirm(`Delete category "${category.name}"?`)) return;
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', category.id);
      if (error) {
        console.error('Error deleting category:', error);
        return;
      }
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const fileName = `category_${Date.now()}.jpg`;
      const filePath = `categories/${fileName}`;
      const { data, error } = await supabase.storage
        .from('categoryimages')
        .upload(filePath, bytes, {
          contentType: 'image/jpeg',
        });
      if (error) {
        console.error('Upload error:', error);
        return null;
      }
      const { data: urlData } = supabase.storage
        .from('categoryimages')
        .getPublicUrl(filePath);
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const handleImagePicker = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setSubmitting(true);
      const uploadedUrl = await uploadImage(file);
      if (uploadedUrl) {
        setFormData({ ...formData, image_url: uploadedUrl });
      }
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Category name is required');
      return;
    }
    try {
      setSubmitting(true);
      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update({
            name: formData.name.trim(),
            description: formData.description.trim(),
            image_url: formData.image_url,
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCategory.id);
        if (error) {
          console.error('Error updating category:', error);
          return;
        }
      } else {
        const { error } = await supabase
          .from('categories')
          .insert({
            name: formData.name.trim(),
            description: formData.description.trim(),
            image_url: formData.image_url,
            is_active: formData.is_active,
          });
        if (error) {
          console.error('Error creating category:', error);
          return;
        }
      }
      setModalVisible(false);
      fetchCategories();
    } catch (error) {
      console.error('Error submitting category:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCategoryStatus = async (category: Category) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update({
          is_active: !category.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', category.id);
      if (error) {
        console.error('Error updating category status:', error);
        return;
      }
      fetchCategories();
    } catch (error) {
      console.error('Error updating category status:', error);
    }
  };

  const handleCategoryClick = (category: Category) => {
            if (typeof window !== 'undefined') {
          window.location.href = `/admin/CategoryProducts/${category.id}`;
        }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
        <button
          className="flex items-center gap-2 py-2 px-4 bg-[#F53F7A] text-white rounded-lg hover:bg-[#F53F7A]/90 transition-colors  cursor-pointer"
          onClick={handleAddCategory}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Category
        </button>
      </div>
      {/* Category List */}
      <div className="bg-white space-y-3 overflow-hidden">
        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading...</div>
        ) : categories.length === 0 ? (
          <div className="text-center py-10 text-gray-400">No categories found.</div>
        ) : (
          categories.map((cat) => (
            <div
              key={cat.id}
              className="bg-white shadow rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleCategoryClick(cat)}
            >
              {cat.image_url && (
                <img
                  src={cat.image_url}
                  alt={cat.name}
                  className="w-16 h-16 object-cover rounded-lg border"
                />
              )}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800">
                  {cat.name}
                </h3>
                <p className="text-sm text-gray-600">{cat.description}</p>
                <span className={`inline-block mt-2 px-3 py-1 text-xs rounded-full font-semibold ${cat.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{cat.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="flex gap-3 items-center" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => toggleCategoryStatus(cat)}
                  className={`flex items-center gap-1.5 font-medium px-2 py-1 rounded-md transition-colors ${
                    cat.is_active
                      ? "text-orange-600 hover:text-orange-800 hover:bg-orange-50"
                      : "text-green-600 hover:text-green-800 hover:bg-green-50"
                  }`}
                  title={cat.is_active ? 'Deactivate' : 'Activate'}
                >
                  {cat.is_active ? (
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
                  onClick={() => handleEditCategory(cat)}
                  className="flex items-center gap-1.5 text-[#F53F7A] hover:text-[#F53F7A]/80 font-medium px-2 py-1 rounded-md hover:bg-[#F53F7A]/10 transition-colors"
                  title="Edit"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteCategory(cat)}
                  className="flex items-center gap-1.5 text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded-md hover:bg-red-50 transition-colors"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      {/* Modal */}
      {modalVisible && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#F53F7A] to-[#F53F7A]/90 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">
                  {editingCategory ? 'Edit Category' : 'Add Category'}
                </h2>
                <button
                  onClick={() => setModalVisible(false)}
                  className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/20 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Category Image
                  </label>
                  <div className="relative">
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-6 bg-gray-50 hover:border-[#F53F7A] hover:bg-gray-100 transition-all duration-200 cursor-pointer group">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImagePicker}
                        className="hidden"
                        id="imageUpload"
                      />
                      <label
                        htmlFor="imageUpload"
                        className="flex flex-col items-center gap-2 cursor-pointer"
                      >
                        {(formData.image_url || imageFile) ? (
                          <div className="relative">
                            <img
                              src={formData.image_url || (imageFile ? URL.createObjectURL(imageFile) : '')}
                              alt="Preview"
                              className="w-24 h-24 object-cover rounded-lg border-2 border-white shadow-lg"
                            />
                            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="w-16 h-16 bg-[#F53F7A]/10 rounded-full flex items-center justify-center group-hover:bg-[#F53F7A]/20 transition-colors">
                              <svg className="w-8 h-8 text-[#F53F7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <span className="text-sm text-gray-600 group-hover:text-[#F53F7A] transition-colors">
                              Click to upload image
                            </span>
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                </div>

                {/* Category Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter category name"
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F53F7A] focus:border-[#F53F7A] outline-none transition-all duration-200"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter category description"
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F53F7A] focus:border-[#F53F7A] outline-none transition-all duration-200 resize-none"
                  />
                </div>

                {/* Active Status */}
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-5 w-5 text-[#F53F7A] border-gray-300 rounded focus:ring-[#F53F7A]"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      {formData.is_active ? "Active Category" : "Inactive Category"}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.is_active ? "This category will be visible to users" : "This category will be hidden from users"}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setModalVisible(false)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#F53F7A] hover:bg-[#F53F7A]/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {editingCategory ? 'Update' : 'Create'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
