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

const OrderManagementPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  useEffect(() => {
    fetchOrders();
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
      </div>
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
      
      {viewModalOpen && selectedOrder && (
        <ViewDetailsModal
          order={selectedOrder}
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
