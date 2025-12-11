import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ljnheixbsweamlbntwvh.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqbmhlaXhic3dlYW1sYm50d3ZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDc1ODgyOSwiZXhwIjoyMDY2MzM0ODI5fQ.RYiLZQB_YX8XlUQu6sRXamitaboTB3n2CMknIskkiFs'
);

// Server-side function to upload image to Bunny Storage
async function uploadImageToBunny(
  file: File,
  folder: string
): Promise<{ url: string; error: string | null }> {
  try {
    const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE || '';
    const BUNNY_STORAGE_API_KEY = process.env.BUNNY_STORAGE_API_KEY || '';
    const BUNNY_STORAGE_REGION = process.env.BUNNY_STORAGE_REGION || 'ny';

    if (!BUNNY_STORAGE_ZONE || !BUNNY_STORAGE_API_KEY) {
      return {
        url: '',
        error: 'Bunny Storage configuration missing',
      };
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const objectName = `${folder}/${timestamp}-${randomStr}.${fileExtension}`;

    // Upload to Bunny Storage
    const uploadUrl = `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/${objectName}`;
    const fileBuffer = await file.arrayBuffer();

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': BUNNY_STORAGE_API_KEY,
        'Content-Type': file.type || 'image/jpeg',
      },
      body: fileBuffer,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      return {
        url: '',
        error: `Failed to upload to Bunny Storage: ${errorText}`,
      };
    }

    // Construct public URL
    const cdnHost = process.env.BUNNY_STORAGE_CDN_HOST || `https://${BUNNY_STORAGE_ZONE}.b-cdn.net`;
    const publicUrl = `${cdnHost}/${objectName}`;

    return {
      url: publicUrl,
      error: null,
    };
  } catch (error: any) {
    console.error('Bunny Storage upload error:', error);
    return {
      url: '',
      error: error.message || 'Failed to upload image to Bunny Storage',
    };
  }
}

interface ProductDetails {
  export_date?: string;
  version?: string;
  products: Product[];
}

interface Product {
  product_id: string;
  product_name: string;
  description?: string;
  status?: string;
  media: {
    size_m?: {
      path: string;
      filename: string;
    };
    size_l?: {
      path: string;
      filename: string;
    };
  };
  metadata?: {
    created_at?: string;
    updated_at?: string;
    submitted_at?: string | null;
    notes?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const zipFile = formData.get('zipFile') as File;

    if (!zipFile) {
      return NextResponse.json(
        { error: 'No ZIP file provided' },
        { status: 400 }
      );
    }

    // Read ZIP file
    const arrayBuffer = await zipFile.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Find product_details.json - search recursively with different case variations
    let productDetailsFile: JSZip.JSZipObject | null = null;
    const possiblePaths = [
      'product_details.json',
      'Product_Details.json',
      'PRODUCT_DETAILS.JSON',
      'product-details.json',
      'Product-Details.json',
    ];

    // First try exact paths
    for (const path of possiblePaths) {
      productDetailsFile = zip.file(path);
      if (productDetailsFile) break;
    }

    // If not found, search all files recursively (including subfolders)
    if (!productDetailsFile) {
      const allFiles: string[] = [];
      zip.forEach((relativePath, file) => {
        if (!file.dir) {
          allFiles.push(relativePath);
          const fileName = relativePath.split('/').pop()?.split('\\').pop() || relativePath;
          const lowerFileName = fileName.toLowerCase();
          if (
            lowerFileName === 'product_details.json' ||
            lowerFileName === 'product-details.json' ||
            (lowerFileName.includes('product') && lowerFileName.includes('details') && lowerFileName.endsWith('.json'))
          ) {
            if (!productDetailsFile) {
              productDetailsFile = file;
            }
          }
        }
      });
      
      // Log available files for debugging (first 30 files)
      if (!productDetailsFile && allFiles.length > 0) {
        console.log('Files found in ZIP:', allFiles.slice(0, 30).join(', '));
        console.log('Total files:', allFiles.length);
      }
    }

    if (!productDetailsFile) {
      // Try to list all JSON files found
      const jsonFiles: string[] = [];
      zip.forEach((relativePath, file) => {
        if (!file.dir && relativePath.toLowerCase().endsWith('.json')) {
          jsonFiles.push(relativePath);
        }
      });
      
      const errorMsg = jsonFiles.length > 0
        ? `product_details.json not found. Found JSON files: ${jsonFiles.join(', ')}`
        : 'product_details.json not found in ZIP file. Please ensure the file exists in the ZIP root or any subfolder.';
      
      return NextResponse.json(
        { error: errorMsg },
        { status: 400 }
      );
    }

    const productDetailsJson = await productDetailsFile.async('string');
    const productDetails: ProductDetails = JSON.parse(productDetailsJson);

    if (!productDetails.products || !Array.isArray(productDetails.products)) {
      return NextResponse.json(
        { error: 'Invalid product_details.json format' },
        { status: 400 }
      );
    }

    const errors: string[] = [];
    let productsCreated = 0;

    // Helper function to sanitize SKU
    const sanitizeSKU = (text: string): string => {
      if (!text || text.trim() === '') return 'SKU-' + Date.now();
      return text
        .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
        .toUpperCase()
        .substring(0, 100) || 'SKU-' + Date.now(); // Ensure non-empty
    };

    // Helper function to sanitize product name
    const sanitizeProductName = (text: string): string => {
      if (!text || text.trim() === '') return 'Product-' + Date.now();
      return text
        .replace(/[^\w\s-]/g, '') // Remove special characters except word chars, spaces, and hyphens
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim()
        .substring(0, 255) || 'Product-' + Date.now(); // Ensure non-empty
    };

    // Process each product
    for (const product of productDetails.products) {
      try {
        // Extract base filename (remove M_ or L_ prefix)
        const baseName = product.product_name.replace(/^(M_|L_)/, '').replace(/\.[^.]+$/, '');
        
        // Get product name from base filename or use product_id, then sanitize
        const rawProductName = baseName || product.product_id || `Product ${product.product_id}`;
        const productName = sanitizeProductName(rawProductName);
        
        // Get description from product object or try to read from Descriptions folder
        let description = product.description || '';
        
        if (!description) {
          const descriptionFile = zip.file(`Descriptions/${baseName}.txt`);
          if (descriptionFile) {
            description = await descriptionFile.async('string');
          }
        }

        // Create product in database
        const { data: newProduct, error: productError } = await supabase
          .from('products')
          .insert({
            name: productName,
            description: description || '',
            category_id: '', // Will be set later
            is_active: false, // Draft products are inactive
            featured_type: null,
            like_count: 0,
            return_policy: '',
            vendor_name: '',
            alias_vendor: '',
            influencer_id: null,
            hsn_code: null, // Will need to be set manually
            fabric_id: null,
            status: product.status || 'draft',
          })
          .select('id')
          .single();

        if (productError) {
          errors.push(`Failed to create product "${productName}": ${productError.message}`);
          continue;
        }

        if (!newProduct) {
          errors.push(`Failed to create product "${productName}": No product ID returned`);
          continue;
        }

        // Get size IDs for M and L
        const { data: sizes } = await supabase
          .from('sizes')
          .select('id, name')
          .in('name', ['M', 'L']);

        const sizeMap = new Map(sizes?.map(s => [s.name.toUpperCase(), s.id]) || []);

        // Upload images and create variants
        const variantsToCreate: Array<{
          product_id: string;
          size_id: string;
          color_id: null;
          quantity: number;
          price: number;
          sku: string;
          mrp_price: number;
          rsp_price: number;
          cost_price: number;
          discount_percentage: number;
          image_urls: string[];
          video_urls: string[];
        }> = [];

        // Process Size M image
        if (product.media.size_m) {
          const mSizeId = sizeMap.get('M');
          if (mSizeId) {
            // Try multiple possible paths for M image
            let mImageFile = zip.file(product.media.size_m.path);
            if (!mImageFile) {
              // Try with different case variations
              const possibleMPaths = [
                product.media.size_m.path,
                product.media.size_m.path.toLowerCase(),
                product.media.size_m.path.toUpperCase(),
                `M_Size/${product.media.size_m.filename}`,
                `m_size/${product.media.size_m.filename}`,
                `M_Size/${product.media.size_m.filename.toLowerCase()}`,
                product.media.size_m.filename,
              ];
              
              for (const path of possibleMPaths) {
                mImageFile = zip.file(path);
                if (mImageFile) break;
              }
              
              // If still not found, search for files starting with M_ or in M_Size folder
              if (!mImageFile && product.media.size_m) {
                const sizeM = product.media.size_m; // Store in local variable for TypeScript narrowing
                zip.forEach((relativePath, file) => {
                  if (!file.dir) {
                    const fileName = relativePath.split('/').pop() || relativePath;
                    if (
                      fileName.toLowerCase().startsWith('m_') ||
                      relativePath.toLowerCase().includes('/m_size/') ||
                      relativePath.toLowerCase().includes('\\m_size\\')
                    ) {
                      const baseFileName = fileName.replace(/^m_/i, '').toLowerCase();
                      const productBaseName = sizeM.filename.replace(/^m_/i, '').toLowerCase();
                      if (baseFileName === productBaseName || baseFileName.includes(productBaseName.split('.')[0])) {
                        mImageFile = file;
                      }
                    }
                  }
                });
              }
            }
            
            if (mImageFile) {
              try {
                const mImageBlob = await mImageFile.async('blob');
                // Detect MIME type from filename extension
                const mimeType = product.media.size_m.filename.match(/\.(jpg|jpeg)$/i) 
                  ? 'image/jpeg' 
                  : product.media.size_m.filename.match(/\.png$/i)
                  ? 'image/png'
                  : product.media.size_m.filename.match(/\.webp$/i)
                  ? 'image/webp'
                  : 'image/jpeg';
                const mImageFileObj = new File([mImageBlob], product.media.size_m.filename, {
                  type: mimeType,
                });

                // Upload image to Bunny Storage
                const uploadResult = await uploadImageToBunny(mImageFileObj, 'productsimages');
                if (uploadResult.error) {
                  errors.push(`Failed to upload M image for "${productName}": ${uploadResult.error}`);
                } else {
                  const existingVariant = variantsToCreate.find(v => v.size_id === mSizeId);
                  if (existingVariant) {
                    existingVariant.image_urls.push(uploadResult.url);
                  } else {
                    variantsToCreate.push({
                      product_id: newProduct.id,
                      size_id: mSizeId,
                      color_id: null,
                      quantity: 0,
                      price: 0,
                      sku: sanitizeSKU(`${productName}-M`),
                      mrp_price: 0,
                      rsp_price: 0,
                      cost_price: 0,
                      discount_percentage: 0,
                      image_urls: [uploadResult.url],
                      video_urls: [],
                    });
                  }
                }
              } catch (error: any) {
                errors.push(`Failed to process M image for "${productName}": ${error.message}`);
              }
            }
          }
        }

        // Process Size L image
        if (product.media.size_l) {
          const lSizeId = sizeMap.get('L');
          if (lSizeId) {
            // Try multiple possible paths for L image
            let lImageFile = zip.file(product.media.size_l.path);
            if (!lImageFile) {
              // Try with different case variations
              const possibleLPaths = [
                product.media.size_l.path,
                product.media.size_l.path.toLowerCase(),
                product.media.size_l.path.toUpperCase(),
                `L_Size/${product.media.size_l.filename}`,
                `l_size/${product.media.size_l.filename}`,
                `L_Size/${product.media.size_l.filename.toLowerCase()}`,
                product.media.size_l.filename,
              ];
              
              for (const path of possibleLPaths) {
                lImageFile = zip.file(path);
                if (lImageFile) break;
              }
              
              // If still not found, search for files starting with L_ or in L_Size folder
              if (!lImageFile && product.media.size_l) {
                const sizeL = product.media.size_l; // Store in local variable for TypeScript narrowing
                zip.forEach((relativePath, file) => {
                  if (!file.dir) {
                    const fileName = relativePath.split('/').pop() || relativePath;
                    if (
                      fileName.toLowerCase().startsWith('l_') ||
                      relativePath.toLowerCase().includes('/l_size/') ||
                      relativePath.toLowerCase().includes('\\l_size\\')
                    ) {
                      const baseFileName = fileName.replace(/^l_/i, '').toLowerCase();
                      const productBaseName = sizeL.filename.replace(/^l_/i, '').toLowerCase();
                      if (baseFileName === productBaseName || baseFileName.includes(productBaseName.split('.')[0])) {
                        lImageFile = file;
                      }
                    }
                  }
                });
              }
            }
            
            if (lImageFile) {
              try {
                const lImageBlob = await lImageFile.async('blob');
                // Detect MIME type from filename extension
                const mimeType = product.media.size_l.filename.match(/\.(jpg|jpeg)$/i) 
                  ? 'image/jpeg' 
                  : product.media.size_l.filename.match(/\.png$/i)
                  ? 'image/png'
                  : product.media.size_l.filename.match(/\.webp$/i)
                  ? 'image/webp'
                  : 'image/jpeg';
                const lImageFileObj = new File([lImageBlob], product.media.size_l.filename, {
                  type: mimeType,
                });

                // Upload image to Bunny Storage
                const uploadResult = await uploadImageToBunny(lImageFileObj, 'productsimages');
                if (uploadResult.error) {
                  errors.push(`Failed to upload L image for "${productName}": ${uploadResult.error}`);
                } else {
                  const existingVariant = variantsToCreate.find(v => v.size_id === lSizeId);
                  if (existingVariant) {
                    existingVariant.image_urls.push(uploadResult.url);
                  } else {
                    variantsToCreate.push({
                      product_id: newProduct.id,
                      size_id: lSizeId,
                      color_id: null,
                      quantity: 0,
                      price: 0,
                      sku: sanitizeSKU(`${productName}-L`),
                      mrp_price: 0,
                      rsp_price: 0,
                      cost_price: 0,
                      discount_percentage: 0,
                      image_urls: [uploadResult.url],
                      video_urls: [],
                    });
                  }
                }
              } catch (error: any) {
                errors.push(`Failed to process L image for "${productName}": ${error.message}`);
              }
            }
          }
        }

        // Create variants
        if (variantsToCreate.length > 0) {
          const { error: variantError } = await supabase
            .from('product_variants')
            .insert(variantsToCreate);

          if (variantError) {
            errors.push(`Failed to create variants for "${productName}": ${variantError.message}`);
            // Delete the product if variant creation failed
            await supabase.from('products').delete().eq('id', newProduct.id);
            continue;
          }
        } else {
          errors.push(`No variants created for "${productName}" (no valid images found)`);
          // Delete the product if no variants were created
          await supabase.from('products').delete().eq('id', newProduct.id);
          continue;
        }

        productsCreated++;
      } catch (error: any) {
        errors.push(`Error processing product "${product.product_id}": ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import completed. ${productsCreated} product(s) created.`,
      productsCreated,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Error processing ZIP import:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process ZIP file' },
      { status: 500 }
    );
  }
}

