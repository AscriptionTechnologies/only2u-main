"use client";

import React, { useState, useEffect } from "react";
import { Eye, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { supabase } from "../../../lib/supabase";
import { generateOrderPdf } from "../../../lib/pdfUtils";

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

const OrderManagementPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [draftOrders, setDraftOrders] = useState<DraftOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedDraftOrder, setSelectedDraftOrder] = useState<DraftOrder | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewDraftModalOpen, setViewDraftModalOpen] = useState(false);
  const [orderView, setOrderView] = useState<'regular' | 'draft'>('draft'); // Default to draft orders
  const [approvingOrder, setApprovingOrder] = useState<string | null>(null);
  const [rejectingOrder, setRejectingOrder] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
    fetchDraftOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Fetch orders with user information
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(`
          *,
          user:users(name, email, phone)
        `)
        .order("created_at", { ascending: false });

      if (ordersError) {
        console.error("Error fetching orders:", ordersError);
        toast.error("Failed to fetch orders");
        return;
      }

      // Fetch order items for all orders
      const { data: orderItemsData, error: itemsError } = await supabase
        .from("order_items")
        .select("*");

      if (itemsError) {
        console.error("Error fetching order items:", itemsError);
        toast.error("Failed to fetch order items");
        return;
      }

      // Combine orders with their items
      const ordersWithItems = (ordersData || []).map((order: Order) => ({
        ...order,
        order_items: (orderItemsData || []).filter(
          (item: OrderItem) => item.order_id === order.id
        ),
      }));

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
          user:users(name, email, phone)
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
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                    draftOrder.status === 'approved' ? 'bg-green-100 text-green-800' :
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
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                    order.status === 'approved' ? 'bg-green-100 text-green-800' :
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
              onClick={() => generateOrderPdf(order)}
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
        <div className="flex gap-2 items-center">
          <span className="text-sm text-gray-600">
            {orderView === 'draft' 
              ? `${draftOrders.filter(o => o.status === 'draft').length} pending draft orders`
              : `${orders.length} total orders`
            }
          </span>
        </div>
      </div>

      {/* Order Type Filter Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setOrderView('draft')}
              className={`${
                orderView === 'draft'
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
              className={`${
                orderView === 'regular'
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
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          draftOrder.status === 'approved' ? 'bg-green-100 text-green-800' :
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
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        order.status === 'approved' ? 'bg-green-100 text-green-800' :
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
                          onClick={() => generateOrderPdf(order)}
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
