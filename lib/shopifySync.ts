/**
 * Shopify Sync Utilities
 * 
 * Helper functions to sync inventory with Shopify via the sync server.
 * Server must be running on http://localhost:4001 (or configured URL)
 */

const SHOPIFY_SYNC_URL = process.env.NEXT_PUBLIC_SHOPIFY_SYNC_URL || 'http://localhost:4001';

export type ShopifySyncLineItem = {
  sku: string;
  quantity: number;
};

export type ShopifySyncOrderRequest = {
  orderId: string;
  lineItems: ShopifySyncLineItem[];
};

export type ShopifySyncResponse = {
  success: boolean;
  error?: string;
};

/**
 * Sync an Only2u order with Shopify inventory
 * 
 * @param orderId - The order ID from your system
 * @param lineItems - Array of items with SKU and quantity
 * @returns Promise with success status
 * 
 * @example
 * ```typescript
 * await syncOrderToShopify('ord_123', [
 *   { sku: 'SKU-RED-42', quantity: 2 },
 *   { sku: 'SKU-BLUE-38', quantity: 1 }
 * ]);
 * ```
 */
export async function syncOrderToShopify(
  orderId: string,
  lineItems: ShopifySyncLineItem[]
): Promise<ShopifySyncResponse> {
  try {
    const response = await fetch(`${SHOPIFY_SYNC_URL}/orders/only2u`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId,
        lineItems,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return {
      success: data.success || true,
    };
  } catch (error) {
    console.error('Shopify sync error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Check if Shopify sync server is running and healthy
 * 
 * @returns Promise with boolean indicating server health
 * 
 * @example
 * ```typescript
 * const isHealthy = await isShopifySyncHealthy();
 * if (!isHealthy) {
 *   console.warn('Shopify sync server is not responding');
 * }
 * ```
 */
export async function isShopifySyncHealthy(): Promise<boolean> {
  try {
    const response = await fetch(`${SHOPIFY_SYNC_URL}/health`, {
      method: 'GET',
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.ok === true;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}

/**
 * Helper to sync order after creation
 * Use this in your order creation workflow
 * 
 * @param order - Order object with id and items
 * @param options - Configuration options
 * @returns Promise with sync result
 * 
 * @example
 * ```typescript
 * const result = await syncOrderAfterCreation(order, {
 *   throwOnError: false,
 *   silent: false
 * });
 * 
 * if (!result.success) {
 *   console.error('Sync failed:', result.error);
 * }
 * ```
 */
export async function syncOrderAfterCreation(
  order: {
    id: string;
    items?: Array<{ sku: string; quantity: number }>;
    line_items?: Array<{ sku: string; quantity: number }>;
  },
  options: {
    throwOnError?: boolean;
    silent?: boolean;
  } = {}
): Promise<ShopifySyncResponse> {
  const { throwOnError = false, silent = false } = options;

  // Extract line items from order
  const lineItems = (order.items || order.line_items || [])
    .filter((item) => item.sku && item.quantity)
    .map((item) => ({
      sku: item.sku,
      quantity: item.quantity,
    }));

  if (lineItems.length === 0) {
    const error = 'No valid line items found in order';
    if (!silent) {
      console.warn(`[Shopify Sync] ${error}`);
    }
    return { success: false, error };
  }

  // Check server health first
  const isHealthy = await isShopifySyncHealthy();
  if (!isHealthy) {
    const error = 'Shopify sync server is not responding';
    if (!silent) {
      console.warn(`[Shopify Sync] ${error}`);
    }
    if (throwOnError) {
      throw new Error(error);
    }
    return { success: false, error };
  }

  // Sync the order
  const result = await syncOrderToShopify(order.id, lineItems);

  if (!result.success) {
    if (!silent) {
      console.error(`[Shopify Sync] Failed to sync order ${order.id}:`, result.error);
    }
    if (throwOnError) {
      throw new Error(result.error || 'Shopify sync failed');
    }
  } else {
    if (!silent) {
      console.log(`[Shopify Sync] Successfully synced order ${order.id}`);
    }
  }

  return result;
}

/**
 * Batch sync multiple orders
 * Useful for reconciliation or bulk operations
 * 
 * @param orders - Array of orders to sync
 * @param options - Configuration options
 * @returns Promise with array of results
 * 
 * @example
 * ```typescript
 * const results = await batchSyncOrders(orders, {
 *   delayMs: 100,
 *   stopOnError: false
 * });
 * 
 * const succeeded = results.filter(r => r.success).length;
 * console.log(`Synced ${succeeded}/${orders.length} orders`);
 * ```
 */
export async function batchSyncOrders(
  orders: Array<{
    id: string;
    items?: Array<{ sku: string; quantity: number }>;
    line_items?: Array<{ sku: string; quantity: number }>;
  }>,
  options: {
    delayMs?: number;
    stopOnError?: boolean;
    silent?: boolean;
  } = {}
): Promise<ShopifySyncResponse[]> {
  const { delayMs = 100, stopOnError = false, silent = false } = options;

  const results: ShopifySyncResponse[] = [];

  for (const order of orders) {
    const result = await syncOrderAfterCreation(order, { silent });
    results.push(result);

    if (!result.success && stopOnError) {
      break;
    }

    // Add delay between requests to avoid rate limiting
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * Get sync server URL (for debugging)
 */
export function getShopifySyncUrl(): string {
  return SHOPIFY_SYNC_URL;
}

