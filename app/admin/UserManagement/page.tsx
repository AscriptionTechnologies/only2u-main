"use client";
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../../../lib/supabase";
import { uploadFile } from "../../../lib/uploadUtils";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  location?: string;
  phone?: string;
  profilePhoto?: string;
  skinTone?: string;
  waistSize?: number;
  bustSize?: number;
  hipSize?: number;
  size?: string;
  height?: number;
  weight?: number;
  coin_balance?: number;
  last_login?: string;
}

const roles = ["admin", "editor", "user"];

const UserMang = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
    is_active: true,
    location: "",
    phone: "",
    profilePhoto: "",
    skinTone: "",
    waistSize: 0,
    bustSize: 0,
    hipSize: 0,
    size: "",
    height: 0,
    weight: 0,
    coin_balance: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("users")
      .select("id, name, email, role, is_active, location, phone, profilePhoto, skinTone")
      .order("created_at", { ascending: false });
    if (!error) setUsers((data as User[]) || []);
    setLoading(false);
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setFormData({ 
      name: "", 
      email: "", 
      password: "", 
      role: "user", 
      is_active: true,
      location: "",
      phone: "",
      profilePhoto: "",
      skinTone: "",
      waistSize: 0,
      bustSize: 0,
      hipSize: 0,
      size: "",
      height: 0,
      weight: 0,
      coin_balance: 0,
    });
    setModalVisible(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      is_active: user.is_active,
      location: user.location || "",
      phone: user.phone || "",
      profilePhoto: user.profilePhoto || "",
      skinTone: user.skinTone || "",
      waistSize: user.waistSize || 0,
      bustSize: user.bustSize || 0,
      hipSize: user.hipSize || 0,
      size: user.size || "",
      height: user.height || 0,
      weight: user.weight || 0,
      coin_balance: user.coin_balance || 0,
    });
    setModalVisible(true);
  };

  const handleDeleteUser = async (user: User) => {
    if (typeof window !== 'undefined' && !window.confirm(`Delete user "${user.name}"?`)) return;
    setSubmitting(true);
    const { error } = await supabase.from("users").delete().eq("id", user.id);
    setSubmitting(false);
    if (!error) fetchUsers();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    if (editingUser) {
      // Update user - only update the users table since auth is already created
      const { error } = await supabase.from("users").update({
        name: formData.name,
        email: formData.email,
        role: formData.role,
        is_active: formData.is_active,
        location: formData.location,
        phone: formData.phone,
        profilePhoto: formData.profilePhoto,
        skinTone: formData.skinTone,
        waistSize: formData.waistSize,
        bustSize: formData.bustSize,
        hipSize: formData.hipSize,
        size: formData.size,
        height: formData.height,
        weight: formData.weight,
        coin_balance: formData.coin_balance,
      }).eq("id", editingUser.id);
      setSubmitting(false);
      if (!error) {
        setModalVisible(false);
        fetchUsers();
      } else {
        console.log(error, "error updating user");
      }
    } else {
      // Add new user - use API route to create authenticated user
      try {
        const response = await fetch('/api/auth/create-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            phone: formData.phone,
            name: formData.name,
            role: formData.role,
            is_active: formData.is_active,
            location: formData.location,
            profilePhoto: formData.profilePhoto,
            skinTone: formData.skinTone,
            waistSize: formData.waistSize,
            bustSize: formData.bustSize,
            hipSize: formData.hipSize,
            size: formData.size,
            height: formData.height,
            weight: formData.weight,
            coin_balance: formData.coin_balance,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          console.log(result.error, "API error");
          setSubmitting(false);
          return;
        }

        setSubmitting(false);
        setModalVisible(false);
        fetchUsers();
      } catch (error) {
        console.log(error, "error creating user");
        setSubmitting(false);
      }
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "All" || user.role === roleFilter;
    const matchesStatus =
      statusFilter === "All" ||
      (statusFilter === "Active" && user.is_active) ||
      (statusFilter === "Inactive" && !user.is_active);
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <button
          onClick={handleAddUser}
          className="bg-[#F53F7A] text-white px-5 py-2 rounded-lg font-medium hover:bg-[#F53F7A]/90 transition"
        >
          + Add New User
        </button>
      </div>
      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <input
            type="text"
            className="w-full md:w-64 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F53F7A]"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="flex flex-wrap gap-3">
            <select
              className="py-2 px-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F53F7A]"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="All">All Roles</option>
              {roles.map((role) => (
                <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
              ))}
            </select>
            <select
              className="py-2 px-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F53F7A]"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <button
              className="py-2 px-4 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              onClick={() => {
                setSearchTerm("");
                setRoleFilter("All");
                setStatusFilter("All");
              }}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>
      {/* User Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profile</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Skin Tone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-400">Loading...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-400">No users found.</td></tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.profilePhoto ? (
                        <img 
                          src={user.profilePhoto} 
                          alt={user.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-500 text-sm font-medium">
                            {user.name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.location || "-"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.phone || "-"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.skinTone || "-"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${user.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        className="text-blue-600 hover:underline mr-3"
                        onClick={() => handleEditUser(user)}
                        disabled={submitting}
                      >Edit</button>
                      <button
                        className="text-red-600 hover:underline"
                        onClick={() => handleDeleteUser(user)}
                        disabled={submitting}
                      >Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Add/Edit User Modal */}
      {modalVisible && (
        <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
            <button
              onClick={() => setModalVisible(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-red-500 text-xl"
            >
              &times;
            </button>
            <h2 className="text-2xl font-semibold text-[#F53F7A] mb-6 text-center">
              {editingUser ? 'Edit User' : 'Add New User'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Profile Photo Upload Section */}
              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                <div className="mb-4">
                  {formData.profilePhoto ? (
                    <div className="relative">
                      <img 
                        src={formData.profilePhoto} 
                        alt="Profile Preview" 
                        className="h-24 w-24 rounded-full object-cover border-4 border-white shadow-lg" 
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, profilePhoto: "" })}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center border-4 border-white shadow-lg">
                      <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <label htmlFor="profile-photo-upload" className="cursor-pointer bg-[#F53F7A] text-white px-6 py-2 rounded-lg hover:bg-[#F53F7A]/90 transition-colors font-medium">
                    {uploadingPhoto ? "Uploading..." : formData.profilePhoto ? "Change Photo" : "Upload Profile Photo"}
                  </label>
                  <input
                    type="file"
                    id="profile-photo-upload"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadingPhoto(true);
                        try {
                          const result = await uploadFile(file, 'avatars', 'profiles');
                          if (result.error) {
                            alert(`Error uploading photo: ${result.error}`);
                            return;
                          }
                          setFormData({ ...formData, profilePhoto: result.url });
                        } catch (error) {
                          console.error("Error uploading photo:", error);
                          alert("Error uploading photo");
                        } finally {
                          setUploadingPhoto(false);
                        }
                      }
                    }}
                    className="hidden"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    JPG, PNG or WebP. Max size 10MB.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-2 focus:ring-[#F53F7A] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-2 focus:ring-[#F53F7A] focus:outline-none"
                  />
                </div>
                {!editingUser && (
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">Password</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-2 focus:ring-[#F53F7A] focus:outline-none"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-2 focus:ring-[#F53F7A] focus:outline-none"
                  >
                    {roles.map(role => (
                      <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-2 focus:ring-[#F53F7A] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-2 focus:ring-[#F53F7A] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Skin Tone</label>
                  <input
                    type="text"
                    value={formData.skinTone}
                    onChange={e => setFormData({ ...formData, skinTone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-2 focus:ring-[#F53F7A] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Waist Size (cm)</label>
                  <input
                    type="number"
                    value={formData.waistSize}
                    onChange={e => setFormData({ ...formData, waistSize: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-2 focus:ring-[#F53F7A] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Bust Size (cm)</label>
                  <input
                    type="number"
                    value={formData.bustSize}
                    onChange={e => setFormData({ ...formData, bustSize: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-2 focus:ring-[#F53F7A] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Hip Size (cm)</label>
                  <input
                    type="number"
                    value={formData.hipSize}
                    onChange={e => setFormData({ ...formData, hipSize: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-2 focus:ring-[#F53F7A] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Size</label>
                  <input
                    type="text"
                    value={formData.size}
                    onChange={e => setFormData({ ...formData, size: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-2 focus:ring-[#F53F7A] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Height (cm)</label>
                  <input
                    type="number"
                    value={formData.height}
                    onChange={e => setFormData({ ...formData, height: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-2 focus:ring-[#F53F7A] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    value={formData.weight}
                    onChange={e => setFormData({ ...formData, weight: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-2 focus:ring-[#F53F7A] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Coin Balance</label>
                  <input
                    type="number"
                    value={formData.coin_balance}
                    onChange={e => setFormData({ ...formData, coin_balance: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-2 focus:ring-[#F53F7A] focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-5 w-5 text-[#F53F7A] border-gray-300 rounded"
                />
                <span className="text-sm text-gray-600">
                  {formData.is_active ? "User is active" : "User is inactive"}
                </span>
              </div>
              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full bg-[#F53F7A] hover:bg-[#F53F7A]/90 text-white font-medium py-2.5 rounded-md"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : (editingUser ? 'Update User' : 'Add User')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMang;
