"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Eye, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { supabase } from "../../../lib/supabase";
import { generateOrderPdf, generateReturnInvoicePdf } from "../../../lib/pdfUtils";
import { exportToExcel } from "../../../lib/exportUtils";

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  product_image: string;
  size: string;
  color: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Order {
  id: string;
  user_id: string;
  order_number: string;
  status: string;
  total_amount: number;
  shipping_address: string;
  billing_address: string;
  payment_method: string;
  payment_status: string;
  notes: string;
  created_at: string;
  order_items?: OrderItem[];
  user?: {
    name: string;
    email: string;
    phone: string;
  };
}

interface DraftOrderItem {
  id: string;
  draft_order_id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  product_image: string;
  size: string;
  color: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface DraftOrder {
  id: string;
  user_id: string;
  order_number: string;
  status: string;
  total_amount: number;
  shipping_address: string;
  billing_address: string;
  payment_method: string;
  payment_status: string;
  notes: string;
  created_at: string;
  rejection_reason?: string;
  items?: DraftOrderItem[];
  user?: {
    name: string;
    email: string;
    phone: string;
  };
}

interface ReturnItem {
  id: string;
  return_id: string;
  order_item_id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  size?: string;
  color?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  hsn_code?: string;
  cgst_rate?: number;
  sgst_rate?: number;
  igst_rate?: number;
  cgst_amount?: number;
  sgst_amount?: number;
  igst_amount?: number;
  tax_amount?: number;
  net_amount?: number;
}

interface OrderReturn {
  id: string;
  order_id: string;
  return_number: string;
  return_reason?: string;
  return_status: string;
  refund_amount: number;
  refund_method?: string;
  refund_status: string;
  return_date: string;
  processed_at?: string;
  notes?: string;
  created_at: string;
  return_items?: ReturnItem[];
  order?: Order;
  user?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

const OrderManagementPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [draftOrders, setDraftOrders] = useState<DraftOrder[]>([]);
  const [returnOrders, setReturnOrders] = useState<OrderReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingReturns, setLoadingReturns] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedDraftOrder, setSelectedDraftOrder] = useState<DraftOrder | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewDraftModalOpen, setViewDraftModalOpen] = useState(false);
  const [orderView, setOrderView] = useState<'regular' | 'draft' | 'returns'>('draft'); // Default to draft orders
  const [approvingOrder, setApprovingOrder] = useState<string | null>(null);
  const [rejectingOrder, setRejectingOrder] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchDraftOrders();
    fetchReturnOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Fetch orders - orders table has customer info directly (customer_name, customer_email, customer_phone)
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (ordersError) {
        console.error("Error fetching orders:", ordersError);
        toast.error("Failed to fetch orders");
        return;
      }

      // Fetch order items with product and category information
      const { data: orderItemsData, error: itemsError } = await supabase
        .from("order_items")
        .select(`
          *,
          product:products(
            tax_type,
            tax_rate,
            hsn_code
          )
        `);

      if (itemsError) {
        console.error("Error fetching order items:", itemsError);
        toast.error("Failed to fetch order items");
        return;
      }

      // Combine orders with their items and enrich with tax/HSN data
      const ordersWithItems = (ordersData || []).map((order: any) => {
        const items = (orderItemsData || []).filter(
          (item: any) => item.order_id === order.id
        ).map((item: any) => ({
          ...item,
          hsn_code: item.hsn_code || item.product?.hsn_code || null,
          tax_type: item.product?.tax_type || null,
          tax_rate: item.product?.tax_rate || null,
        }));

        return {
          ...order,
          order_items: items,
          // Manually construct user object since we're using flat columns
          user: {
            name: order.customer_name,
            email: order.customer_email,
            phone: order.customer_phone
          }
        };
      });

      setOrders(ordersWithItems);
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred while fetching orders");
    } finally {
      setLoading(false);
    }
  };

  const fetchDraftOrders = async () => {
    try {
      // Fetch draft orders with user information
      const { data: draftData, error: draftError } = await supabase
        .from("customer_draft_orders")
        .select(`
          *,
          user:users!customer_draft_orders_user_id_fkey(name, email, phone)
        `)
        .order("created_at", { ascending: false });

      if (draftError) {
        console.error("Error fetching draft orders:", draftError);
        toast.error("Failed to fetch draft orders");
        return;
      }

      // Fetch draft order items
      const { data: draftItemsData, error: draftItemsError } = await supabase
        .from("customer_draft_order_items")
        .select("*");

      if (draftItemsError) {
        console.error("Error fetching draft order items:", draftItemsError);
        return;
      }

      // Combine draft orders with their items
      const draftOrdersWithItems = (draftData || []).map((order: DraftOrder) => ({
        ...order,
        items: (draftItemsData || []).filter(
          (item: DraftOrderItem) => item.draft_order_id === order.id
        ),
      }));

      setDraftOrders(draftOrdersWithItems);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const fetchReturnOrders = async () => {
    setLoadingReturns(true);
    try {
      // Fetch return orders with order and user information
      const { data: returnsData, error: returnsError } = await supabase
        .from("order_returns")
        .select(`
          *,
          order:orders(*)
        `)
        .order("created_at", { ascending: false });

      if (returnsError) {
        console.error("Error fetching return orders:", returnsError);
        toast.error("Failed to fetch return orders");
        return;
      }

      // Fetch return items
      const { data: returnItemsData, error: returnItemsError } = await supabase
        .from("order_return_items")
        .select("*");

      if (returnItemsError) {
        console.error("Error fetching return items:", returnItemsError);
        return;
      }

      // Combine return orders with their items and user info
      const returnsWithItems = (returnsData || []).map((returnOrder: any) => {
        const orderUser = returnOrder.order ? {
          name: returnOrder.order.customer_name,
          email: returnOrder.order.customer_email,
          phone: returnOrder.order.customer_phone
        } : null;

        const enrichedOrder = returnOrder.order ? {
          ...returnOrder.order,
          user: orderUser
        } : null;

        return {
          ...returnOrder,
          return_items: (returnItemsData || []).filter(
            (item: ReturnItem) => item.return_id === returnOrder.id
          ),
          order: enrichedOrder,
          user: orderUser,
        };
      });

      setReturnOrders(returnsWithItems);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to fetch return orders");
    } finally {
      setLoadingReturns(false);
    }
  };

  const downloadReturnInvoice = async (returnOrder: OrderReturn) => {
    try {
      // Ensure we have all necessary data
      if (!returnOrder.return_items || returnOrder.return_items.length === 0) {
        toast.error("Return items not found. Please refresh and try again.");
        return;
      }

      // Fetch original order if not already loaded
      let orderData = returnOrder.order;
      if (!orderData) {
        const { data, error } = await supabase
          .from("orders")
          .select(`
            *,
            order_items:order_items(
              *,
              product:products(hsn_code)
            )
          `)
          .eq("id", returnOrder.order_id)
          .single();

        if (error || !data) {
          toast.error("Failed to fetch original order details");
          return;
        }
        orderData = {
          ...data,
          user: {
            name: data.customer_name,
            email: data.customer_email,
            phone: data.customer_phone
          }
        };
      }

      // Prepare return order with all data
      if (!orderData) {
        toast.error("Failed to fetch original order details");
        return;
      }

      const returnOrderWithData: OrderReturn = {
        ...returnOrder,
        order: orderData,
        user: returnOrder.user || orderData.user,
      };

      await generateReturnInvoicePdf(returnOrderWithData);
      toast.success("Return invoice downloaded successfully");
    } catch (error) {
      console.error("Error generating return invoice:", error);
      toast.error("Failed to generate return invoice");
    }
  };

  const currentOrders = orderView === "regular" ? orders : draftOrders;

  const { summaryRows, orderRows, itemRows, filename } = useMemo(() => {
    if (orderView === "regular") {
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, order) => sum + (order.total_amount ?? 0), 0);
      const statusCounts = orders.reduce<Record<string, number>>((acc, order) => {
        const status = (order.status || "unknown").toLowerCase();
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});
      const paymentStatusCounts = orders.reduce<Record<string, number>>((acc, order) => {
        const status = (order.payment_status || "unknown").toLowerCase();
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      const summary = [
        ["Orders Overview", ""],
        ["Total Orders", totalOrders],
        ["Total Revenue (₹)", totalRevenue],
        [
          "Statuses",
          Object.entries(statusCounts)
            .map(([status, count]) => `${status}: ${count}`)
            .join(" | ") || "-",
        ],
        [
          "Payment Statuses",
          Object.entries(paymentStatusCounts)
            .map(([status, count]) => `${status}: ${count}`)
            .join(" | ") || "-",
        ],
        [
          "Average Order Value (₹)",
          totalOrders > 0 ? Number((totalRevenue / totalOrders).toFixed(2)) : 0,
        ],
      ];

      const ordersSheet = orders.map((order, index) => ({
        "S.No": index + 1,
        "Order ID": order.id,
        "Order Number": order.order_number,
        "Order Status": order.status,
        "Payment Status": order.payment_status,
        "Payment Method": order.payment_method,
        "Total Amount (₹)": order.total_amount,
        "Customer Name": order.user?.name || "-",
        "Customer Email": order.user?.email || "-",
        "Customer Phone": order.user?.phone || "-",
        "Shipping Address": order.shipping_address || "-",
        "Billing Address": order.billing_address || "-",
        Notes: order.notes || "-",
        "Created At": order.created_at,
      }));

      const itemsSheet = orders.flatMap((order) => {
        const items = order.order_items || [];
        if (items.length === 0) {
          return [
            {
              "Order Number": order.order_number,
              "Order ID": order.id,
              "Item ID": "-",
              "Product ID": "-",
              "Product Name": "-",
              SKU: "-",
              Size: "-",
              Color: "-",
              Quantity: 0,
              "Unit Price (₹)": 0,
              "Line Total (₹)": 0,
            },
          ];
        }

        return items.map((item) => ({
          "Order Number": order.order_number,
          "Order ID": order.id,
          "Item ID": item.id,
          "Product ID": item.product_id,
          "Product Name": item.product_name,
          SKU: item.product_sku,
          Size: item.size,
          Color: item.color,
          Quantity: item.quantity,
          "Unit Price (₹)": item.unit_price,
          "Line Total (₹)": item.total_price,
        }));
      });

      return {
        summaryRows: summary,
        orderRows: ordersSheet,
        itemRows: itemsSheet,
        filename: "orders",
      };
    }

    const totalDrafts = draftOrders.length;
    const totalDraftValue = draftOrders.reduce(
      (sum, order) => sum + (order.total_amount ?? 0),
      0
    );
    const statusCounts = draftOrders.reduce<Record<string, number>>((acc, order) => {
      const status = (order.status || "unknown").toLowerCase();
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const summary = [
      ["Draft Orders Overview", ""],
      ["Total Draft Orders", totalDrafts],
      ["Total Draft Value (₹)", totalDraftValue],
      [
        "Statuses",
        Object.entries(statusCounts)
          .map(([status, count]) => `${status}: ${count}`)
          .join(" | ") || "-",
      ],
      [
        "Average Draft Value (₹)",
        totalDrafts > 0 ? Number((totalDraftValue / totalDrafts).toFixed(2)) : 0,
      ],
    ];

    const draftSheet = draftOrders.map((order, index) => ({
      "S.No": index + 1,
      "Draft ID": order.id,
      "Draft Number": order.order_number,
      Status: order.status,
      "Payment Method": order.payment_method,
      "Payment Status": order.payment_status,
      "Total Amount (₹)": order.total_amount,
      "Customer Name": order.user?.name || "-",
      "Customer Email": order.user?.email || "-",
      "Customer Phone": order.user?.phone || "-",
      "Shipping Address": order.shipping_address || "-",
      "Billing Address": order.billing_address || "-",
      "Rejection Reason": order.rejection_reason || "-",
      Notes: order.notes || "-",
      "Created At": order.created_at,
    }));

    const itemsSheet = draftOrders.flatMap((order) => {
      const items = order.items || [];
      if (items.length === 0) {
        return [
          {
            "Draft Number": order.order_number,
            "Draft ID": order.id,
            "Item ID": "-",
            "Product ID": "-",
            "Product Name": "-",
            SKU: "-",
            Size: "-",
            Color: "-",
            Quantity: 0,
            "Unit Price (₹)": 0,
            "Line Total (₹)": 0,
          },
        ];
      }

      return items.map((item) => ({
        "Draft Number": order.order_number,
        "Draft ID": order.id,
        "Item ID": item.id,
        "Product ID": item.product_id,
        "Product Name": item.product_name,
        SKU: item.product_sku,
        Size: item.size,
        Color: item.color,
        Quantity: item.quantity,
        "Unit Price (₹)": item.unit_price,
        "Line Total (₹)": item.total_price,
      }));
    });

    return {
      summaryRows: summary,
      orderRows: draftSheet,
      itemRows: itemsSheet,
      filename: "draft-orders",
    };
  }, [orders, draftOrders, orderView]);

  const handleExport = async () => {
    if (currentOrders.length === 0) {
      toast.info("Nothing to export right now.");
      return;
    }

    try {
      setExporting(true);
      await exportToExcel({
        filename,
        summary: summaryRows,
        sheets: [
          {
            name: orderView === "regular" ? "Orders" : "Draft Orders",
            data: orderRows,
          },
          {
            name: "Items",
            data: itemRows,
          },
        ],
      });
    } catch (error) {
      console.error("Error exporting orders:", error);
      toast.error("Failed to export data, please try again.");
    } finally {
      setExporting(false);
    }
  };

  // Quick utility: download a sample tax invoice and its corresponding sales return
  const handleDownloadSampleInvoiceAndReturn = async () => {
    try {
      const nowIso = new Date().toISOString();
      const sampleOrderNumber = `SAMPLE-TAX-${new Date().getFullYear()}-0001`;

      const sampleOrder: any = {
        order_number: sampleOrderNumber,
        created_at: nowIso,
        billing_address: "Sample Customer, 123 Main Road, Hyderabad, Telangana, 500001, State Code: 36",
        shipping_address: "Sample Customer, 123 Main Road, Hyderabad, Telangana, 500001, State Code: 36",
        payment_method: "Online",
        payment_status: "paid",
        status: "completed",
        notes: "Sample tax invoice (intrastate below 2500 + interstate above 2500)",
        transaction_id: "TXN-SAMPLE-0001",
        user: {
          name: "Sample Customer",
          email: "sample@example.com",
          phone: "9999999999",
          gstin: "36ABCDE1234F1Z5",
        },
        items: [
          {
            product_name: "Cotton Shirt",
            product_sku: "SHIRT-001",
            hsn_code: "6105",
            size: "M",
            color: "Blue",
            quantity: 2,
            unit_price: 1200,
            total_price: 2400,
            is_interstate: false, // CGST+SGST at 2.5% each (below 2500)
            discount: 0,
            unit_of_measurement: "PCS",
          },
          {
            product_name: "Jeans",
            product_sku: "JEAN-002",
            hsn_code: "6203",
            size: "32",
            color: "Dark Blue",
            quantity: 1,
            unit_price: 2800,
            total_price: 2800,
            is_interstate: true, // IGST 18% (above 2500)
            discount: 0,
            unit_of_measurement: "PCS",
          },
        ],
      };

      const sampleReturn: any = {
        return_number: `SAMPLE-RET-${new Date().getFullYear()}-0001`,
        return_date: nowIso,
        original_order_number: sampleOrderNumber,
        original_order_date: nowIso,
        reason: "Sample sales return",
        status: "processed",
        billing_address: sampleOrder.billing_address,
        shipping_address: sampleOrder.shipping_address,
        payment_method: sampleOrder.payment_method,
        user: sampleOrder.user,
        transaction_id: sampleOrder.transaction_id,
        items: [
          {
            product_name: "Cotton Shirt",
            product_sku: "SHIRT-001",
            hsn_code: "6105",
            size: "M",
            color: "Blue",
            quantity_returned: 1,
            unit_price: 1200,
            total_price: 1200,
            is_interstate: false,
            discount: 0,
            unit_of_measurement: "PCS",
          },
        ],
      };

      await generateOrderPdf(sampleOrder);
      await generateReturnInvoicePdf(sampleReturn);
    } catch (err: any) {
      console.error("Failed to generate sample invoice/return:", err);
      toast.error(err?.message || "Failed to generate sample PDFs");
    }
  };

  const handleApprove = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "approved" })
        .eq("id", orderId);

      if (error) {
        console.error("Error updating order:", error);
        toast.error("Failed to approve order");
        return;
      }

      setOrders(prev =>
        prev.map(order =>
          order.id === orderId ? { ...order, status: "approved" } : order
        )
      );
      toast.success("Order approved successfully");
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred while approving order");
    }
  };

  const handleReject = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "rejected" })
        .eq("id", orderId);

      if (error) {
        console.error("Error updating order:", error);
        toast.error("Failed to reject order");
        return;
      }

      setOrders(prev =>
        prev.map(order =>
          order.id === orderId ? { ...order, status: "rejected" } : order
        )
      );
      toast.error("Order rejected successfully");
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred while rejecting order");
    }
  };

  const handleDelete = async (orderId: string) => {
    if (typeof window !== 'undefined' && !window.confirm("Are you sure you want to delete this order?")) return;

    try {
      // First delete order items
      const { error: itemsError } = await supabase
        .from("order_items")
        .delete()
        .eq("order_id", orderId);

      if (itemsError) {
        console.error("Error deleting order items:", itemsError);
        toast.error("Failed to delete order items");
        return;
      }

      // Then delete the order
      const { error: orderError } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId);

      if (orderError) {
        console.error("Error deleting order:", orderError);
        toast.error("Failed to delete order");
        return;
      }

      setOrders(prev => prev.filter(order => order.id !== orderId));
      toast.success("Order deleted successfully");
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred while deleting order");
    }
  };

  const handleApproveDraftOrder = async (draftOrderId: string) => {
    if (typeof window !== 'undefined' && !window.confirm("Approve this draft order and convert it to a regular order?")) return;

    setApprovingOrder(draftOrderId);
    try {
      const response = await fetch('/api/orders/draft/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          draft_order_id: draftOrderId,
          approved_by: null, // You can add admin user ID here
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || 'Failed to approve draft order');
        return;
      }

      toast.success('Draft order approved and converted to regular order!');

      // Refresh both lists
      await fetchDraftOrders();
      await fetchOrders();

      // Switch to regular orders view
      setOrderView('regular');
    } catch (error) {
      console.error('Error:', error);
      toast.error('An error occurred while approving draft order');
    } finally {
      setApprovingOrder(null);
    }
  };

  const handleRejectDraftOrder = async (draftOrderId: string) => {
    const reason = typeof window !== 'undefined'
      ? window.prompt("Enter rejection reason (optional):")
      : null;

    if (reason === null) return; // User cancelled

    setRejectingOrder(draftOrderId);
    try {
      const response = await fetch('/api/orders/draft/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          draft_order_id: draftOrderId,
          rejection_reason: reason || 'Out of stock',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || 'Failed to reject draft order');
        return;
      }

      toast.success('Draft order rejected');
      await fetchDraftOrders();
    } catch (error) {
      console.error('Error:', error);
      toast.error('An error occurred while rejecting draft order');
    } finally {
      setRejectingOrder(null);
    }
  };

  const handleDeleteDraftOrder = async (draftOrderId: string) => {
    if (typeof window !== 'undefined' && !window.confirm("Are you sure you want to delete this draft order?")) return;

    try {
      // First delete draft order items
      const { error: itemsError } = await supabase
        .from("customer_draft_order_items")
        .delete()
        .eq("draft_order_id", draftOrderId);

      if (itemsError) {
        console.error("Error deleting draft order items:", itemsError);
        toast.error("Failed to delete draft order items");
        return;
      }

      // Then delete the draft order
      const { error: orderError } = await supabase
        .from("customer_draft_orders")
        .delete()
        .eq("id", draftOrderId);

      if (orderError) {
        console.error("Error deleting draft order:", orderError);
        toast.error("Failed to delete draft order");
        return;
      }

      setDraftOrders(prev => prev.filter(order => order.id !== draftOrderId));
      toast.success("Draft order deleted successfully");
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred while deleting draft order");
    }
  };

  const ViewDraftDetailsModal = ({ draftOrder, onClose }: { draftOrder: DraftOrder; onClose: () => void }) => {
    if (!draftOrder) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Draft Order Details</h2>
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
              DRAFT ORDER
            </span>
          </div>

          {/* Order Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold text-lg mb-3">Order Information</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Order Number:</strong> {draftOrder.order_number}</p>
                <p><strong>Status:</strong>
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${draftOrder.status === 'approved' ? 'bg-green-100 text-green-800' :
                    draftOrder.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                    {draftOrder.status}
                  </span>
                </p>
                <p><strong>Total Amount:</strong> ₹{draftOrder.total_amount}</p>
                <p><strong>Payment Method:</strong> {draftOrder.payment_method || 'N/A'}</p>
                <p><strong>Payment Status:</strong> {draftOrder.payment_status}</p>
                <p><strong>Created:</strong> {new Date(draftOrder.created_at).toLocaleString()}</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-3">Customer Information</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Name:</strong> {draftOrder.user?.name || "N/A"}</p>
                <p><strong>Email:</strong> {draftOrder.user?.email || "N/A"}</p>
                <p><strong>Phone:</strong> {draftOrder.user?.phone || "N/A"}</p>
              </div>
            </div>
          </div>

          {/* Addresses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold text-lg mb-3">Shipping Address</h3>
              <p className="text-sm text-gray-600">{draftOrder.shipping_address || 'N/A'}</p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-3">Billing Address</h3>
              <p className="text-sm text-gray-600">{draftOrder.billing_address || 'N/A'}</p>
            </div>
          </div>

          {/* Order Items */}
          <div className="mb-6">
            <h3 className="font-semibold text-lg mb-3">Order Items</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Color</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {draftOrder.items?.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="flex items-center">
                          {item.product_image && (
                            <img
                              src={item.product_image}
                              alt={item.product_name}
                              className="h-10 w-10 rounded object-cover mr-3"
                            />
                          )}
                          <span className="text-sm font-medium text-gray-900">{item.product_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.product_sku || 'N/A'}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.size || 'N/A'}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.color || 'N/A'}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">₹{item.unit_price}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">₹{item.total_price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          {draftOrder.notes && (
            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-3">Notes</h3>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{draftOrder.notes}</p>
            </div>
          )}

          {/* Rejection Reason */}
          {draftOrder.rejection_reason && (
            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-3">Rejection Reason</h3>
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">{draftOrder.rejection_reason}</p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            {draftOrder.status === 'draft' && (
              <>
                <button
                  onClick={() => {
                    handleRejectDraftOrder(draftOrder.id);
                    onClose();
                  }}
                  className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition"
                  disabled={rejectingOrder === draftOrder.id}
                >
                  {rejectingOrder === draftOrder.id ? 'Rejecting...' : 'Reject Order'}
                </button>
                <button
                  onClick={() => {
                    handleApproveDraftOrder(draftOrder.id);
                    onClose();
                  }}
                  className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition"
                  disabled={approvingOrder === draftOrder.id}
                >
                  {approvingOrder === draftOrder.id ? 'Approving...' : 'Approve Order'}
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="bg-gray-400 text-white px-4 py-2 rounded-md hover:bg-gray-500 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ViewDetailsModal = ({ order, onClose }: { order: Order; onClose: () => void }) => {
    if (!order) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <h2 className="text-xl font-bold mb-4">Order Details</h2>

          {/* Order Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold text-lg mb-3">Order Information</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Order Number:</strong> {order.order_number}</p>
                <p><strong>Status:</strong>
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${order.status === 'approved' ? 'bg-green-100 text-green-800' :
                    order.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                    {order.status}
                  </span>
                </p>
                <p><strong>Total Amount:</strong> ₹{order.total_amount}</p>
                <p><strong>Payment Method:</strong> {order.payment_method}</p>
                <p><strong>Payment Status:</strong> {order.payment_status}</p>
                <p><strong>Created:</strong> {new Date(order.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-3">Customer Information</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Name:</strong> {order.user?.name || "N/A"}</p>
                <p><strong>Email:</strong> {order.user?.email || "N/A"}</p>
                <p><strong>Phone:</strong> {order.user?.phone || "N/A"}</p>
              </div>
            </div>
          </div>

          {/* Addresses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold text-lg mb-3">Shipping Address</h3>
              <p className="text-sm text-gray-600">{order.shipping_address}</p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-3">Billing Address</h3>
              <p className="text-sm text-gray-600">{order.billing_address}</p>
            </div>
          </div>

          {/* Order Items */}
          <div className="mb-6">
            <h3 className="font-semibold text-lg mb-3">Order Items</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Color</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {order.order_items?.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="flex items-center">
                          {item.product_image && (
                            <img
                              src={item.product_image}
                              alt={item.product_name}
                              className="h-10 w-10 rounded object-cover mr-3"
                            />
                          )}
                          <span className="text-sm font-medium text-gray-900">{item.product_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.product_sku}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.size}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.color}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">₹{item.unit_price}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">₹{item.total_price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-3">Notes</h3>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{order.notes}</p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={async () => {
                // Ensure order_items are loaded before generating PDF
                let orderWithItems = { ...order };

                if (!order.order_items || order.order_items.length === 0) {
                  toast.warning('Loading order items...');
                  // Fetch order items for this specific order
                  const { data: orderItems, error } = await supabase
                    .from("order_items")
                    .select(`
                      *,
                      product:products(
                        tax_type,
                        tax_rate,
                        hsn_code
                      )
                    `)
                    .eq("order_id", order.id);

                  if (error) {
                    toast.error('Failed to load order items');
                    return;
                  }

                  // Enrich items with tax/HSN data
                  const enrichedItems = (orderItems || []).map((item: any) => ({
                    ...item,
                    hsn_code: item.hsn_code || item.product?.hsn_code || null,
                    tax_type: item.product?.tax_type || null,
                    tax_rate: item.product?.tax_rate || null,
                  }));

                  // Create new order object with items
                  orderWithItems = {
                    ...order,
                    order_items: enrichedItems
                  };
                }
                await generateOrderPdf(orderWithItems);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
            >
              Download PDF
            </button>
            <button
              onClick={() => handleReject(order.id)}
              className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition"
              disabled={order.status === 'rejected'}
            >
              Reject
            </button>
            <button
              onClick={() => handleApprove(order.id)}
              className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition"
              disabled={order.status === 'approved'}
            >
              Approve
            </button>
            <button
              onClick={onClose}
              className="bg-gray-400 text-white px-4 py-2 rounded-md hover:bg-gray-500 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
        <div className="flex gap-3 items-center">
          <button
            onClick={handleDownloadSampleInvoiceAndReturn}
            className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"
          >
            <svg className="w-4 h-4 text-[#F53F7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Sample Invoice & Return
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || currentOrders.length === 0}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${exporting || currentOrders.length === 0
              ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"
              }`}
          >
            {exporting ? (
              <>
                <svg className="h-4 w-4 animate-spin text-[#F53F7A]" viewBox="0 0 24 24">
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
                    d="M4 12a8 8 0 018-8v4l3.5-3.5L12 0v4a8 8 0 00-8 8h4z"
                  ></path>
                </svg>
                Preparing…
              </>
            ) : (
              <>
                <svg
                  className="h-4 w-4 text-[#F53F7A]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M8 12l4 4m0 0l4-4m-4 4V4"
                  />
                </svg>
                Export {orderView === "regular" ? "Orders" : orderView === "returns" ? "Returns" : "Drafts"}
              </>
            )}
          </button>
          <span className="text-sm text-gray-600">
            {orderView === "draft"
              ? `${draftOrders.filter((o) => o.status === "draft").length} pending draft orders`
              : orderView === "returns"
                ? `${returnOrders.length} return orders`
                : `${orders.length} total orders`}
          </span>
        </div>
      </div>

      {/* Order Type Filter Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setOrderView('draft')}
              className={`${orderView === 'draft'
                ? 'border-[#F53F7A] text-[#F53F7A]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Draft Orders (Out-of-Stock)
              {draftOrders.filter(o => o.status === 'draft').length > 0 && (
                <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {draftOrders.filter(o => o.status === 'draft').length}
                </span>
              )}
            </button>
            <button
              onClick={() => setOrderView('regular')}
              className={`${orderView === 'regular'
                ? 'border-[#F53F7A] text-[#F53F7A]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Regular Orders
              {orders.length > 0 && (
                <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {orders.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setOrderView('returns')}
              className={`${orderView === 'returns'
                ? 'border-[#F53F7A] text-[#F53F7A]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Sales Returns
              {returnOrders.length > 0 && (
                <span className="bg-red-100 text-red-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {returnOrders.length}
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>

      {/* Draft Orders Table */}
      {orderView === 'draft' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-amber-50">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm text-amber-800 font-medium">
                Draft orders are placed by customers when products are out of stock. Review and approve/reject them here.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400">Loading...</td></tr>
                ) : draftOrders.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400">No draft orders found.</td></tr>
                ) : (
                  draftOrders.map((draftOrder) => (
                    <tr key={draftOrder.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{draftOrder.order_number}</span>
                          <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">DRAFT</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{draftOrder.user?.name || "N/A"}</div>
                          <div className="text-sm text-gray-500">{draftOrder.user?.email || "N/A"}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">₹{draftOrder.total_amount}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${draftOrder.status === 'approved' ? 'bg-green-100 text-green-800' :
                          draftOrder.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                          {draftOrder.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(draftOrder.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-3">
                          <button
                            onClick={() => {
                              setSelectedDraftOrder(draftOrder);
                              setViewDraftModalOpen(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 transition"
                            title="View Details"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          {draftOrder.status === 'draft' && (
                            <>
                              <button
                                onClick={() => handleApproveDraftOrder(draftOrder.id)}
                                className="text-green-600 hover:text-green-900 transition flex items-center gap-1"
                                disabled={approvingOrder === draftOrder.id}
                                title="Approve Order"
                              >
                                <CheckCircle className="h-5 w-5" />
                                {approvingOrder === draftOrder.id && <span className="text-xs">...</span>}
                              </button>
                              <button
                                onClick={() => handleRejectDraftOrder(draftOrder.id)}
                                className="text-red-600 hover:text-red-900 transition flex items-center gap-1"
                                disabled={rejectingOrder === draftOrder.id}
                                title="Reject Order"
                              >
                                <XCircle className="h-5 w-5" />
                                {rejectingOrder === draftOrder.id && <span className="text-xs">...</span>}
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDeleteDraftOrder(draftOrder.id)}
                            className="text-red-600 hover:text-red-900 transition"
                            title="Delete Draft Order"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Regular Orders Table */}
      {orderView === 'regular' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-400">Loading...</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-400">No orders found.</td></tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.order_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{order.user?.name || "N/A"}</div>
                          <div className="text-sm text-gray-500">{order.user?.email || "N/A"}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">₹{order.total_amount}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${order.status === 'approved' ? 'bg-green-100 text-green-800' :
                          order.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.payment_status}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-3">
                          <button
                            onClick={async () => {
                              // Ensure order_items are loaded before generating PDF
                              let orderWithItems = { ...order };

                              if (!order.order_items || order.order_items.length === 0) {
                                toast.warning('Loading order items...');
                                // Fetch order items for this specific order
                                const { data: orderItems, error } = await supabase
                                  .from("order_items")
                                  .select(`
                                  *,
                                  product:products(
                                    tax_type,
                                    tax_rate,
                                    hsn_code
                                  )
                                `)
                                  .eq("order_id", order.id);

                                if (error) {
                                  toast.error('Failed to load order items');
                                  return;
                                }

                                // Enrich items with tax/HSN data
                                const enrichedItems = (orderItems || []).map((item: any) => ({
                                  ...item,
                                  hsn_code: item.hsn_code || item.product?.hsn_code || null,
                                  tax_type: item.product?.tax_type || null,
                                  tax_rate: item.product?.tax_rate || null,
                                }));

                                // Create new order object with items
                                orderWithItems = {
                                  ...order,
                                  order_items: enrichedItems
                                };
                              }
                              await generateOrderPdf(orderWithItems);
                            }}
                            className="text-blue-600 hover:text-blue-900 transition"
                            title="Download PDF"
                          >
                            PDF
                          </button>
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setViewModalOpen(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 transition"
                            title="View Details"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleApprove(order.id)}
                            className="text-green-600 hover:text-green-900 transition"
                            disabled={order.status === 'approved'}
                            title="Approve Order"
                          >
                            <CheckCircle className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleReject(order.id)}
                            className="text-red-600 hover:text-red-900 transition"
                            disabled={order.status === 'rejected'}
                            title="Reject Order"
                          >
                            <XCircle className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(order.id)}
                            className="text-red-600 hover:text-red-900 transition flex items-center gap-1"
                            title="Delete Order"
                          >
                            <Trash2 className="h-4 w-4" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Returns Table */}
      {orderView === 'returns' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-red-50">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <h2 className="text-lg font-semibold text-gray-900">Sales Return Orders</h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Return Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Original Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Refund Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Return Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Refund Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Return Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loadingReturns ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-gray-400">
                      Loading return orders...
                    </td>
                  </tr>
                ) : returnOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-gray-400">
                      No return orders found.
                    </td>
                  </tr>
                ) : (
                  returnOrders.map((returnOrder) => (
                    <tr key={returnOrder.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{returnOrder.return_number}</div>
                        {returnOrder.return_reason && (
                          <div className="text-xs text-gray-500 mt-1">{returnOrder.return_reason.substring(0, 50)}...</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {returnOrder.order?.order_number || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{returnOrder.user?.name || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{returnOrder.user?.email || ''}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                        ₹{returnOrder.refund_amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${returnOrder.return_status === 'completed' ? 'bg-green-100 text-green-800' :
                          returnOrder.return_status === 'approved' ? 'bg-blue-100 text-blue-800' :
                            returnOrder.return_status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                          }`}>
                          {returnOrder.return_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${returnOrder.refund_status === 'completed' ? 'bg-green-100 text-green-800' :
                          returnOrder.refund_status === 'processed' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                          {returnOrder.refund_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(returnOrder.return_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => downloadReturnInvoice(returnOrder)}
                          className="text-red-600 hover:text-red-900 transition flex items-center gap-1"
                          title="Download Return Invoice PDF"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Return Invoice
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewDraftModalOpen && selectedDraftOrder && (
        <ViewDraftDetailsModal
          draftOrder={selectedDraftOrder!}
          onClose={() => {
            setViewDraftModalOpen(false);
            setSelectedDraftOrder(null);
          }}
        />
      )}

      {viewModalOpen && selectedOrder && (
        <ViewDetailsModal
          order={selectedOrder!}
          onClose={() => {
            setViewModalOpen(false);
            setSelectedOrder(null);
          }}
        />
      )}
      <ToastContainer />
    </div>
  );
};

export default OrderManagementPage;
