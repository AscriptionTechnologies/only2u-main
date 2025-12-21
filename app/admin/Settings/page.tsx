"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { toast } from "react-hot-toast";
import { Save, Settings as SettingsIcon, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";

interface Setting {
  id: string;
  key: string;
  value: string;
  description: string;
  is_active: boolean;
  updated_at: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data: existingSettings, error: fetchError } = await supabase
        .from("settings")
        .select("*")
        .order("key");

      if (fetchError) throw fetchError;

      // Check if face_swap_cost exists
      const hasFaceSwapCost = existingSettings?.some(s => s.key === "face_swap_cost");

      if (!hasFaceSwapCost) {
        // Create default face_swap_cost setting
        const { data: newSetting, error: insertError } = await supabase
          .from("settings")
          .insert({
            key: "face_swap_cost",
            value: "50",
            description: "Cost per face swap operation (in credits)",
            is_active: true
          })
          .select()
          .single();

        if (insertError) {
          console.error("Error creating default setting:", insertError);
        } else if (newSetting) {
          existingSettings?.push(newSetting);
        }
      }

      // Sort again just in case
      const sortedSettings = (existingSettings || []).sort((a, b) => a.key.localeCompare(b.key));
      setSettings(sortedSettings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleValue = async (setting: Setting) => {
    const newValue = setting.value === "true" ? "false" : "true";
    await updateSetting(setting.id, { value: newValue });
  };

  const handleToggleActive = async (setting: Setting) => {
    await updateSetting(setting.id, { is_active: !setting.is_active });
  };

  const handleTextChange = (id: string, newValue: string) => {
    setSettings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, value: newValue } : s))
    );
  };

  const handleSaveText = async (setting: Setting) => {
    await updateSetting(setting.id, { value: setting.value });
  };

  const updateSetting = async (id: string, updates: Partial<Setting>) => {
    try {
      setSaving(id);
      const { error } = await supabase
        .from("settings")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      setSettings((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
      );
      toast.success("Setting updated successfully");
    } catch (error) {
      console.error("Error updating setting:", error);
      toast.error("Failed to update setting");
      // Revert changes by refetching
      fetchSettings();
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#F53F7A]" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <SettingsIcon className="text-[#F53F7A]" size={28} />
          App Settings
        </h1>
        <p className="text-gray-500 mt-2">
          Manage global application configurations and feature flags.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Setting
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {settings.map((setting) => {
                const isBoolean = setting.value === "true" || setting.value === "false";
                const isSaving = saving === setting.id;
                const isNumber = setting.key === "face_swap_cost"; // Identify numeric inputs

                return (
                  <tr key={setting.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 font-mono text-sm">
                          {setting.key}
                        </span>
                        <span className="text-xs text-gray-500 mt-1">
                          {setting.description}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {isBoolean ? (
                        <button
                          onClick={() => handleToggleValue(setting)}
                          disabled={isSaving}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${setting.value === "true"
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        >
                          {setting.value === "true" ? (
                            <ToggleRight size={18} />
                          ) : (
                            <ToggleLeft size={18} />
                          )}
                          {setting.value === "true" ? "Enabled" : "Disabled"}
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            type={isNumber ? "number" : "text"}
                            value={setting.value}
                            onChange={(e) =>
                              handleTextChange(setting.id, e.target.value)
                            }
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#F53F7A] focus:ring-[#F53F7A] sm:text-sm px-3 py-2 border"
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(setting)}
                        disabled={isSaving}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${setting.is_active ? "bg-[#F53F7A]" : "bg-gray-200"
                          }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${setting.is_active ? "translate-x-5" : "translate-x-0"
                            }`}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!isBoolean && (
                        <button
                          onClick={() => handleSaveText(setting)}
                          disabled={isSaving}
                          className="text-[#F53F7A] hover:text-[#d6336c] p-2 rounded-full hover:bg-[#F53F7A]/10 transition-colors"
                          title="Save changes"
                        >
                          {isSaving ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Save size={18} />
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
