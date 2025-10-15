"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { uploadFile } from "../../../lib/uploadUtils";

// --- Types ---
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

type Category = {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  is_active: boolean;
};

type Color = {
  id: string;
  name: string;
  hex_code: string;
};

type Size = {
  id: string;
  name: string;
  category_id: string;
};

type Variant = {
  id?: string;
  product_id?: string;
  color_id?: string | null;
  size_id: string;
  quantity: number;
  created_at?: string;
  updated_at?: string;
  price: number;
  sku: string;
  mrp_price: number;
  rsp_price: number;
  cost_price: number;
  discount_percentage: number;
  image_urls: string[];
  video_urls: string[];
};

type Review = {
  id?: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  date: string;
  is_verified: boolean;
  profile_image_url?: string;
};

function ProductFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get("edit");
  const categoryId = searchParams.get("category");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingVideos, setUploadingVideos] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  
  // Enhanced media management with size assignments
  type MediaWithSizes = {
    url: string;
    assignedSizes: string[]; // Array of size IDs
  };
  const [mediaLibrary, setMediaLibrary] = useState<{
    images: MediaWithSizes[];
    videos: MediaWithSizes[];
  }>({ images: [], videos: [] });
  
  // Modal state for size selection
  const [showSizeSelectionModal, setShowSizeSelectionModal] = useState(false);
  const [pendingMediaUrls, setPendingMediaUrls] = useState<string[]>([]);
  const [pendingMediaType, setPendingMediaType] = useState<'image' | 'video'>('image');
  const [selectedSizesForMedia, setSelectedSizesForMedia] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category_id: "",
    return_policy: "",
    vendor_name: "",
    alias_vendor: "",
    is_active: true,
    featured_type: null as "trending" | "best_seller" | null,
  });

  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [variantImageUrls, setVariantImageUrls] = useState<{
    [key: string]: string;
  }>({});
  const [variantVideoUrls, setVariantVideoUrls] = useState<{
    [key: string]: string;
  }>({});
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showReviewsSection, setShowReviewsSection] = useState(false);
  const [uploadingReviewImages, setUploadingReviewImages] = useState(false);
  const [showAddColorModal, setShowAddColorModal] = useState(false);
  const [newColor, setNewColor] = useState({ name: "", hex_code: "#000000" });
  const [addingColor, setAddingColor] = useState(false);

  // File input refs
  const videoInputRef = useRef<HTMLInputElement>(null);
  const sharedImageInputRef = useRef<HTMLInputElement>(null);
  const sharedVideoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchInitialData();
  }, [productId, categoryId]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      console.log(
        "Fetching initial data with productId:",
        productId,
        "categoryId:",
        categoryId
      );

      await Promise.all([
        fetchCategories(),
        fetchColors(),
        fetchSizes(),
        productId ? fetchProduct() : Promise.resolve(),
      ]);

      // Set default category if provided in URL
      if (categoryId && !productId) {
        setFormData((prev) => ({ ...prev, category_id: categoryId }));
      }
    } catch (error) {
      console.error("Error fetching initial data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, description, image_url, is_active")
        .eq("is_active", true)
        .order("name");
      if (error) {
        console.error("Error fetching categories:", error);
        return;
      }
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchColors = async () => {
    try {
      const { data, error } = await supabase
        .from("colors")
        .select("id, name, hex_code");
      if (error) {
        console.error("Error fetching colors:", error);
        return;
      }
      setColors(data || []);
    } catch (error) {
      console.error("Error fetching colors:", error);
    }
  };

  const fetchSizes = async () => {
    try {
      const { data, error } = await supabase
        .from("sizes")
        .select("id, name, category_id");
      if (error) {
        console.error("Error fetching sizes:", error);
        return;
      }
      setSizes(data || []);
    } catch (error) {
      console.error("Error fetching sizes:", error);
    }
  };

  const fetchProduct = async () => {
    if (!productId) {
      console.log("No productId provided for fetchProduct");
      return;
    }

    try {
      console.log("Fetching product with ID:", productId);
      const { data, error } = await supabase
        .from("products")
        .select(
          `
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
          ),
          reviews:product_reviews(
            id,
            reviewer_name,
            rating,
            comment,
            date,
            is_verified,
            profile_image_url
          )
        `
        )
        .eq("id", productId)
        .single();

      if (error) {
        console.log("Error fetching product:", error);
        console.error("Error fetching product:", error);
        return;
      }

      const product = data;
      console.log("Product data fetched:", product);
      const newFormData = {
        name: product.name,
        description: product.description,
        category_id: product.category_id,
        return_policy: product.return_policy || "",
        vendor_name: product.vendor_name || "",
        alias_vendor: product.alias_vendor || "",
        is_active: product.is_active,
        featured_type:
          (product.featured_type as "trending" | "best_seller" | null) || null,
      };
      console.log("Setting form data:", newFormData);
      setFormData(newFormData);

      if (product.variants && product.variants.length > 0) {
        console.log("Product variants found:", product.variants);
        const existingColors = [
          ...new Set(product.variants.map((v: any) => v.color_id).filter((id): id is string => Boolean(id))),
        ];
        const existingSizes = [
          ...new Set(product.variants.map((v: any) => v.size_id)),
        ] as string[];
        const variantsData = product.variants.map((variant: any) => ({
          id: variant.id,
          color_id: variant.color_id,
          size_id: variant.size_id,
          quantity: variant.quantity || 0,
          price: variant.price || 0,
          sku: variant.sku || "",
          mrp_price: variant.mrp_price || 0,
          rsp_price: variant.rsp_price || 0,
          cost_price: variant.cost_price || 0,
          discount_percentage: variant.discount_percentage || 0,
          image_urls: variant.image_urls || [],
          video_urls: variant.video_urls || [],
          created_at: variant.created_at || new Date().toISOString(),
          updated_at: variant.updated_at || new Date().toISOString(),
        }));
        console.log("Setting variants data:", variantsData);
        console.log("Setting selected colors:", existingColors);
        console.log("Setting selected sizes:", existingSizes);
        setSelectedColors(existingColors);
        setSelectedSizes(existingSizes);
        setVariants(variantsData);
      } else {
        console.log("No variants found for product");
      }

      // Set reviews if they exist
      if (product.reviews && product.reviews.length > 0) {
        console.log("Product reviews found:", product.reviews);
        setReviews(product.reviews);
        setShowReviewsSection(true);
      } else {
        console.log("No reviews found for product");
      }
    } catch (error) {
      console.log("Error fetching product:", error);
      console.error("Error fetching product:", error);
    }
  };

  const calculateDiscountPercentage = (mrp: number, rsp: number): number => {
    if (mrp && rsp && rsp <= mrp && mrp > 0) {
      return Math.round(((mrp - rsp) / mrp) * 100);
    }
    return 0;
  };



  // Generic URL cleaning and conversion function for images
  const cleanAndConvertUrl = (url: string): string => {
    if (!url || !url.trim()) return url;
    
    // Clean the URL: remove extra spaces, newlines, etc.
    let cleanedUrl = url.trim().replace(/\s+/g, '');
    
    // Check if it's a Google Drive sharing URL
    const driveMatch = cleanedUrl.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
    if (driveMatch) {
      const fileId = driveMatch[1];
      // Use the more reliable thumbnail format for images
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`;
    }
    
    // Check if it's already a direct Google Drive URL
    if (cleanedUrl.includes('drive.google.com/uc?export=view') || cleanedUrl.includes('drive.google.com/thumbnail')) {
      return cleanedUrl;
    }
    
    // For any other URL, just return the cleaned version
    return cleanedUrl;
  };

  // Video URL cleaning and conversion function
  const cleanAndConvertVideoUrl = (url: string): string => {
    if (!url || !url.trim()) return url;
    
    // Clean the URL: remove extra spaces, newlines, etc.
    let cleanedUrl = url.trim().replace(/\s+/g, '');
    
    // Check if it's a Google Drive sharing URL for video
    const driveMatch = cleanedUrl.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
    if (driveMatch) {
      const fileId = driveMatch[1];
      // Convert to direct video URL for Google Drive
      return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
    
    // Check if it's already a direct Google Drive video URL
    if (cleanedUrl.includes('drive.google.com/uc?export=view')) {
      return cleanedUrl;
    }
    
    // For any other URL, just return the cleaned version
    return cleanedUrl;
  };

  // Legacy function for backward compatibility
  const convertGoogleDriveUrl = (url: string): string => {
    return cleanAndConvertUrl(url);
  };



  const addVariantImageUrl = (colorId: string | null | undefined, sizeId: string) => {
    const key = `${colorId}-${sizeId}`;
    const imageUrl = variantImageUrls[key];
    
    if (imageUrl && imageUrl.trim()) {
      // Clean and convert URL if needed
      const convertedUrl = cleanAndConvertUrl(imageUrl.trim());
      
      console.log('Image URL Processing:');
      console.log('Original URL:', imageUrl.trim());
      console.log('Converted URL:', convertedUrl);
      
      // Test if the image loads successfully
      const testImage = new Image();
      let imageLoaded = false;
      
      // Set a timeout to prevent brief appearance
      const timeoutId = setTimeout(() => {
        if (!imageLoaded) {
          console.log('⏰ Image load timeout - removing URL');
          setVariants((prev) => {
            const updatedVariants = prev.map((variant) =>
              variant.color_id === colorId && variant.size_id === sizeId
                ? {
                    ...variant,
                    image_urls: variant.image_urls.slice(0, -1), // Remove the last added URL
                  }
                : variant
            );
            return updatedVariants;
          });
        }
      }, 3000); // 3 second timeout
      
      testImage.onload = () => {
        // Image loaded successfully, keep the converted URL
        imageLoaded = true;
        clearTimeout(timeoutId);
        console.log('✅ Image loaded successfully with URL:', convertedUrl);
      };
      testImage.onerror = () => {
        // Try alternative Google Drive URL formats
        const driveMatch = imageUrl.trim().replace(/\s+/g, '').match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
        if (driveMatch) {
          const fileId = driveMatch[1];
          const alternativeUrls = [
            `https://drive.google.com/uc?export=view&id=${fileId}`,
            `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`,
            `https://drive.google.com/thumbnail?id=${fileId}&sz=w600`,
            `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`
          ];
          
          let currentIndex = 0;
          
          const tryNextUrl = () => {
            if (currentIndex >= alternativeUrls.length) {
              // All alternatives failed, show error message
              console.log('❌ All Google Drive URL formats failed. The image may require authentication or be private.');
              alert('⚠️ Google Drive Image Error: The image appears to be private or requires authentication. Please make sure the image is set to "Anyone with the link can view" in Google Drive sharing settings.');
              
              // Remove the failed URL from variants
              setVariants((prev) => {
                const updatedVariants = prev.map((variant) =>
                  variant.color_id === colorId && variant.size_id === sizeId
                    ? {
                        ...variant,
                        image_urls: variant.image_urls.slice(0, -1), // Remove the last added URL
                      }
                    : variant
                );
                return updatedVariants;
              });
              return;
            }
            
            const altTestImage = new Image();
            altTestImage.onload = () => {
              // Update with working alternative URL
              console.log('✅ Alternative URL worked:', alternativeUrls[currentIndex]);
              setVariants((prev) => {
                const updatedVariants = prev.map((variant) =>
                  variant.color_id === colorId && variant.size_id === sizeId
                    ? {
                        ...variant,
                        image_urls: [...variant.image_urls.slice(0, -1), alternativeUrls[currentIndex]],
                      }
                    : variant
                );
                return updatedVariants;
              });
            };
            altTestImage.onerror = () => {
              console.log(`❌ Failed to load: ${alternativeUrls[currentIndex]}`);
              currentIndex++;
              tryNextUrl();
            };
            altTestImage.src = alternativeUrls[currentIndex];
          };
          
          tryNextUrl();
        } else {
          // Not a Google Drive URL, show generic error
          console.log('❌ Image failed to load. Please check if the URL is correct and the image is publicly accessible.');
          alert('⚠️ Image Error: The image failed to load. Please check if the URL is correct and the image is publicly accessible.');
          
          // Remove the failed URL from variants
          setVariants((prev) => {
            const updatedVariants = prev.map((variant) =>
              variant.color_id === colorId && variant.size_id === sizeId
                ? {
                    ...variant,
                    image_urls: variant.image_urls.slice(0, -1), // Remove the last added URL
                  }
                : variant
            );
            return updatedVariants;
          });
        }
      };
      testImage.src = convertedUrl;
      
      setVariants((prev) => {
        const updatedVariants = prev.map((variant) =>
          variant.color_id === colorId && variant.size_id === sizeId
            ? {
                ...variant,
                image_urls: [...variant.image_urls, convertedUrl],
              }
            : variant
        );
        return updatedVariants;
      });
      // Clear the input
      setVariantImageUrls((prev) => ({ ...prev, [key]: "" }));
    }
  };

  const handleColorSelection = (colorId: string) => {
    const newSelectedColors = selectedColors.includes(colorId)
      ? selectedColors.filter((id: string) => id !== colorId)
      : [...selectedColors, colorId];
    console.log("Color selection changed:", {
      previous: selectedColors,
      new: newSelectedColors,
      added: !selectedColors.includes(colorId),
    });
    setSelectedColors(newSelectedColors);
  };

  const handleSizeSelection = (sizeId: string) => {
    const newSelectedSizes = selectedSizes.includes(sizeId)
      ? selectedSizes.filter((id: string) => id !== sizeId)
      : [...selectedSizes, sizeId];
    console.log("Size selection changed:", {
      previous: selectedSizes,
      new: newSelectedSizes,
      added: !selectedSizes.includes(sizeId),
    });
    setSelectedSizes(newSelectedSizes);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.category_id) {
      alert("Please fill all required fields");
      return;
    }

    if (selectedSizes.length === 0) {
      alert("Select at least one size");
      return;
    }

    if (variants.length === 0) {
      alert("Please configure at least one variant");
      return;
    }



    try {
      setSubmitting(true);
      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        category_id: formData.category_id,
        return_policy: formData.return_policy,
        vendor_name: formData.vendor_name,
        alias_vendor: formData.alias_vendor,
        is_active: formData.is_active,
        featured_type: formData.featured_type,
        like_count: 0, // Default value for new products
        updated_at: new Date().toISOString(),
      };

      let newProductId: string;
      if (productId) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", productId);
        if (error) {
          console.error("Error updating product:", error);
          return;
        }
        newProductId = productId;
      } else {
        const { data, error } = await supabase
          .from("products")
          .insert(productData)
          .select("id")
          .single();
        if (error) {
          console.error("Error creating product:", error);
          return;
        }
        newProductId = data.id;
      }

      // Apply shared media to all variants before saving
      if (sharedImageUrls.length > 0 || sharedVideoUrls.length > 0) {
        applySharedMediaToAllVariants();
      }

      // Handle variants
      if (newProductId) {
        console.log("Processing variants for product:", newProductId);
        console.log("Current variants state:", variants);
        
        if (productId) {
          // For existing products, update variants intelligently
          console.log("Editing existing product, fetching current variants...");
          const existingVariants = await supabase
            .from("product_variants")
            .select("id, color_id, size_id")
            .eq("product_id", newProductId);
          
          if (existingVariants.error) {
            console.error("Error fetching existing variants:", existingVariants.error);
            return;
          }

          // Create a map of existing variants for quick lookup
          const existingVariantsMap = new Map();
          existingVariants.data?.forEach(variant => {
            const key = `${variant.color_id || 'null'}-${variant.size_id}`;
            existingVariantsMap.set(key, variant.id);
          });
          
          console.log("Existing variants in database:", existingVariants.data);
          console.log("Existing variants map:", Object.fromEntries(existingVariantsMap));

          // Process each variant
          for (const variant of variants) {
            const key = `${variant.color_id || 'null'}-${variant.size_id}`;
            const existingVariantId = existingVariantsMap.get(key);
            
            console.log(`Processing variant: ${key}, existing ID: ${existingVariantId}`);
            
            const variantData = {
              product_id: newProductId,
              color_id: variant.color_id || null,
              size_id: variant.size_id,
              quantity: variant.quantity,
              price: Math.round(variant.price),
              sku: variant.sku,
              mrp_price: Math.round(variant.mrp_price),
              rsp_price: Math.round(variant.rsp_price),
              cost_price: Math.round(variant.cost_price),
              discount_percentage: Math.round(variant.discount_percentage),
              image_urls: variant.image_urls,
              video_urls: variant.video_urls,
              updated_at: new Date().toISOString(),
            };

            if (existingVariantId) {
              // Update existing variant
              console.log(`Updating existing variant with ID: ${existingVariantId}`);
              const { error: updateError } = await supabase
                .from("product_variants")
                .update(variantData)
                .eq("id", existingVariantId);
              
              if (updateError) {
                console.error("Error updating variant:", updateError);
              } else {
                console.log(`Successfully updated variant: ${existingVariantId}`);
              }
            } else {
              // Insert new variant
              console.log(`Inserting new variant: ${key}`);
              const { error: insertError } = await supabase
                .from("product_variants")
                .insert({
                  ...variantData,
                  created_at: new Date().toISOString(),
                });
              
              if (insertError) {
                console.error("Error inserting variant:", insertError);
              } else {
                console.log(`Successfully inserted new variant: ${key}`);
              }
            }
          }

          // Delete variants that no longer exist
          const currentVariantKeys = new Set(variants.map(v => `${v.color_id || 'null'}-${v.size_id}`));
          const variantsToDelete = existingVariants.data?.filter(v => {
            const key = `${v.color_id || 'null'}-${v.size_id}`;
            return !currentVariantKeys.has(key);
          });

          if (variantsToDelete && variantsToDelete.length > 0) {
            const variantIdsToDelete = variantsToDelete.map(v => v.id);
            const { error: deleteError } = await supabase
              .from("product_variants")
              .delete()
              .in("id", variantIdsToDelete);
            
            if (deleteError) {
              console.error("Error deleting old variants:", deleteError);
            }
          }
        } else {
          // For new products, insert all variants
          const variantData = variants.map((variant) => ({
            product_id: newProductId,
            color_id: variant.color_id || null,
            size_id: variant.size_id,
            quantity: variant.quantity,
            price: Math.round(variant.price),
            sku: variant.sku,
            mrp_price: Math.round(variant.mrp_price),
            rsp_price: Math.round(variant.rsp_price),
            cost_price: Math.round(variant.cost_price),
            discount_percentage: Math.round(variant.discount_percentage),
            image_urls: variant.image_urls,
            video_urls: variant.video_urls,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));

          const { error: variantError } = await supabase
            .from("product_variants")
            .insert(variantData);
          if (variantError) {
            console.log("Error saving variants:", variantError);
            console.error("Error saving variants:", variantError);
          }
        }
      }

      // Handle reviews
      if (newProductId && reviews.length > 0) {
        // Delete existing reviews
        await supabase
          .from("product_reviews")
          .delete()
          .eq("product_id", newProductId);

        // Insert new reviews
        const reviewData = reviews.map((review) => ({
          product_id: newProductId,
          reviewer_name: review.reviewer_name,
          rating: review.rating,
          comment: review.comment,
          date: review.date,
          is_verified: review.is_verified,
          profile_image_url: review.profile_image_url,
        }));

        const { error: reviewError } = await supabase
          .from("product_reviews")
          .insert(reviewData);
        if (reviewError) {
          console.error("Error saving reviews:", reviewError);
        }
      }

      console.log("Product saved successfully!");
      
      // Navigate back to appropriate page
      if (categoryId) {
        router.push(`/admin/CategoryProducts/${categoryId}`);
      } else {
        router.push("/admin/ProductManagement");
      }
    } catch (error) {
      console.log("Error submitting product:", error);
      console.error("Error submitting product:", error);
    } finally {
      setSubmitting(false);
    }
  };

  // Update variants when colors/sizes change
  useEffect(() => {
    if (selectedSizes.length > 0) {
      updateVariants(selectedColors, selectedSizes);
    } else {
      setVariants([]);
    }
  }, [selectedColors, selectedSizes]);

  const updateVariants = (colors: string[], sizes: string[]) => {
    setVariants((prevVariants) => {
      console.log("Updating variants:", {
        colors,
        sizes,
        previousVariantsCount: prevVariants.length,
        previousVariants: prevVariants.map((v) => `${v.color_id}-${v.size_id}`),
      });

      // Create a map of existing variants for quick lookup
      const existingVariantsMap = new Map();
      prevVariants.forEach((variant) => {
        const key = `${variant.color_id || 'null'}-${variant.size_id}`;
        existingVariantsMap.set(key, variant);
        console.log('Mapping variant key:', key, 'for variant:', variant);
      });

      const newVariants: Variant[] = [];

      // If no colors selected, create size-only variants
      if (colors.length === 0) {
        sizes.forEach((sizeId) => {
          const key = `null-${sizeId}`; // Changed from 'no-color-' to 'null-' to match the actual color_id value
          const existingVariant = existingVariantsMap.get(key);

          if (existingVariant) {
            newVariants.push(existingVariant);
          } else {
            newVariants.push({
              color_id: null, // null for size-only variants
              size_id: sizeId,
              quantity: 0,
              price: 0,
              sku: "",
              mrp_price: 0,
              rsp_price: 0,
              cost_price: 0,
              discount_percentage: 0,
              image_urls: [],
              video_urls: [],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        });
      } else {
        // Generate all combinations of selected colors and sizes
        colors.forEach((colorId) => {
          sizes.forEach((sizeId) => {
            const key = `${colorId}-${sizeId}`;
            const existingVariant = existingVariantsMap.get(key);

            if (existingVariant) {
              // Preserve existing variant data
              newVariants.push(existingVariant);
            } else {
              // Create new variant with default values
              newVariants.push({
                color_id: colorId,
                size_id: sizeId,
                quantity: 0,
                price: 0,
                sku: "",
                mrp_price: 0,
                rsp_price: 0,
                cost_price: 0,
                discount_percentage: 0,
                image_urls: [],
                video_urls: [],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });
            }
          });
        });
      }

      console.log("New variants created:", {
        newVariantsCount: newVariants.length,
        newVariants: newVariants.map((v) => `${v.color_id}-${v.size_id}`),
      });

      return newVariants;
    });
  };

  // Apply media to selected sizes only
  const applyMediaToSelectedSizes = () => {
    if (selectedSizesForMedia.length === 0) {
      alert('Please select at least one size');
      return;
    }

    // Add the pending media to the media library with size assignments
    if (pendingMediaType === 'image') {
      setMediaLibrary((prev) => ({
        ...prev,
        images: [
          ...prev.images,
          ...pendingMediaUrls.map(url => ({
            url,
            assignedSizes: [...selectedSizesForMedia],
          }))
        ],
      }));
    } else {
      setMediaLibrary((prev) => ({
        ...prev,
        videos: [
          ...prev.videos,
          ...pendingMediaUrls.map(url => ({
            url,
            assignedSizes: [...selectedSizesForMedia],
          }))
        ],
      }));
    }

    // Add selected sizes to selectedSizes if not already there
    const newSizesToAdd = selectedSizesForMedia.filter(sizeId => !selectedSizes.includes(sizeId));
    if (newSizesToAdd.length > 0) {
      setSelectedSizes(prev => [...prev, ...newSizesToAdd]);
    }

    // Apply media to existing variants with matching sizes, or create new variants
    setVariants((prev) => {
      const updatedVariants = [...prev];
      
      selectedSizesForMedia.forEach(sizeId => {
        // Check if variants exist for this size
        const existingVariants = updatedVariants.filter(v => v.size_id === sizeId);
        
        if (existingVariants.length > 0) {
          // Update existing variants
          existingVariants.forEach(variant => {
            const index = updatedVariants.indexOf(variant);
            if (pendingMediaType === 'image') {
              updatedVariants[index] = {
                ...variant,
                image_urls: Array.from(new Set([...(variant.image_urls || []), ...pendingMediaUrls])),
              };
            } else {
              updatedVariants[index] = {
                ...variant,
                video_urls: Array.from(new Set([...(variant.video_urls || []), ...pendingMediaUrls])),
              };
            }
          });
        } else {
          // Create new variant for this size (no color)
          const newVariant: Variant = {
            color_id: null,
            size_id: sizeId,
            quantity: 0,
            price: 0,
            sku: "",
            mrp_price: 0,
            rsp_price: 0,
            cost_price: 0,
            discount_percentage: 0,
            image_urls: pendingMediaType === 'image' ? [...pendingMediaUrls] : [],
            video_urls: pendingMediaType === 'video' ? [...pendingMediaUrls] : [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          updatedVariants.push(newVariant);
        }
      });
      
      return updatedVariants;
    });

    // Reset and close modal
    setPendingMediaUrls([]);
    setSelectedSizesForMedia([]);
    setShowSizeSelectionModal(false);
  };

  // Remove media from library and variants
  const removeMediaFromLibrary = (mediaUrl: string, mediaType: 'image' | 'video') => {
    if (mediaType === 'image') {
      setMediaLibrary((prev) => ({
        ...prev,
        images: prev.images.filter(m => m.url !== mediaUrl),
      }));
    } else {
      setMediaLibrary((prev) => ({
        ...prev,
        videos: prev.videos.filter(m => m.url !== mediaUrl),
      }));
    }

    // Remove from all variants
    setVariants((prev) =>
      prev.map((variant) => ({
        ...variant,
        image_urls: mediaType === 'image' 
          ? variant.image_urls.filter(url => url !== mediaUrl)
          : variant.image_urls,
        video_urls: mediaType === 'video'
          ? variant.video_urls.filter(url => url !== mediaUrl)
          : variant.video_urls,
      }))
    );
  };

  const handleSharedImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setUploadingImages(true);
    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = await uploadFile(file, "productsimages", "products");
      if (result.error) {
        alert(`Error uploading image: ${result.error}`);
        continue;
      }
      urls.push(result.url);
    }
    setUploadingImages(false);

    if (urls.length > 0) {
      // Show modal to select sizes
      setPendingMediaUrls(urls);
      setPendingMediaType('image');
      setSelectedSizesForMedia([]); // Reset selection
      setShowSizeSelectionModal(true);
    }
    
    // Reset file input
    event.target.value = '';
  };

  const handleSharedVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setUploadingVideos(true);
    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = await uploadFile(file, "productvideos", "productvideos");
      if (result.error) {
        alert(`Error uploading video: ${result.error}`);
        continue;
      }
      urls.push(result.url);
    }
    setUploadingVideos(false);

    if (urls.length > 0) {
      // Show modal to select sizes
      setPendingMediaUrls(urls);
      setPendingMediaType('video');
      setSelectedSizesForMedia([]); // Reset selection
      setShowSizeSelectionModal(true);
    }
    
    // Reset file input
    event.target.value = '';
  };

  const updateVariant = (
    colorId: string | null | undefined,
    sizeId: string,
    field: keyof Variant,
    value: any
  ) => {
    setVariants((prev) =>
      prev.map((variant) =>
        variant.color_id === colorId && variant.size_id === sizeId
          ? { 
              ...variant, 
              [field]: ['price', 'mrp_price', 'rsp_price', 'cost_price', 'discount_percentage'].includes(field) 
                ? Math.round(value) 
                : value 
            }
          : variant
      )
    );
  };

  const handleVariantImageUpload = async (
    colorId: string | null | undefined,
    sizeId: string,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    const newImageUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = await uploadFile(file, "productsimages", "products");

      if (result.error) {
        alert(`Error uploading image: ${result.error}`);
        continue;
      }

      newImageUrls.push(result.url);
    }

    setVariants((prev) =>
      prev.map((variant) =>
        variant.color_id === colorId && variant.size_id === sizeId
          ? { ...variant, image_urls: [...variant.image_urls, ...newImageUrls] }
          : variant
      )
    );
    setUploadingImages(false);
  };

  const removeVariantImage = (
    colorId: string | null | undefined,
    sizeId: string,
    imageIndex: number
  ) => {
    setVariants((prev) =>
      prev.map((variant) =>
        variant.color_id === colorId && variant.size_id === sizeId
          ? {
              ...variant,
              image_urls: variant.image_urls.filter(
                (_, index) => index !== imageIndex
              ),
            }
          : variant
      )
    );
  };

  const handleVariantVideoUpload = async (
    colorId: string | null | undefined,
    sizeId: string,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingVideos(true);
    const newVideoUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = await uploadFile(file, "productvideos", "productvideos");

      if (result.error) {
        alert(`Error uploading video: ${result.error}`);
        continue;
      }

      newVideoUrls.push(result.url);
    }

    setVariants((prev) =>
      prev.map((variant) =>
        variant.color_id === colorId && variant.size_id === sizeId
          ? { ...variant, video_urls: [...variant.video_urls, ...newVideoUrls] }
          : variant
      )
    );
    setUploadingVideos(false);
  };

  const removeVariantVideo = (
    colorId: string | null | undefined,
    sizeId: string,
    videoIndex: number
  ) => {
    setVariants((prev) =>
      prev.map((variant) =>
        variant.color_id === colorId && variant.size_id === sizeId
          ? {
              ...variant,
              video_urls: variant.video_urls.filter(
                (_, index) => index !== videoIndex
              ),
            }
          : variant
      )
    );
  };

  const addVariantVideoUrl = (colorId: string | null | undefined, sizeId: string) => {
    const key = `${colorId}-${sizeId}`;
    const videoUrl = variantVideoUrls[key];
    
    if (videoUrl && videoUrl.trim()) {
      const convertedUrl = cleanAndConvertVideoUrl(videoUrl.trim());
      
      console.log('Video URL Processing:');
      console.log('Original URL:', videoUrl.trim());
      console.log('Converted URL:', convertedUrl);
      
      setVariants((prev) => {
        const updatedVariants = prev.map((variant) =>
          variant.color_id === colorId && variant.size_id === sizeId
            ? {
                ...variant,
                video_urls: [...variant.video_urls, convertedUrl],
              }
            : variant
        );
        return updatedVariants;
      });
      // Clear the input
      setVariantVideoUrls((prev) => ({ ...prev, [key]: "" }));
    }
  };

  const handleAddColor = async () => {
    if (!newColor.name.trim() || !newColor.hex_code) {
      alert("Please fill all fields");
      return;
    }

    try {
      setAddingColor(true);
      const { data, error } = await supabase
        .from("colors")
        .insert({
          name: newColor.name.trim(),
          hex_code: newColor.hex_code,
        })
        .select()
        .single();

      if (error) {
        console.error("Error adding color:", error);
        alert("Error adding color");
        return;
      }

      // Add the new color to the colors list
      setColors((prev) => [...prev, data]);

      // Reset form and close modal
      setNewColor({ name: "", hex_code: "#000000" });
      setShowAddColorModal(false);
    } catch (error) {
      console.error("Error adding color:", error);
      alert("Error adding color");
    } finally {
      setAddingColor(false);
    }
  };

  // Review management functions
  const addReview = () => {
    const newReview: Review = {
      reviewer_name: "",
      rating: 5,
      comment: "",
      date: new Date().toISOString().split("T")[0],
      is_verified: false,
      profile_image_url: "",
    };
    setReviews([...reviews, newReview]);
  };

  const updateReview = (index: number, field: keyof Review, value: any) => {
    // Clean and convert URL if it's a profile image URL
    let finalValue = value;
    if (field === 'profile_image_url') {
      finalValue = cleanAndConvertUrl(value);
    }
    
    setReviews((prev) => {
      const updatedReviews = prev.map((review, i) =>
        i === index ? { ...review, [field]: finalValue } : review
      );
      return updatedReviews;
    });
  };

  const removeReview = (index: number) => {
    setReviews((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleReviewVerification = (index: number) => {
    setReviews((prev) =>
      prev.map((review, i) =>
        i === index ? { ...review, is_verified: !review.is_verified } : review
      )
    );
  };

  const handleReviewImageUpload = async (
    index: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingReviewImages(true);
    const file = files[0];
    const result = await uploadFile(file, "reviewprofiles", "reviews");

    if (result.error) {
      alert(`Error uploading image: ${result.error}`);
      setUploadingReviewImages(false);
      return;
    }

    setReviews((prev) =>
      prev.map((review, i) =>
        i === index ? { ...review, profile_image_url: result.url } : review
      )
    );
    setUploadingReviewImages(false);
  };

  const removeReviewImage = (index: number) => {
    setReviews((prev) =>
      prev.map((review, i) =>
        i === index ? { ...review, profile_image_url: "" } : review
      )
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F53F7A] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back
              </button>
              <h1 className="ml-4 text-xl font-semibold text-gray-900">
                {productId ? "Edit Product" : "Add New Product"}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2 bg-[#F53F7A] text-white rounded-lg hover:bg-[#F53F7A]/90 transition-colors disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <svg
                      className="animate-spin w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {productId ? "Update Product" : "Create Product"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white">
          <div className="p-4">
            <div className="grid grid-cols-1 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Product Media - Upload and assign to specific sizes */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">
                    Product Media Library
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Upload images and videos, then select which sizes should use them. All available sizes will be shown for selection.
                  </p>
                  
                  {/* Upload Buttons */}
                  <div className="flex gap-3 mb-4">
                    <label className="flex items-center gap-2 px-4 py-2 bg-[#F53F7A] text-white rounded-lg hover:bg-[#F53F7A]/90 cursor-pointer transition-colors">
                      <input
                        ref={sharedImageInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleSharedImageUpload}
                        className="hidden"
                      />
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {uploadingImages ? 'Uploading...' : 'Upload Images'}
                    </label>
                    
                    <label className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer transition-colors">
                      <input
                        ref={sharedVideoInputRef}
                        type="file"
                        accept="video/*"
                        multiple
                        onChange={handleSharedVideoUpload}
                        className="hidden"
                      />
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      {uploadingVideos ? 'Uploading...' : 'Upload Videos'}
                    </label>
                  </div>

                  {/* Media Library Display */}
                  {(mediaLibrary.images.length > 0 || mediaLibrary.videos.length > 0) && (
                    <div className="space-y-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
                      {/* Images Section */}
                      {mediaLibrary.images.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Images in Library</h4>
                          <div className="space-y-2">
                            {mediaLibrary.images.map((media, idx) => (
                              <div key={idx} className="flex items-center gap-3 bg-white p-2 rounded border border-gray-200">
                                <img src={media.url} alt="Product" className="h-16 w-16 rounded object-cover border" />
                                <div className="flex-1">
                                  <p className="text-xs font-medium text-gray-700">Assigned to sizes:</p>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {media.assignedSizes.map((sizeId) => {
                                      const size = sizes.find(s => s.id === sizeId);
                                      return (
                                        <span key={sizeId} className="px-2 py-0.5 bg-[#F53F7A] text-white text-xs rounded">
                                          {size?.name || sizeId}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeMediaFromLibrary(media.url, 'image')}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Remove from library"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Videos Section */}
                      {mediaLibrary.videos.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Videos in Library</h4>
                          <div className="space-y-2">
                            {mediaLibrary.videos.map((media, idx) => (
                              <div key={idx} className="flex items-center gap-3 bg-white p-2 rounded border border-gray-200">
                                <video src={media.url} className="h-16 w-16 rounded object-cover border" controls />
                                <div className="flex-1">
                                  <p className="text-xs font-medium text-gray-700">Assigned to sizes:</p>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {media.assignedSizes.map((sizeId) => {
                                      const size = sizes.find(s => s.id === sizeId);
                                      return (
                                        <span key={sizeId} className="px-2 py-0.5 bg-purple-600 text-white text-xs rounded">
                                          {size?.name || sizeId}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeMediaFromLibrary(media.url, 'video')}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Remove from library"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {(mediaLibrary.images.length === 0 && mediaLibrary.videos.length === 0) && (
                    <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-500">No media uploaded yet</p>
                      <p className="text-xs text-gray-400 mt-1">Upload images or videos and assign them to specific sizes</p>
                    </div>
                  )}
                </div>
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">
                    Basic Information
                  </h3>
                  <div className="space-y-3">
                    {/* Product Name and Category in one row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Product Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F53F7A] focus:border-transparent"
                          placeholder="Enter product name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Category <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.category_id}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              category_id: e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F53F7A] focus:border-transparent"
                        >
                          <option value="">Select Category</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Description in full row */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        rows={4}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F53F7A] focus:border-transparent"
                        placeholder="Enter product description"
                      />
                    </div>

                    {/* Featured Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Featured Type (Optional)
                      </label>
                      <select
                        value={formData.featured_type || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            featured_type:
                              e.target.value === ""
                                ? null
                                : (e.target.value as
                                    | "trending"
                                    | "best_seller"
                                    | null),
                          })
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F53F7A] focus:border-transparent"
                      >
                        <option value="">None</option>
                        <option value="trending">Trending Now</option>
                        <option value="best_seller">Best Sellers</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Color and Size Selection */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">
                    Product Variants
                  </h3>

                  {/* Colors and Sizes in one row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Colors */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Available Colors (Optional)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {colors.map((color) => (
                          <button
                            key={color.id}
                            type="button"
                            className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                              selectedColors.includes(color.id)
                                ? "border-[#F53F7A] ring-2 ring-[#F53F7A]"
                                : "border-gray-300 hover:border-gray-400"
                            }`}
                            style={{ backgroundColor: color.hex_code }}
                            onClick={() => handleColorSelection(color.id)}
                          >
                            {selectedColors.includes(color.id) && (
                              <span className="text-white font-bold text-sm">
                                ✓
                              </span>
                            )}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            console.log(
                              "Add color button clicked, current modal state:",
                              showAddColorModal
                            );
                            setShowAddColorModal(true);
                            console.log("Modal state after setting:", true);
                          }}
                          className="w-10 h-10 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-[#F53F7A] hover:text-[#F53F7A] transition-all cursor-pointer z-10 relative"
                          style={{ pointerEvents: "auto" }}
                          title="Add new color"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                            />
                          </svg>
                        </button>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Select colors if your product comes in different colors.
                        Leave empty for size-only products.
                      </p>
                    </div>

                    {/* Sizes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Available Sizes <span className="text-red-500">*</span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {sizes.map((size) => (
                          <button
                            key={size.id}
                            type="button"
                            className={`px-4 py-2 rounded-lg border transition-all ${
                              selectedSizes.includes(size.id)
                                ? "bg-[#F53F7A] text-white border-[#F53F7A]"
                                : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                            }`}
                            onClick={() => handleSizeSelection(size.id)}
                          >
                            {size.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Variants Configuration */}
                  {variants.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">
                        Variant Configuration
                      </h3>
                      <div className="space-y-4">
                        {variants.map((variant) => {
                          const color = colors.find(
                            (c) => c.id === variant.color_id
                          );
                          const size = sizes.find(
                            (s) => s.id === variant.size_id
                          );

                          return (
                            <div
                              key={`${variant.color_id}-${variant.size_id}`}
                              className="border border-gray-200 rounded-lg p-3 relative"
                            >
                              <div className="flex items-center gap-3 overflow-x-auto">
                                {/* Color/Size Display */}
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {variant.color_id ? (
                                    <>
                                      <div
                                        className="w-5 h-5 rounded-full border-2 border-gray-300"
                                        style={{
                                          backgroundColor: colors.find(c => c.id === variant.color_id)?.hex_code || "#ccc",
                                        }}
                                      ></div>
                                      <span className="text-lg font-medium whitespace-nowrap">
                                        {size?.name}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-lg font-medium whitespace-nowrap">
                                      {size?.name}
                                    </span>
                                  )}
                                </div>

                                {/* Cross Icon */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Remove this variant by filtering it out
                                    setVariants((prev) =>
                                      prev.filter(
                                        (v) =>
                                          !(
                                            v.color_id === variant.color_id &&
                                            v.size_id === variant.size_id
                                          )
                                      )
                                    );
                                    // Also remove from selected colors/sizes if no other variants use them
                                    const remainingVariants = variants.filter(
                                      (v) =>
                                        !(
                                          v.color_id === variant.color_id &&
                                          v.size_id === variant.size_id
                                        )
                                    );
                                    const usedColors = [
                                      ...new Set(
                                        remainingVariants.map((v) => v.color_id).filter((id): id is string => Boolean(id))
                                      ),
                                    ];
                                    const usedSizes = [
                                      ...new Set(
                                        remainingVariants.map((v) => v.size_id)
                                      ),
                                    ];
                                    setSelectedColors(usedColors);
                                    setSelectedSizes(usedSizes);
                                  }}
                                  className="w-5 h-5 absolute -top-2 -right-2 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors flex-shrink-0"
                                >
                                  <svg
                                    className="w-3 h-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                </button>

                                {/* All inputs, images, and videos in one horizontal row */}
                                <div className="flex gap-3 min-w-max">
                                  {/* Quantity */}
                                  <div className="w-24 flex-shrink-0">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                      Qty <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                      type="number"
                                      value={variant.quantity}
                                      onChange={(e) =>
                                        updateVariant(
                                          variant.color_id,
                                          variant.size_id,
                                          "quantity",
                                          parseInt(e.target.value) || 0
                                        )
                                      }
                                      min="0"
                                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#F53F7A] focus:border-transparent"
                                    />
                                  </div>

                                  {/* SKU */}
                                  <div className="w-24 flex-shrink-0">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                      SKU <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                      type="text"
                                      value={variant.sku}
                                      onChange={(e) =>
                                        updateVariant(
                                          variant.color_id,
                                          variant.size_id,
                                          "sku",
                                          e.target.value
                                        )
                                      }
                                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#F53F7A] focus:border-transparent"
                                      placeholder="SKU"
                                    />
                                  </div>

                                  {/* MRP */}
                                  <div className="w-20 flex-shrink-0">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                      MRP <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                      type="number"
                                      value={Math.round(variant.mrp_price)}
                                      onChange={(e) => {
                                        const mrp = parseFloat(e.target.value) || 0;
                                        updateVariant(
                                          variant.color_id,
                                          variant.size_id,
                                          "mrp_price",
                                          mrp
                                        );
                                        const discount = calculateDiscountPercentage(mrp, variant.rsp_price);
                                        updateVariant(
                                          variant.color_id,
                                          variant.size_id,
                                          "discount_percentage",
                                          discount
                                        );
                                      }}
                                      step="1"
                                      min="0"
                                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#F53F7A] focus:border-transparent"
                                    />
                                  </div>

                                  {/* RSP */}
                                  <div className="w-20 flex-shrink-0">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                      RSP <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                      type="number"
                                      value={Math.round(variant.rsp_price)}
                                      onChange={(e) => {
                                        const rsp = parseFloat(e.target.value) || 0;
                                        updateVariant(
                                          variant.color_id,
                                          variant.size_id,
                                          "rsp_price",
                                          rsp
                                        );
                                        updateVariant(
                                          variant.color_id,
                                          variant.size_id,
                                          "price",
                                          rsp
                                        );
                                        const discount = calculateDiscountPercentage(variant.mrp_price, rsp);
                                        updateVariant(
                                          variant.color_id,
                                          variant.size_id,
                                          "discount_percentage",
                                          discount
                                        );
                                      }}
                                      step="1"
                                      min="0"
                                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#F53F7A] focus:border-transparent"
                                    />
                                  </div>

                                  {/* Cost Price */}
                                  <div className="w-20 flex-shrink-0">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                      Cost
                                    </label>
                                    <input
                                      type="number"
                                      value={Math.round(variant.cost_price)}
                                      onChange={(e) =>
                                        updateVariant(
                                          variant.color_id,
                                          variant.size_id,
                                          "cost_price",
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      step="1"
                                      min="0"
                                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#F53F7A] focus:border-transparent"
                                    />
                                  </div>

                                  {/* Discount */}
                                  <div className="w-20 flex-shrink-0">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                      Disc %
                                    </label>
                                    <input
                                      type="number"
                                      value={Math.round(variant.discount_percentage)}
                                      onChange={(e) =>
                                        updateVariant(
                                          variant.color_id,
                                          variant.size_id,
                                          "discount_percentage",
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      step="1"
                                      min="0"
                                      max="100"
                                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#F53F7A] focus:border-transparent"
                                      readOnly
                                    />
                                  </div>

                                  {/* Variant Images (display + per-variant optional upload) */}
                                  <div className="w-80 flex-shrink-0">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                      Images
                                    </label>
                                    <div className="flex gap-2 items-start">
                                      <div className="flex gap-1 overflow-x-auto">
                                        {variant.image_urls.map((url, idx) => (
                                          <div key={idx} className="relative flex-shrink-0">
                                            <img
                                              src={url}
                                              alt={color ? `${color.name} ${size?.name}` : `${size?.name}`}
                                              className="h-12 w-12 rounded object-cover border"
                                            />
                                            <button
                                              onClick={() => removeVariantImage(variant.color_id, variant.size_id, idx)}
                                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs hover:bg-red-600"
                                            >
                                              ×
                                            </button>
                                          </div>
                                        ))}
                                        <label className="h-12 w-12 flex-shrink-0 flex items-center justify-center border-2 border-dashed border-gray-300 rounded text-gray-400 hover:border-[#F53F7A] hover:text-[#F53F7A] cursor-pointer">
                                          <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={(e) => handleVariantImageUpload(variant.color_id, variant.size_id, e)}
                                            className="hidden"
                                          />
                                          {uploadingImages ? "..." : "+"}
                                        </label>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Variant Videos (display + per-variant optional upload) */}
                                  <div className="w-80 flex-shrink-0">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                      Videos
                                    </label>
                                    <div className="flex gap-2 items-start">
                                      <div className="flex gap-1 overflow-x-auto">
                                        {variant.video_urls.map((url, idx) => (
                                          <div key={idx} className="relative flex-shrink-0">
                                            <video
                                              src={url}
                                              className="h-12 w-12 rounded object-cover border"
                                              controls
                                            />
                                            <button
                                              onClick={() => removeVariantVideo(variant.color_id, variant.size_id, idx)}
                                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs hover:bg-red-600"
                                            >
                                              ×
                                            </button>
                                          </div>
                                        ))}
                                        <label className="h-12 w-12 flex-shrink-0 flex items-center justify-center border-2 border-dashed border-gray-300 rounded text-gray-400 hover:border-[#F53F7A] hover:text-[#F53F7A] cursor-pointer">
                                          <input
                                            type="file"
                                            accept="video/*"
                                            multiple
                                            onChange={(e) => handleVariantVideoUpload(variant.color_id, variant.size_id, e)}
                                            className="hidden"
                                          />
                                          {uploadingVideos ? "..." : "+"}
                                        </label>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Vendor Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">
                    Vendor Information
                  </h3>
                  <div className="space-y-3">
                    {/* Vendor Name and Alias Vendor in one row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Vendor Name
                        </label>
                        <input
                          type="text"
                          value={formData.vendor_name}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              vendor_name: e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F53F7A] focus:border-transparent"
                          placeholder="Enter vendor name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Alias Vendor
                        </label>
                        <input
                          type="text"
                          value={formData.alias_vendor}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              alias_vendor: e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F53F7A] focus:border-transparent"
                          placeholder="Enter alias vendor"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Return Policy */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">
                    Return Policy
                  </h3>
                  <textarea
                    value={formData.return_policy}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        return_policy: e.target.value,
                      })
                    }
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F53F7A] focus:border-transparent"
                    placeholder="Enter return policy details..."
                  />
                </div>

                {/* Status */}
                <div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_active: e.target.checked,
                        })
                      }
                      className="h-5 w-5 text-[#F53F7A] border-gray-300 rounded focus:ring-[#F53F7A]"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      Product is active and visible
                    </label>
                  </div>
                </div>

                {/* Reviews Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900">
                      Product Reviews (Optional)
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowReviewsSection(!showReviewsSection)}
                      className="text-sm text-[#F53F7A] hover:text-[#F53F7A]/80 font-medium"
                    >
                      {showReviewsSection ? "Hide Reviews" : "Show Reviews"}
                    </button>
                  </div>

                  {showReviewsSection && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                          Add customer reviews to showcase product quality
                        </p>
                        <button
                          type="button"
                          onClick={addReview}
                          className="px-3 py-1 bg-[#F53F7A] text-white text-sm rounded-lg hover:bg-[#F53F7A]/90"
                        >
                          Add Review
                        </button>
                      </div>

                      {reviews.length === 0 ? (
                        <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
                          <svg
                            className="mx-auto h-12 w-12 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                            />
                          </svg>
                          <p className="mt-2 text-sm text-gray-500">
                            No reviews added yet
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {reviews.map((review, index) => (
                            <div
                              key={index}
                              className="border border-gray-200 rounded-lg p-3 relative"
                            >
                              <div className="flex items-center gap-3 overflow-x-auto">
                                {/* Review Number and Remove Button */}
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className="text-sm font-medium text-gray-900">
                                    #{index + 1}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() => removeReview(index)}
                                    className="w-4 h-4 absolute -top-2 -right-2 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>

                                {/* Verification Status */}
                                <button
                                  type="button"
                                  onClick={() => toggleReviewVerification(index)}
                                  className={`px-2 py-1 text-xs rounded-full flex-shrink-0 ${
                                    review.is_verified
                                      ? "bg-green-100 text-green-800"
                                      : "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  {review.is_verified ? "✓" : "○"}
                                </button>

                                {/* All inputs in one horizontal row */}
                                <div className="flex gap-3 min-w-max">
                                  {/* Reviewer Name */}
                                  <div className="w-32 flex-shrink-0">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                      Name
                                    </label>
                                    <input
                                      type="text"
                                      value={review.reviewer_name}
                                      onChange={(e) => updateReview(index, "reviewer_name", e.target.value)}
                                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#F53F7A] focus:border-transparent"
                                      placeholder="Name"
                                    />
                                  </div>

                                  {/* Rating */}
                                  <div className="w-24 flex-shrink-0">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                      Rating
                                    </label>
                                    <div className="flex items-center gap-1">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                          key={star}
                                          type="button"
                                          onClick={() => updateReview(index, "rating", star)}
                                          className={`text-lg ${
                                            star <= review.rating ? "text-yellow-400" : "text-gray-300"
                                          }`}
                                        >
                                          ★
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Review Date */}
                                  <div className="w-28 flex-shrink-0">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                      Date
                                    </label>
                                    <input
                                      type="date"
                                      value={review.date}
                                      onChange={(e) => updateReview(index, "date", e.target.value)}
                                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#F53F7A] focus:border-transparent"
                                    />
                                  </div>

                                  {/* Comment */}
                                  <div className="w-48 flex-shrink-0">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                      Comment
                                    </label>
                                    <input
                                      type="text"
                                      value={review.comment}
                                      onChange={(e) => updateReview(index, "comment", e.target.value)}
                                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#F53F7A] focus:border-transparent"
                                      placeholder="Comment"
                                    />
                                  </div>

                                  {/* Profile Image */}
                                  <div className="w-32 flex-shrink-0">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                      Profile
                                    </label>
                                    <div className="flex items-center gap-2">
                                      {review.profile_image_url ? (
                                        <div className="relative">
                                          <img
                                            src={review.profile_image_url}
                                            alt="Profile"
                                            className="h-12 w-12 rounded-full object-cover border"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => removeReviewImage(index)}
                                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs hover:bg-red-600"
                                          >
                                            ×
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                          </svg>
                                        </div>
                                      )}
                                      <div className="flex gap-1">
                                        <label>
                                          <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleReviewImageUpload(index, e)}
                                            className="hidden"
                                          />
                                          <div className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-600 hover:bg-gray-50 cursor-pointer">
                                            {uploadingReviewImages ? "..." : "Upload"}
                                          </div>
                                        </label>
                                        <input
                                          type="url"
                                          value={review.profile_image_url || ""}
                                          onChange={(e) => updateReview(index, "profile_image_url", e.target.value)}
                                          placeholder="URL"
                                          className="w-16 border border-gray-300 rounded px-1 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#F53F7A] focus:border-transparent"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Size Selection Modal */}
      {showSizeSelectionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#F53F7A] to-[#F53F7A]/90 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    Select Sizes for {pendingMediaType === 'image' ? 'Images' : 'Videos'}
                  </h2>
                  <p className="text-sm text-white/80 mt-1">
                    {pendingMediaUrls.length} {pendingMediaType === 'image' ? 'image' : 'video'}(s) uploaded
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowSizeSelectionModal(false);
                    setPendingMediaUrls([]);
                    setSelectedSizesForMedia([]);
                  }}
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
              {/* Media Preview */}
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 mb-3">Media to assign:</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {pendingMediaUrls.map((url, idx) => (
                    <div key={idx} className="flex-shrink-0">
                      {pendingMediaType === 'image' ? (
                        <img src={url} alt="Preview" className="h-20 w-20 rounded object-cover border-2 border-[#F53F7A]" />
                      ) : (
                        <video src={url} className="h-20 w-20 rounded object-cover border-2 border-purple-600" controls />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Size Selection */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Select which sizes should use this media:
                </p>
                
                {/* Select All / Deselect All */}
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      const availableSizes = formData.category_id 
                        ? sizes.filter(s => s.category_id === formData.category_id).map(s => s.id)
                        : sizes.map(s => s.id);
                      setSelectedSizesForMedia(availableSizes);
                    }}
                    className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSizesForMedia([])}
                    className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  >
                    Deselect All
                  </button>
                </div>

                {/* Size Checkboxes */}
                <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                  {sizes.length === 0 ? (
                    <div className="text-center py-4 text-sm text-gray-500">
                      No sizes available. Please add sizes in the system first.
                    </div>
                  ) : (
                    sizes
                      .filter(size => !formData.category_id || size.category_id === formData.category_id)
                      .map((size) => {
                        const isSelected = selectedSizesForMedia.includes(size.id);
                        
                        return (
                          <label
                            key={size.id}
                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-[#F53F7A] text-white'
                                : 'bg-white hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedSizesForMedia([...selectedSizesForMedia, size.id]);
                                } else {
                                  setSelectedSizesForMedia(selectedSizesForMedia.filter(id => id !== size.id));
                                }
                              }}
                              className="h-5 w-5 rounded border-gray-300 text-[#F53F7A] focus:ring-[#F53F7A]"
                            />
                            <span className="font-medium">{size.name}</span>
                            {selectedColors.length > 0 && (
                              <span className={`text-xs ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                                (All colors)
                              </span>
                            )}
                          </label>
                        );
                      })
                  )}
                </div>
              </div>

              {/* Selection Summary */}
              {selectedSizesForMedia.length > 0 && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    <span className="font-semibold">{selectedSizesForMedia.length}</span> size(s) selected
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowSizeSelectionModal(false);
                    setPendingMediaUrls([]);
                    setSelectedSizesForMedia([]);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applyMediaToSelectedSizes}
                  disabled={selectedSizesForMedia.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#F53F7A] hover:bg-[#F53F7A]/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Assign to Selected Sizes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Color Modal */}
      {showAddColorModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add New Color</h3>
              <button
                onClick={() => setShowAddColorModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newColor.name}
                  onChange={(e) => setNewColor({ ...newColor, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F53F7A] focus:border-transparent"
                  placeholder="Enter color name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color Code <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={newColor.hex_code}
                    onChange={(e) => setNewColor({ ...newColor, hex_code: e.target.value })}
                    className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={newColor.hex_code}
                    onChange={(e) => setNewColor({ ...newColor, hex_code: e.target.value })}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F53F7A] focus:border-transparent"
                    placeholder="#000000"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={handleAddColor}
                  disabled={addingColor}
                  className="flex-1 bg-[#F53F7A] text-white py-2 px-4 rounded-lg hover:bg-[#F53F7A]/90 transition-colors disabled:opacity-50"
                >
                  {addingColor ? (
                    <>
                      <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Adding...
                    </>
                  ) : (
                    'Add Color'
                  )}
                </button>
                <button
                  onClick={() => setShowAddColorModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductForm() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProductFormContent />
    </Suspense>
  );
}
