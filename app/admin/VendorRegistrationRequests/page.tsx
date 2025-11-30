"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { CheckCircle, XCircle, Eye, Clock, FileText } from "lucide-react";

type RegistrationRequest = {
  id: string;
  business_name: string;
  contact_name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  status: string;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  rejection_reason?: string;
  business_license_url?: string;
  gst_certificate_url?: string;
  pan_card_url?: string;
  bank_account_proof_url?: string;
  gstin?: string;
  pan?: string;
};

export default function VendorRegistrationRequestsPage() {
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("vendor_registration_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRequests((data as RegistrationRequest[]) || []);
    } catch (error: any) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    if (!confirm("Are you sure you want to approve this vendor registration? This will create a vendor account.")) {
      return;
    }

    setProcessing(true);
    try {
      // Get current user (admin)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get request details
      const { data: request, error: requestError } = await supabase
        .from("vendor_registration_requests")
        .select("*")
        .eq("id", requestId)
        .single();

      if (requestError || !request) throw requestError;

      // Create vendor record
      const { data: vendor, error: vendorError } = await supabase
        .from("vendors")
        .insert({
          name: request.business_name,
          email: request.email,
          phone: request.phone,
          location: `${request.city}, ${request.state}`,
          is_active: true,
          gstin: request.gstin || null,
          pan: request.pan || null,
          business_address: request.address_line1 + (request.address_line2 ? `, ${request.address_line2}` : ""),
          registration_request_id: requestId,
        })
        .select("id")
        .single();

      if (vendorError) throw vendorError;

      // Create user account with vendor role
      // Note: This should ideally be done via API route with service role key
      // For now, we'll update the request status and admin can create user manually
      const { error: updateError } = await supabase
        .from("vendor_registration_requests")
        .update({
          status: "approved",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          vendor_id: vendor.id,
        })
        .eq("id", requestId);

      if (updateError) throw updateError;

      alert("Vendor approved successfully! Please create a user account for this vendor.");
      fetchRequests();
      setSelectedRequest(null);
    } catch (error: any) {
      console.error("Error approving request:", error);
      alert(`Error approving request: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!rejectionReason.trim()) {
      alert("Please provide a rejection reason");
      return;
    }

    if (!confirm("Are you sure you want to reject this vendor registration?")) {
      return;
    }

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("vendor_registration_requests")
        .update({
          status: "rejected",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq("id", requestId);

      if (error) throw error;

      alert("Vendor registration rejected");
      fetchRequests();
      setSelectedRequest(null);
      setRejectionReason("");
    } catch (error: any) {
      console.error("Error rejecting request:", error);
      alert(`Error rejecting request: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800",
      under_review: "bg-blue-100 text-blue-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      on_hold: "bg-gray-100 text-gray-800",
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status as keyof typeof styles] || styles.pending}`}>
        {status.replace("_", " ").toUpperCase()}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Vendor Registration Requests</h1>
        <p className="text-gray-600">Review and approve vendor registration applications</p>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2"
        >
          <option value="all">All Requests</option>
          <option value="pending">Pending</option>
          <option value="under_review">Under Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Requests Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#F53F7A]"></div>
          <p className="mt-4 text-gray-600">Loading requests...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Business Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{request.business_name}</div>
                    {request.gstin && (
                      <div className="text-xs text-gray-500">GSTIN: {request.gstin}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{request.contact_name}</div>
                    <div className="text-xs text-gray-500">{request.email}</div>
                    <div className="text-xs text-gray-500">{request.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{request.city}, {request.state}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(request.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(request.created_at).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => setSelectedRequest(request)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      <Eye className="w-5 h-5 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Registration Details</h2>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Business Name</label>
                  <p className="text-gray-900">{selectedRequest.business_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Contact Name</label>
                  <p className="text-gray-900">{selectedRequest.contact_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <p className="text-gray-900">{selectedRequest.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Phone</label>
                  <p className="text-gray-900">{selectedRequest.phone}</p>
                </div>
                {selectedRequest.gstin && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">GSTIN</label>
                    <p className="text-gray-900">{selectedRequest.gstin}</p>
                  </div>
                )}
                {selectedRequest.pan && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">PAN</label>
                    <p className="text-gray-900">{selectedRequest.pan}</p>
                  </div>
                )}
              </div>

              {/* Documents */}
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Documents</h3>
                <div className="grid grid-cols-2 gap-4">
                  {selectedRequest.business_license_url && (
                    <a
                      href={selectedRequest.business_license_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                    >
                      <FileText className="w-4 h-4" />
                      Business License
                    </a>
                  )}
                  {selectedRequest.gst_certificate_url && (
                    <a
                      href={selectedRequest.gst_certificate_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                    >
                      <FileText className="w-4 h-4" />
                      GST Certificate
                    </a>
                  )}
                  {selectedRequest.pan_card_url && (
                    <a
                      href={selectedRequest.pan_card_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                    >
                      <FileText className="w-4 h-4" />
                      PAN Card
                    </a>
                  )}
                  {selectedRequest.bank_account_proof_url && (
                    <a
                      href={selectedRequest.bank_account_proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                    >
                      <FileText className="w-4 h-4" />
                      Bank Account Proof
                    </a>
                  )}
                </div>
              </div>

              {/* Actions */}
              {selectedRequest.status === "pending" && (
                <div className="border-t pt-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rejection Reason (if rejecting)
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Enter reason for rejection..."
                    />
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleApprove(selectedRequest.id)}
                      disabled={processing}
                      className="flex-1 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(selectedRequest.id)}
                      disabled={processing || !rejectionReason.trim()}
                      className="flex-1 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-5 h-5" />
                      Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

