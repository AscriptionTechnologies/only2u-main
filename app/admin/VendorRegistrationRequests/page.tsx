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

// Mock data for demonstration when database is empty
const MOCK_VENDOR_REQUESTS: RegistrationRequest[] = [
  {
    id: "mock-1",
    business_name: "Saree Palace Boutique",
    contact_name: "Rajesh Kumar",
    email: "rajesh@sareepalace.com",
    phone: "+91 98765 11111",
    city: "Bengaluru",
    state: "Karnataka",
    status: "pending",
    created_at: "2026-01-28T08:00:00Z",
    gstin: "29AABCS1234A1Z5",
    pan: "AABCS1234A",
  },
  {
    id: "mock-2",
    business_name: "Ethnic Threads India",
    contact_name: "Sunita Devi",
    email: "sunita@ethnicthreads.in",
    phone: "+91 87654 22222",
    city: "Jaipur",
    state: "Rajasthan",
    status: "pending",
    created_at: "2026-01-27T14:30:00Z",
    gstin: "08AABCE5678B1Z3",
    pan: "AABCE5678B",
  },
  {
    id: "mock-3",
    business_name: "Chennai Silks Exporters",
    contact_name: "Lakshmi Narayanan",
    email: "lakshmi@chennaisilks.com",
    phone: "+91 76543 33333",
    city: "Chennai",
    state: "Tamil Nadu",
    status: "under_review",
    created_at: "2026-01-26T10:15:00Z",
    gstin: "33AABCD9012C1Z1",
    pan: "AABCD9012C",
  },
  {
    id: "mock-4",
    business_name: "Lucknowi Chikan House",
    contact_name: "Mohammad Imran",
    email: "imran@chikanhouse.in",
    phone: "+91 65432 44444",
    city: "Lucknow",
    state: "Uttar Pradesh",
    status: "approved",
    created_at: "2026-01-20T09:00:00Z",
    reviewed_at: "2026-01-21T11:00:00Z",
    gstin: "09AABCL3456D1Z9",
    pan: "AABCL3456D",
  },
  {
    id: "mock-5",
    business_name: "Gujarat Handicrafts",
    contact_name: "Bhavesh Patel",
    email: "bhavesh@gujhandicrafts.com",
    phone: "+91 54321 55555",
    city: "Ahmedabad",
    state: "Gujarat",
    status: "rejected",
    created_at: "2026-01-18T15:45:00Z",
    reviewed_at: "2026-01-19T12:00:00Z",
    rejection_reason: "Incomplete documentation. Missing GST certificate.",
  },
];

export default function VendorRegistrationRequestsPage() {
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [useMockData, setUseMockData] = useState(false);

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

      // If no data from database, use mock data for demonstration
      if (!data || data.length === 0) {
        setUseMockData(true);
        const filteredMock = statusFilter === "all"
          ? MOCK_VENDOR_REQUESTS
          : MOCK_VENDOR_REQUESTS.filter(r => r.status === statusFilter);
        setRequests(filteredMock);
      } else {
        setUseMockData(false);
        setRequests((data as RegistrationRequest[]) || []);
      }
    } catch (error: any) {
      console.error("Error fetching requests:", error);
      // On error, show mock data
      setUseMockData(true);
      const filteredMock = statusFilter === "all"
        ? MOCK_VENDOR_REQUESTS
        : MOCK_VENDOR_REQUESTS.filter(r => r.status === statusFilter);
      setRequests(filteredMock);
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

      {/* Mock data indicator */}
      {useMockData && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-600" />
          <div>
            <p className="text-amber-800 font-medium">Demo Data</p>
            <p className="text-amber-700 text-sm">Showing sample vendor requests for demonstration. Real requests will appear here when submitted through the app.</p>
          </div>
        </div>
      )}

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

