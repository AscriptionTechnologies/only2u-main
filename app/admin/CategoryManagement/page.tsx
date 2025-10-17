"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- Types ---
type Category = {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  is_active: boolean;
  display_order?: number;
};

type Product = {
  id: string;
  name: string;
  description: string;
  category_id: string;
  featured_type?: "trending" | "best_seller" | null;
  is_active: boolean;
  created_at: string;
  display_order_within_feature?: number;
  category?: {
    name: string;
  } | { name: string }[] | null;
};

type FeatureSection = {
  id: string;
  section_type: string;
  display_order: number;
  is_active: boolean;
  title: string;
  description?: string;
  icon?: string;
};

export default function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [featureSections, setFeatureSections] = useState<FeatureSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingSections, setLoadingSections] = useState(false);
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
  
  // Featured products view state
  const [viewMode, setViewMode] = useState<'categories' | 'featured' | 'section-order'>('categories');
  const [featureFilter, setFeatureFilter] = useState<'all' | 'trending' | 'best_seller'>('all');

  useEffect(() => {
    fetchCategories();
    fetchFeatureSections();
  }, []);

  useEffect(() => {
    if (viewMode === 'featured') {
      fetchFeaturedProducts();
    }
  }, [viewMode, featureFilter]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true, nullsFirst: false })
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

  const fetchFeaturedProducts = async () => {
    try {
      setLoadingProducts(true);
      let query = supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          category_id,
          featured_type,
          is_active,
          created_at,
          display_order_within_feature,
          category:categories(name)
        `)
        .order('display_order_within_feature', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (featureFilter === 'trending') {
        query = query.eq('featured_type', 'trending');
      } else if (featureFilter === 'best_seller') {
        query = query.eq('featured_type', 'best_seller');
      } else {
        // Show all featured products (both trending and best_seller)
        query = query.in('featured_type', ['trending', 'best_seller']);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching featured products:', error);
        return;
      }
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching featured products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const updateProductFeatureType = async (
    productId: string,
    newFeatureType: "trending" | "best_seller" | null
  ) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({
          featured_type: newFeatureType,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId);

      if (error) {
        console.error('Error updating product feature type:', error);
        return;
      }

      // Refresh products list
      fetchFeaturedProducts();
    } catch (error) {
      console.error('Error updating product feature type:', error);
    }
  };

  const handleEditProduct = (productId: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = `/admin/ProductForm?edit=${productId}`;
    }
  };

  const fetchFeatureSections = async () => {
    try {
      setLoadingSections(true);
      const { data, error } = await supabase
        .from('feature_sections')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error fetching feature sections:', error);
        return;
      }
      setFeatureSections(data || []);
    } catch (error) {
      console.error('Error fetching feature sections:', error);
    } finally {
      setLoadingSections(false);
    }
  };

  const toggleSectionVisibility = async (sectionId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('feature_sections')
        .update({ is_active: !currentStatus })
        .eq('id', sectionId);

      if (error) {
        console.error('Error updating section status:', error);
        return;
      }

      fetchFeatureSections();
    } catch (error) {
      console.error('Error updating section status:', error);
    }
  };

  // Drag and Drop handlers for categories
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex((cat) => cat.id === active.id);
      const newIndex = categories.findIndex((cat) => cat.id === over.id);

      const newCategories = arrayMove(categories, oldIndex, newIndex);
      setCategories(newCategories);

      // Update the order in the database
      try {
        const response = await fetch('/api/categories/reorder', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ categories: newCategories }),
        });

        if (!response.ok) {
          console.error('Failed to update category order');
          // Revert the order if the API call fails
          fetchCategories();
        }
      } catch (error) {
        console.error('Error updating category order:', error);
        // Revert the order if the API call fails
        fetchCategories();
      }
    }
  };

  // Drag and Drop handlers for feature sections
  const handleSectionDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = featureSections.findIndex((s) => s.id === active.id);
      const newIndex = featureSections.findIndex((s) => s.id === over.id);

      const newSections = arrayMove(featureSections, oldIndex, newIndex);
      setFeatureSections(newSections);

      // Update the order in the database
      try {
        const response = await fetch('/api/feature-sections/reorder', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sections: newSections }),
        });

        if (!response.ok) {
          console.error('Failed to update section order');
          // Revert the order if the API call fails
          fetchFeatureSections();
        }
      } catch (error) {
        console.error('Error updating section order:', error);
        // Revert the order if the API call fails
        fetchFeatureSections();
      }
    }
  };

  // Drag and Drop handlers for featured products
  const handleProductDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = products.findIndex((p) => p.id === active.id);
      const newIndex = products.findIndex((p) => p.id === over.id);

      const newProducts = arrayMove(products, oldIndex, newIndex);
      setProducts(newProducts);

      // Update display_order_within_feature in the database for all affected products
      try {
        const updates = newProducts.map((product, index) => ({
          id: product.id,
          display_order_within_feature: index,
        }));

        const { error } = await supabase
          .from('products')
          .upsert(
            updates.map((u) => ({
              id: u.id,
              display_order_within_feature: u.display_order_within_feature,
              updated_at: new Date().toISOString(),
            }))
          );

        if (error) {
          console.error('Failed to update product order:', error);
          // Revert the order if the update fails
          fetchFeaturedProducts();
        }
      } catch (error) {
        console.error('Error updating product order:', error);
        // Revert the order if the API call fails
        fetchFeaturedProducts();
      }
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
        {viewMode === 'categories' && (
          <button
            className="flex items-center gap-2 py-2 px-4 bg-[#F53F7A] text-white rounded-lg hover:bg-[#F53F7A]/90 transition-colors cursor-pointer"
            onClick={handleAddCategory}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Category
          </button>
        )}
      </div>

      {/* View Mode Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setViewMode('categories')}
              className={`${
                viewMode === 'categories'
                  ? 'border-[#F53F7A] text-[#F53F7A]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Categories
              {categories.length > 0 && (
                <span className="bg-gray-100 text-gray-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {categories.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setViewMode('section-order')}
              className={`${
                viewMode === 'section-order'
                  ? 'border-[#F53F7A] text-[#F53F7A]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              Home Screen Order
            </button>
            <button
              onClick={() => setViewMode('featured')}
              className={`${
                viewMode === 'featured'
                  ? 'border-[#F53F7A] text-[#F53F7A]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              Featured Products
            </button>
          </nav>
        </div>
      </div>
      {/* Home Screen Section Order View */}
      {viewMode === 'section-order' && (
        <div>
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Mobile App Home Screen Order</h3>
                <p className="text-sm text-gray-700 mb-3">
                  Drag and drop the sections below to control the order they appear on the mobile app home screen. 
                  The first section will appear at the top, followed by the others in order.
                </p>
                <div className="bg-white rounded-lg p-3 border border-purple-200">
                  <p className="text-xs font-semibold text-purple-900 mb-1">Current Order Preview:</p>
                  <p className="text-xs text-gray-600">
                    {featureSections.filter(s => s.is_active).map((s, i) => 
                      `${i + 1}. ${s.title}`
                    ).join(' → ')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#F53F7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              Drag to Reorder Home Screen Sections
            </h3>
            
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleSectionDragEnd}
            >
              <SortableContext
                items={featureSections.map(s => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {loadingSections ? (
                  <div className="text-center py-10 text-gray-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F53F7A] mx-auto mb-2"></div>
                    Loading sections...
                  </div>
                ) : (
                  <div className="space-y-3">
                    {featureSections.map((section) => (
                      <SortableFeatureSectionCard
                        key={section.id}
                        section={section}
                        onToggleVisibility={toggleSectionVisibility}
                      />
                    ))}
                  </div>
                )}
              </SortableContext>
            </DndContext>
          </div>
        </div>
      )}

      {/* Categories View */}
      {viewMode === 'categories' && (
        <div className="bg-white space-y-3 overflow-hidden">
        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading...</div>
        ) : categories.length === 0 ? (
          <div className="text-center py-10 text-gray-400">No categories found.</div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={categories.map(cat => cat.id)}
              strategy={verticalListSortingStrategy}
            >
              {categories.map((cat) => (
                <SortableCategoryCard
                  key={cat.id}
                  category={cat}
                  onCategoryClick={handleCategoryClick}
                  onToggleStatus={toggleCategoryStatus}
                  onEdit={handleEditCategory}
                  onDelete={handleDeleteCategory}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
        </div>
      )}

      {/* Featured Products View */}
      {viewMode === 'featured' && (
        <div>
          {/* Feature Type Filter */}
          <div className="mb-4">
            <div className="flex gap-3">
              <button
                onClick={() => setFeatureFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  featureFilter === 'all'
                    ? 'bg-[#F53F7A] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Featured ({products.length})
              </button>
              <button
                onClick={() => setFeatureFilter('trending')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  featureFilter === 'trending'
                    ? 'bg-[#F53F7A] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Trending Now
              </button>
              <button
                onClick={() => setFeatureFilter('best_seller')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  featureFilter === 'best_seller'
                    ? 'bg-[#F53F7A] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                Best Sellers
              </button>
            </div>
          </div>

          {/* Featured Products Table */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
                <p className="text-sm text-blue-800 font-medium">
                  Drag products to reorder them. This order will be reflected in the mobile app.
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleProductDragEnd}
              >
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Feature Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loadingProducts ? (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-gray-400">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F53F7A] mx-auto mb-2"></div>
                          Loading products...
                        </td>
                      </tr>
                    ) : products.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-gray-400">
                          No featured products found.
                        </td>
                      </tr>
                    ) : (
                      <SortableContext
                        items={products.map(p => p.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {products.map((product) => (
                          <SortableProductRow
                            key={product.id}
                            product={product}
                            onUpdateFeatureType={updateProductFeatureType}
                            onEditProduct={handleEditProduct}
                          />
                        ))}
                      </SortableContext>
                    )}
                  </tbody>
                </table>
              </DndContext>
            </div>
          </div>
        </div>
      )}
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

// Sortable Feature Section Card Component
type SortableFeatureSectionCardProps = {
  section: FeatureSection;
  onToggleVisibility: (sectionId: string, currentStatus: boolean) => void;
};

function SortableFeatureSectionCard({
  section,
  onToggleVisibility,
}: SortableFeatureSectionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getSectionColor = (sectionType: string) => {
    switch (sectionType) {
      case 'best_seller':
        return 'bg-purple-100 border-purple-300 text-purple-800';
      case 'trending':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'categories':
        return 'bg-green-100 border-green-300 text-green-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border-2 rounded-xl p-5 flex items-center gap-4 hover:shadow-md transition-all ${getSectionColor(section.section_type)}`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing hover:scale-110 transition-transform flex-shrink-0"
        title="Drag to reorder"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>

      {/* Section Icon */}
      <div className="flex-shrink-0 text-4xl">
        {section.icon || '📱'}
      </div>

      {/* Section Info */}
      <div className="flex-1">
        <h4 className="text-lg font-bold mb-1">{section.title}</h4>
        <p className="text-sm opacity-80">
          {section.section_type === 'best_seller' && 'Products marked as Best Sellers'}
          {section.section_type === 'trending' && 'Products marked as Trending Now'}
          {section.section_type === 'categories' && 'All product categories'}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs font-semibold px-2 py-1 bg-white/50 rounded">
            Position: #{section.display_order + 1}
          </span>
          <span className={`text-xs font-semibold px-2 py-1 rounded ${
            section.is_active ? 'bg-green-600 text-white' : 'bg-gray-400 text-white'
          }`}>
            {section.is_active ? 'Active' : 'Hidden'}
          </span>
        </div>
      </div>

      {/* Toggle Visibility */}
      <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onToggleVisibility(section.id, section.is_active)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            section.is_active
              ? 'bg-orange-500 text-white hover:bg-orange-600'
              : 'bg-green-500 text-white hover:bg-green-600'
          }`}
        >
          {section.is_active ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
              Hide
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Show
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Sortable Category Card Component
type SortableCategoryCardProps = {
  category: Category;
  onCategoryClick: (category: Category) => void;
  onToggleStatus: (category: Category) => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
};

function SortableCategoryCard({
  category,
  onCategoryClick,
  onToggleStatus,
  onEdit,
  onDelete,
}: SortableCategoryCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white shadow rounded-xl p-4 flex items-center gap-4 hover:shadow-lg transition-shadow"
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
        title="Drag to reorder"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>

      {/* Category Content */}
      <div 
        className="flex items-center gap-4 flex-1 cursor-pointer"
        onClick={() => onCategoryClick(category)}
      >
        {category.image_url && (
          <img
            src={category.image_url}
            alt={category.name}
            className="w-16 h-16 object-cover rounded-lg border"
          />
        )}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-800">
            {category.name}
          </h3>
          <p className="text-sm text-gray-600">{category.description}</p>
          <span className={`inline-block mt-2 px-3 py-1 text-xs rounded-full font-semibold ${category.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {category.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 items-center" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onToggleStatus(category)}
          className={`flex items-center gap-1.5 font-medium px-2 py-1 rounded-md transition-colors ${
            category.is_active
              ? "text-orange-600 hover:text-orange-800 hover:bg-orange-50"
              : "text-green-600 hover:text-green-800 hover:bg-green-50"
          }`}
          title={category.is_active ? 'Deactivate' : 'Activate'}
        >
          {category.is_active ? (
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
          onClick={() => onEdit(category)}
          className="flex items-center gap-1.5 text-[#F53F7A] hover:text-[#F53F7A]/80 font-medium px-2 py-1 rounded-md hover:bg-[#F53F7A]/10 transition-colors"
          title="Edit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit
        </button>
        <button
          onClick={() => onDelete(category)}
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
  );
}

// Sortable Product Row Component
type SortableProductRowProps = {
  product: Product;
  onUpdateFeatureType: (productId: string, featureType: "trending" | "best_seller" | null) => void;
  onEditProduct: (productId: string) => void;
};

function SortableProductRow({
  product,
  onUpdateFeatureType,
  onEditProduct,
}: SortableProductRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Helper to get category name
  const getCategoryName = () => {
    if (!product.category) return 'N/A';
    if (Array.isArray(product.category)) {
      return product.category[0]?.name || 'N/A';
    }
    return product.category.name || 'N/A';
  };

  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-gray-50">
      {/* Drag Handle */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 transition-colors"
          title="Drag to reorder"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </div>
      </td>

      {/* Product Name */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">{product.name}</div>
      </td>

      {/* Category */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-500">{getCategoryName()}</div>
      </td>

      {/* Feature Type */}
      <td className="px-6 py-4 whitespace-nowrap">
        <select
          value={product.featured_type || ''}
          onChange={(e) => {
            const value = e.target.value;
            onUpdateFeatureType(
              product.id,
              value === '' ? null : value as "trending" | "best_seller"
            );
          }}
          className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#F53F7A] focus:border-transparent"
        >
          <option value="">None</option>
          <option value="trending">Trending</option>
          <option value="best_seller">Best Seller</option>
        </select>
      </td>

      {/* Status */}
      <td className="px-6 py-4 whitespace-nowrap">
        <span
          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            product.is_active
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {product.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>

      {/* Actions */}
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <button
          onClick={() => onEditProduct(product.id)}
          className="text-[#F53F7A] hover:text-[#F53F7A]/80 font-medium transition-colors"
        >
          Edit
        </button>
      </td>
    </tr>
  );
}
