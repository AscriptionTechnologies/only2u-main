"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Feedback = {
    id: string;
    user_id: string | null;
    feedback_text: string;
    status: "pending" | "approved" | "rejected";
    created_at: string;
};

export default function FeedbackPage() {
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchFeedbacks();
    }, []);

    const fetchFeedbacks = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("app_feedbacks")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching feedbacks:", error);
            setError("Failed to load feedbacks.");
        } else {
            setFeedbacks((data as Feedback[]) || []);
        }
        setLoading(false);
    };

    const updateStatus = async (id: string, newStatus: "approved" | "rejected") => {
        const { error } = await supabase
            .from("app_feedbacks")
            .update({ status: newStatus })
            .eq("id", id);

        if (error) {
            console.error("Error updating status:", error);
            alert("Failed to update status.");
        } else {
            fetchFeedbacks();
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">Feedback Approval</h1>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">{error}</div>
            )}

            {loading ? (
                <p className="text-gray-500">Loading...</p>
            ) : feedbacks.length === 0 ? (
                <div className="bg-white p-8 rounded-xl shadow-sm text-center text-gray-500">
                    No feedback found.
                </div>
            ) : (
                <div className="grid gap-4">
                    {feedbacks.map((item) => (
                        <div
                            key={item.id}
                            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span
                                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${item.status === "approved"
                                                ? "bg-green-100 text-green-700"
                                                : item.status === "rejected"
                                                    ? "bg-red-100 text-red-700"
                                                    : "bg-amber-100 text-amber-700"
                                            }`}
                                    >
                                        {item.status.toUpperCase()}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {new Date(item.created_at).toLocaleString()}
                                    </span>
                                </div>
                                <p className="text-gray-800 text-sm whitespace-pre-wrap">
                                    {item.feedback_text}
                                </p>
                                {item.user_id && (
                                    <p className="text-xs text-gray-400 mt-1">User: {item.user_id}</p>
                                )}
                            </div>

                            {item.status === "pending" && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => updateStatus(item.id, "approved")}
                                        className="px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 text-sm font-medium transition"
                                    >
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => updateStatus(item.id, "rejected")}
                                        className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium transition"
                                    >
                                        Reject
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
