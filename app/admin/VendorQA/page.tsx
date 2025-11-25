"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { Search, MessageCircle, CheckCircle, XCircle, Eye, EyeOff, Trash2, Filter } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface Question {
  id: string;
  product_id: string;
  vendor_id: string;
  customer_id: string;
  question_text: string;
  is_answered: boolean;
  is_approved: boolean;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
  product?: {
    name: string;
    id: string;
  };
  vendor?: {
    name: string;
    email: string;
  };
  customer?: {
    name: string;
    email: string;
  };
  answers?: Answer[];
}

interface Answer {
  id: string;
  question_id: string;
  vendor_id: string;
  answer_text: string;
  is_approved: boolean;
  is_visible: boolean;
  created_at: string;
  vendor?: {
    name: string;
    email: string;
  };
}

const VendorQAPage = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'answered' | 'unanswered'>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  useEffect(() => {
    fetchQuestionsAndAnswers();
  }, []);

  const fetchQuestionsAndAnswers = async () => {
    setLoading(true);
    try {
      // Fetch questions with related data
      const { data: questionsData, error: questionsError } = await supabase
        .from("vendor_questions")
        .select(`
          *,
          product:products(id, name),
          vendor:vendor_id(name, email),
          customer:customer_id(name, email)
        `)
        .order("created_at", { ascending: false });

      if (questionsError) {
        console.error("Error fetching questions:", questionsError);
        toast.error("Failed to fetch questions");
        return;
      }

      // Fetch all answers
      const { data: answersData, error: answersError } = await supabase
        .from("vendor_answers")
        .select(`
          *,
          vendor:vendor_id(name, email)
        `)
        .order("created_at", { ascending: true });

      if (answersError) {
        console.error("Error fetching answers:", answersError);
        toast.error("Failed to fetch answers");
        return;
      }

      // Combine questions with their answers
      const questionsWithAnswers = (questionsData || []).map((q: any) => ({
        ...q,
        answers: (answersData || []).filter((a: any) => a.question_id === q.id),
      }));

      setQuestions(questionsWithAnswers);
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred while fetching Q&A data");
    } finally {
      setLoading(false);
    }
  };

  const toggleQuestionVisibility = async (questionId: string, currentVisibility: boolean) => {
    try {
      const { error } = await supabase
        .from("vendor_questions")
        .update({ is_visible: !currentVisibility })
        .eq("id", questionId);

      if (error) {
        console.error("Error updating question visibility:", error);
        toast.error("Failed to update visibility");
        return;
      }

      setQuestions(prev =>
        prev.map(q =>
          q.id === questionId ? { ...q, is_visible: !currentVisibility } : q
        )
      );
      toast.success(
        `Question ${!currentVisibility ? "shown" : "hidden"} successfully`
      );
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred");
    }
  };

  const toggleQuestionApproval = async (questionId: string, currentApproval: boolean) => {
    try {
      const { error } = await supabase
        .from("vendor_questions")
        .update({ is_approved: !currentApproval })
        .eq("id", questionId);

      if (error) {
        console.error("Error updating question approval:", error);
        toast.error("Failed to update approval");
        return;
      }

      setQuestions(prev =>
        prev.map(q =>
          q.id === questionId ? { ...q, is_approved: !currentApproval } : q
        )
      );
      toast.success(
        `Question ${!currentApproval ? "approved" : "unapproved"} successfully`
      );
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred");
    }
  };

  const toggleAnswerVisibility = async (answerId: string, currentVisibility: boolean) => {
    try {
      const { error } = await supabase
        .from("vendor_answers")
        .update({ is_visible: !currentVisibility })
        .eq("id", answerId);

      if (error) {
        console.error("Error updating answer visibility:", error);
        toast.error("Failed to update visibility");
        return;
      }

      // Update local state
      setQuestions(prev =>
        prev.map(q => ({
          ...q,
          answers: q.answers?.map(a =>
            a.id === answerId ? { ...a, is_visible: !currentVisibility } : a
          ),
        }))
      );
      toast.success(
        `Answer ${!currentVisibility ? "shown" : "hidden"} successfully`
      );
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred");
    }
  };

  const deleteQuestion = async (questionId: string) => {
    if (typeof window !== 'undefined' && !window.confirm("Are you sure you want to delete this question and all its answers?")) return;

    try {
      // Answers will be deleted automatically due to CASCADE
      const { error } = await supabase
        .from("vendor_questions")
        .delete()
        .eq("id", questionId);

      if (error) {
        console.error("Error deleting question:", error);
        toast.error("Failed to delete question");
        return;
      }

      setQuestions(prev => prev.filter(q => q.id !== questionId));
      toast.success("Question deleted successfully");
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred while deleting question");
    }
  };

  const deleteAnswer = async (answerId: string, questionId: string) => {
    if (typeof window !== 'undefined' && !window.confirm("Are you sure you want to delete this answer?")) return;

    try {
      const { error } = await supabase
        .from("vendor_answers")
        .delete()
        .eq("id", answerId);

      if (error) {
        console.error("Error deleting answer:", error);
        toast.error("Failed to delete answer");
        return;
      }

      setQuestions(prev =>
        prev.map(q =>
          q.id === questionId
            ? { ...q, answers: q.answers?.filter(a => a.id !== answerId) }
            : q
        )
      );
      toast.success("Answer deleted successfully");
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred while deleting answer");
    }
  };

  // Filter questions based on search and filters
  const filteredQuestions = questions.filter((question) => {
    const matchesSearch =
      question.question_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      question.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      question.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      question.vendor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      question.answers?.some(a =>
        a.answer_text.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'answered' && question.is_answered) ||
      (statusFilter === 'unanswered' && !question.is_answered);

    const matchesVisibility =
      visibilityFilter === 'all' ||
      (visibilityFilter === 'visible' && question.is_visible) ||
      (visibilityFilter === 'hidden' && !question.is_visible);

    return matchesSearch && matchesStatus && matchesVisibility;
  });

  const ViewQuestionModal = ({ question, onClose }: { question: Question; onClose: () => void }) => {
    if (!question) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#F53F7A] to-[#F53F7A]/90 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Q&A Details</h2>
                <p className="text-sm text-white/80 mt-1">
                  {question.product?.name || "Product N/A"}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/20 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Question Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                  Q
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">{question.customer?.name || "Customer"}</p>
                      <p className="text-xs text-gray-500">{question.customer?.email || ""}</p>
                    </div>
                    <div className="flex gap-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        question.is_approved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {question.is_approved ? 'Approved' : 'Pending'}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        question.is_visible ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {question.is_visible ? 'Visible' : 'Hidden'}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-800 text-sm leading-relaxed">{question.question_text}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(question.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Answers Section */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-green-600" />
                Answers ({question.answers?.length || 0})
              </h3>
              {question.answers && question.answers.length > 0 ? (
                <div className="space-y-3">
                  {question.answers.map((answer) => (
                    <div key={answer.id} className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-semibold">
                          A
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-semibold text-gray-900">{answer.vendor?.name || "Vendor"}</p>
                              <p className="text-xs text-gray-500">{answer.vendor?.email || ""}</p>
                            </div>
                            <div className="flex gap-2">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                answer.is_approved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {answer.is_approved ? 'Approved' : 'Pending'}
                              </span>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                answer.is_visible ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {answer.is_visible ? 'Visible' : 'Hidden'}
                              </span>
                            </div>
                          </div>
                          <p className="text-gray-800 text-sm leading-relaxed">{answer.answer_text}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(answer.created_at).toLocaleString()}
                          </p>
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => toggleAnswerVisibility(answer.id, answer.is_visible)}
                              className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                            >
                              {answer.is_visible ? 'Hide' : 'Show'}
                            </button>
                            <button
                              onClick={() => deleteAnswer(answer.id, question.id)}
                              className="text-xs px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <MessageCircle className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No answers yet</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => toggleQuestionVisibility(question.id, question.is_visible)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {question.is_visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {question.is_visible ? 'Hide Question' : 'Show Question'}
              </button>
              <button
                onClick={() => toggleQuestionApproval(question.id, question.is_approved)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {question.is_approved ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                {question.is_approved ? 'Unapprove' : 'Approve'}
              </button>
              <button
                onClick={() => {
                  deleteQuestion(question.id);
                  onClose();
                }}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Q&A Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            View and manage all questions and answers between customers and vendors
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600">
            {filteredQuestions.length} question(s) • {filteredQuestions.filter(q => !q.is_answered).length} unanswered
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">Search & Filters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F53F7A] focus:border-transparent"
                placeholder="Search questions, answers, products, users..."
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F53F7A] focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="answered">Answered</option>
              <option value="unanswered">Unanswered</option>
            </select>
          </div>

          {/* Visibility Filter */}
          <div>
            <select
              value={visibilityFilter}
              onChange={(e) => setVisibilityFilter(e.target.value as any)}
              className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F53F7A] focus:border-transparent"
            >
              <option value="all">All Visibility</option>
              <option value="visible">Visible Only</option>
              <option value="hidden">Hidden Only</option>
            </select>
          </div>
        </div>

        {/* Clear Filters */}
        {(searchTerm || statusFilter !== 'all' || visibilityFilter !== 'all') && (
          <button
            onClick={() => {
              setSearchTerm("");
              setStatusFilter('all');
              setVisibilityFilter('all');
            }}
            className="mt-4 text-sm text-[#F53F7A] hover:text-[#F53F7A]/80 font-medium"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Questions</p>
              <p className="text-2xl font-bold text-gray-900">{questions.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">Unanswered</p>
              <p className="text-2xl font-bold text-amber-600">
                {questions.filter(q => !q.is_answered).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Answered</p>
              <p className="text-2xl font-bold text-green-600">
                {questions.filter(q => q.is_answered).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Eye className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Visible</p>
              <p className="text-2xl font-bold text-purple-600">
                {questions.filter(q => q.is_visible).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Answers</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F53F7A] mx-auto mb-2"></div>
                    Loading...
                  </td>
                </tr>
              ) : filteredQuestions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-400">
                    {searchTerm || statusFilter !== 'all' || visibilityFilter !== 'all'
                      ? "No questions found matching your filters."
                      : "No questions and answers yet."}
                  </td>
                </tr>
              ) : (
                filteredQuestions.map((question) => (
                  <tr key={question.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {question.product?.name || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {question.customer?.name || "N/A"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {question.customer?.email || ""}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate" title={question.question_text}>
                        {question.question_text}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {question.vendor?.name || "Unassigned"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className={`px-2 py-1 text-xs rounded-full text-center ${
                          question.is_answered
                            ? 'bg-green-100 text-green-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {question.is_answered ? 'Answered' : 'Pending'}
                        </span>
                        {!question.is_visible && (
                          <span className="px-2 py-1 text-xs rounded-full text-center bg-gray-100 text-gray-800">
                            Hidden
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                        {question.answers?.length || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(question.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedQuestion(question);
                            setViewModalOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 transition"
                          title="View Details"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => toggleQuestionVisibility(question.id, question.is_visible)}
                          className={`${
                            question.is_visible
                              ? 'text-orange-600 hover:text-orange-900'
                              : 'text-green-600 hover:text-green-900'
                          } transition`}
                          title={question.is_visible ? 'Hide' : 'Show'}
                        >
                          {question.is_visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                        <button
                          onClick={() => toggleQuestionApproval(question.id, question.is_approved)}
                          className={`${
                            question.is_approved
                              ? 'text-red-600 hover:text-red-900'
                              : 'text-green-600 hover:text-green-900'
                          } transition`}
                          title={question.is_approved ? 'Unapprove' : 'Approve'}
                        >
                          {question.is_approved ? <XCircle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                        </button>
                        <button
                          onClick={() => deleteQuestion(question.id)}
                          className="text-red-600 hover:text-red-900 transition"
                          title="Delete"
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

      {/* View Details Modal */}
      {viewModalOpen && selectedQuestion && (
        <ViewQuestionModal
          question={selectedQuestion}
          onClose={() => {
            setViewModalOpen(false);
            setSelectedQuestion(null);
          }}
        />
      )}

      <ToastContainer />
    </div>
  );
};

export default VendorQAPage;

