"use client";

import { useState } from "react";
import { CheckCircle, XCircle, Eye, Clock, Instagram, Youtube, Twitter, ExternalLink, Users } from "lucide-react";

type InfluencerRequest = {
    id: string;
    name: string;
    email: string;
    phone: string;
    instagram_handle?: string;
    youtube_handle?: string;
    tiktok_handle?: string;
    twitter_handle?: string;
    total_followers: number;
    city: string;
    state: string;
    bio: string;
    status: string;
    created_at: string;
    reviewed_at?: string;
    reviewed_by?: string;
    rejection_reason?: string;
    profile_photo?: string;
    niche?: string;
};

// Mock data for pending influencer requests
const MOCK_REQUESTS: InfluencerRequest[] = [
    {
        id: "1",
        name: "Priya Sharma",
        email: "priya.sharma@gmail.com",
        phone: "+91 98765 43210",
        instagram_handle: "@priya_fashion_diary",
        youtube_handle: "PriyaFashionVlogs",
        total_followers: 125000,
        city: "Mumbai",
        state: "Maharashtra",
        bio: "Fashion & lifestyle content creator. Love exploring ethnic wear and fusion styles. 5+ years of content creation experience.",
        status: "pending",
        created_at: "2026-01-28T05:30:00Z",
        profile_photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop",
        niche: "Fashion & Lifestyle",
    },
    {
        id: "2",
        name: "Rahul Verma",
        email: "rahul.verma@outlook.com",
        phone: "+91 87654 32109",
        instagram_handle: "@rahul_mens_style",
        twitter_handle: "@rahulverma",
        total_followers: 85000,
        city: "Delhi",
        state: "Delhi",
        bio: "Men's fashion influencer | Brand collaborations | Street style photographer",
        status: "pending",
        created_at: "2026-01-27T14:45:00Z",
        profile_photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
        niche: "Men's Fashion",
    },
    {
        id: "3",
        name: "Ananya Reddy",
        email: "ananya.reddy@yahoo.com",
        phone: "+91 76543 21098",
        instagram_handle: "@ananya_saree_stories",
        youtube_handle: "AnanyaSareeCollection",
        tiktok_handle: "@ananya_sarees",
        total_followers: 250000,
        city: "Hyderabad",
        state: "Telangana",
        bio: "Saree lover | Traditional wear enthusiast | Helping women find their perfect drape. Featured in Elle India & Femina.",
        status: "pending",
        created_at: "2026-01-26T09:15:00Z",
        profile_photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop",
        niche: "Traditional Wear",
    },
    {
        id: "4",
        name: "Vikram Patel",
        email: "vikram.patel@gmail.com",
        phone: "+91 65432 10987",
        instagram_handle: "@vikram_fitness_fashion",
        youtube_handle: "VikramFitStyle",
        total_followers: 180000,
        city: "Ahmedabad",
        state: "Gujarat",
        bio: "Fitness + Fashion = My mantra. Activewear reviews, gym fashion, and healthy lifestyle tips.",
        status: "under_review",
        created_at: "2026-01-25T11:30:00Z",
        profile_photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop",
        niche: "Fitness & Activewear",
    },
    {
        id: "5",
        name: "Meera Krishnan",
        email: "meera.k@gmail.com",
        phone: "+91 54321 09876",
        instagram_handle: "@meera_budget_fashion",
        youtube_handle: "MeeraBudgetBeauty",
        total_followers: 320000,
        city: "Chennai",
        state: "Tamil Nadu",
        bio: "Affordable fashion finds | Budget styling tips | Student-friendly outfits. Making fashion accessible to everyone!",
        status: "approved",
        created_at: "2026-01-20T08:00:00Z",
        reviewed_at: "2026-01-21T10:00:00Z",
        profile_photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop",
        niche: "Budget Fashion",
    },
    {
        id: "6",
        name: "Arjun Singh",
        email: "arjun.singh@hotmail.com",
        phone: "+91 43210 98765",
        instagram_handle: "@arjun_ethnic_king",
        total_followers: 45000,
        city: "Jaipur",
        state: "Rajasthan",
        bio: "Ethnic wear for men | Kurta styling | Wedding fashion",
        status: "rejected",
        created_at: "2026-01-18T16:20:00Z",
        reviewed_at: "2026-01-19T09:00:00Z",
        rejection_reason: "Follower count below minimum threshold (50,000). Please reapply after growing your audience.",
        profile_photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop",
        niche: "Men's Ethnic Wear",
    },
];

export default function InfluencerRequestsPage() {
    const [requests, setRequests] = useState<InfluencerRequest[]>(MOCK_REQUESTS);
    const [selectedRequest, setSelectedRequest] = useState<InfluencerRequest | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [rejectionReason, setRejectionReason] = useState("");
    const [processing, setProcessing] = useState(false);

    const filteredRequests = statusFilter === "all"
        ? requests
        : requests.filter(r => r.status === statusFilter);

    const handleApprove = async (requestId: string) => {
        if (!confirm("Are you sure you want to approve this influencer? This will create an influencer profile.")) {
            return;
        }

        setProcessing(true);
        // Simulate API call
        setTimeout(() => {
            setRequests(prev =>
                prev.map(r => r.id === requestId
                    ? { ...r, status: "approved", reviewed_at: new Date().toISOString() }
                    : r
                )
            );
            alert("Influencer approved successfully! Profile has been created.");
            setSelectedRequest(null);
            setProcessing(false);
        }, 1000);
    };

    const handleReject = async (requestId: string) => {
        if (!rejectionReason.trim()) {
            alert("Please provide a rejection reason");
            return;
        }

        if (!confirm("Are you sure you want to reject this influencer application?")) {
            return;
        }

        setProcessing(true);
        // Simulate API call
        setTimeout(() => {
            setRequests(prev =>
                prev.map(r => r.id === requestId
                    ? { ...r, status: "rejected", reviewed_at: new Date().toISOString(), rejection_reason: rejectionReason }
                    : r
                )
            );
            alert("Influencer application rejected");
            setSelectedRequest(null);
            setRejectionReason("");
            setProcessing(false);
        }, 1000);
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            pending: "bg-yellow-100 text-yellow-800",
            under_review: "bg-blue-100 text-blue-800",
            approved: "bg-green-100 text-green-800",
            rejected: "bg-red-100 text-red-800",
        };

        return (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status as keyof typeof styles] || styles.pending}`}>
                {status.replace("_", " ").toUpperCase()}
            </span>
        );
    };

    const formatFollowers = (count: number) => {
        if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
        if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
        return count.toString();
    };

    const pendingCount = requests.filter(r => r.status === "pending").length;
    const approvedCount = requests.filter(r => r.status === "approved").length;
    const rejectedCount = requests.filter(r => r.status === "rejected").length;

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Influencer Requests</h1>
                <p className="text-gray-600">Review and approve influencer registration applications</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Pending</p>
                            <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
                        </div>
                        <Clock className="w-8 h-8 text-yellow-500" />
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Under Review</p>
                            <p className="text-2xl font-bold text-blue-600">{requests.filter(r => r.status === "under_review").length}</p>
                        </div>
                        <Eye className="w-8 h-8 text-blue-500" />
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Approved</p>
                            <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
                        </div>
                        <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Rejected</p>
                            <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
                        </div>
                        <XCircle className="w-8 h-8 text-red-500" />
                    </div>
                </div>
            </div>

            {/* Filter */}
            <div className="mb-6">
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-4 py-2 bg-white"
                >
                    <option value="all">All Requests ({requests.length})</option>
                    <option value="pending">Pending ({pendingCount})</option>
                    <option value="under_review">Under Review</option>
                    <option value="approved">Approved ({approvedCount})</option>
                    <option value="rejected">Rejected ({rejectedCount})</option>
                </select>
            </div>

            {/* Requests Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Influencer
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Social Handles
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Followers
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Niche
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
                        {filteredRequests.map((request) => (
                            <tr key={request.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-10 w-10">
                                            {request.profile_photo ? (
                                                <img
                                                    className="h-10 w-10 rounded-full object-cover"
                                                    src={request.profile_photo}
                                                    alt={request.name}
                                                />
                                            ) : (
                                                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                                    <Users className="h-5 w-5 text-gray-500" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-900">{request.name}</div>
                                            <div className="text-xs text-gray-500">{request.city}, {request.state}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        {request.instagram_handle && (
                                            <span className="inline-flex items-center text-pink-600" title={request.instagram_handle}>
                                                <Instagram className="w-4 h-4" />
                                            </span>
                                        )}
                                        {request.youtube_handle && (
                                            <span className="inline-flex items-center text-red-600" title={request.youtube_handle}>
                                                <Youtube className="w-4 h-4" />
                                            </span>
                                        )}
                                        {request.twitter_handle && (
                                            <span className="inline-flex items-center text-blue-400" title={request.twitter_handle}>
                                                <Twitter className="w-4 h-4" />
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-semibold text-gray-900">
                                        {formatFollowers(request.total_followers)}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                                        {request.niche || "General"}
                                    </span>
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
                                        className="text-blue-600 hover:text-blue-900"
                                    >
                                        <Eye className="w-5 h-5 inline" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredRequests.length === 0 && (
                    <div className="text-center py-12">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No influencer requests found</p>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedRequest && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                                {selectedRequest.profile_photo ? (
                                    <img
                                        className="h-16 w-16 rounded-full object-cover"
                                        src={selectedRequest.profile_photo}
                                        alt={selectedRequest.name}
                                    />
                                ) : (
                                    <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                                        <Users className="h-8 w-8 text-gray-500" />
                                    </div>
                                )}
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">{selectedRequest.name}</h2>
                                    <p className="text-gray-500">{selectedRequest.niche}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedRequest(null)}
                                className="text-gray-400 hover:text-gray-600 text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Contact Info */}
                            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Email</label>
                                    <p className="text-gray-900">{selectedRequest.email}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Phone</label>
                                    <p className="text-gray-900">{selectedRequest.phone}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Location</label>
                                    <p className="text-gray-900">{selectedRequest.city}, {selectedRequest.state}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Total Followers</label>
                                    <p className="text-gray-900 font-semibold">{formatFollowers(selectedRequest.total_followers)}</p>
                                </div>
                            </div>

                            {/* Bio */}
                            <div>
                                <label className="text-sm font-medium text-gray-500">Bio</label>
                                <p className="text-gray-900 mt-1">{selectedRequest.bio}</p>
                            </div>

                            {/* Social Handles */}
                            <div>
                                <h3 className="font-medium text-gray-900 mb-3">Social Media Profiles</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {selectedRequest.instagram_handle && (
                                        <a
                                            href={`https://instagram.com/${selectedRequest.instagram_handle.replace('@', '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-pink-600 hover:text-pink-700 bg-pink-50 p-3 rounded-lg"
                                        >
                                            <Instagram className="w-5 h-5" />
                                            <span>{selectedRequest.instagram_handle}</span>
                                            <ExternalLink className="w-4 h-4 ml-auto" />
                                        </a>
                                    )}
                                    {selectedRequest.youtube_handle && (
                                        <a
                                            href={`https://youtube.com/@${selectedRequest.youtube_handle}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-red-600 hover:text-red-700 bg-red-50 p-3 rounded-lg"
                                        >
                                            <Youtube className="w-5 h-5" />
                                            <span>{selectedRequest.youtube_handle}</span>
                                            <ExternalLink className="w-4 h-4 ml-auto" />
                                        </a>
                                    )}
                                    {selectedRequest.twitter_handle && (
                                        <a
                                            href={`https://twitter.com/${selectedRequest.twitter_handle.replace('@', '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-blue-400 hover:text-blue-500 bg-blue-50 p-3 rounded-lg"
                                        >
                                            <Twitter className="w-5 h-5" />
                                            <span>{selectedRequest.twitter_handle}</span>
                                            <ExternalLink className="w-4 h-4 ml-auto" />
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* Rejection reason if rejected */}
                            {selectedRequest.status === "rejected" && selectedRequest.rejection_reason && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <h4 className="text-sm font-medium text-red-800 mb-1">Rejection Reason</h4>
                                    <p className="text-red-700">{selectedRequest.rejection_reason}</p>
                                </div>
                            )}

                            {/* Actions */}
                            {(selectedRequest.status === "pending" || selectedRequest.status === "under_review") && (
                                <div className="border-t pt-6 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Rejection Reason (required if rejecting)
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
                                            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                                        >
                                            <CheckCircle className="w-5 h-5" />
                                            Approve & Create Profile
                                        </button>
                                        <button
                                            onClick={() => handleReject(selectedRequest.id)}
                                            disabled={processing || !rejectionReason.trim()}
                                            className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                                        >
                                            <XCircle className="w-5 h-5" />
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Status for approved */}
                            {selectedRequest.status === "approved" && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                        <span className="text-green-800 font-medium">Approved</span>
                                    </div>
                                    {selectedRequest.reviewed_at && (
                                        <p className="text-green-700 text-sm mt-1">
                                            Approved on {new Date(selectedRequest.reviewed_at).toLocaleDateString("en-IN")}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
