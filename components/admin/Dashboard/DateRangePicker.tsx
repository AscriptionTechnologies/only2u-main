"use client";

import React, { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronDown, Check } from "lucide-react";
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, format, isValid, parseISO } from "date-fns";

type DateRange = {
    start: Date | null;
    end: Date | null;
};

type Props = {
    dateRange: DateRange;
    onChange: (range: DateRange, preset: string) => void;
    selectedPreset: string;
};

export default function DateRangePicker({ dateRange, onChange, selectedPreset }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handlePresetSelect = (preset: string) => {
        const now = new Date();
        let start: Date | null = null;
        let end: Date | null = endOfDay(now);

        switch (preset) {
            case "today":
                start = startOfDay(now);
                break;
            case "yesterday":
                start = startOfDay(subDays(now, 1));
                end = endOfDay(subDays(now, 1));
                break;
            case "7days":
                start = startOfDay(subDays(now, 7));
                break;
            case "30days":
                start = startOfDay(subDays(now, 30));
                break;
            case "month":
                start = startOfDay(startOfMonth(now));
                end = endOfDay(endOfMonth(now));
                break;
            case "all":
                start = null;
                end = null;
                break;
            case "custom":
                start = dateRange.start || startOfDay(now);
                end = dateRange.end || endOfDay(now);
                break;
        }

        onChange({ start, end }, preset);
        if (preset !== "custom") {
            setIsOpen(false);
        }
    };

    const handleCustomDateChange = (type: 'start' | 'end', dateStr: string) => {
        const date = dateStr ? new Date(dateStr) : null;
        let newRange = { ...dateRange };

        if (type === 'start') {
            newRange.start = date ? startOfDay(date) : null;
        } else {
            newRange.end = date ? endOfDay(date) : null;
        }

        onChange(newRange, "custom");
    };

    const presets = [
        { id: "today", label: "Today" },
        { id: "yesterday", label: "Yesterday" },
        { id: "7days", label: "Last 7 Days" },
        { id: "30days", label: "Last 30 Days" },
        { id: "month", label: "This Month" },
        { id: "all", label: "All Time" },
    ];

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F53F7A]/20 transition-all shadow-sm"
            >
                <CalendarIcon size={16} className="text-[#F53F7A]" />
                <span>
                    {selectedPreset === "custom" && dateRange.start && dateRange.end
                        ? `${format(dateRange.start, "MMM d, yyyy")} - ${format(dateRange.end, "MMM d, yyyy")}`
                        : selectedPreset === "all"
                            ? "All Time"
                            : presets.find(p => p.id === selectedPreset)?.label || "Select Date"}
                </span>
                <ChevronDown
                    size={14}
                    className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200 flex flex-col md:flex-row min-w-[320px] md:min-w-[480px]">
                    {/* Presets Column */}
                    <div className="p-2 border-b md:border-b-0 md:border-r border-gray-100 bg-gray-50/50 min-w-[160px]">
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3 py-1">Quick Select</div>
                        <div className="space-y-1">
                            {presets.map((preset) => (
                                <button
                                    key={preset.id}
                                    onClick={() => handlePresetSelect(preset.id)}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${selectedPreset === preset.id
                                            ? "bg-white text-[#F53F7A] font-medium shadow-sm ring-1 ring-gray-200"
                                            : "text-gray-600 hover:bg-white hover:text-gray-900"
                                        }`}
                                >
                                    {preset.label}
                                    {selectedPreset === preset.id && <Check size={14} />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Range Column */}
                    <div className="p-4 flex-1 bg-white">
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Custom Range</div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1.5">Start Date</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={dateRange.start ? format(dateRange.start, "yyyy-MM-dd") : ""}
                                        onChange={(e) => handleCustomDateChange('start', e.target.value)}
                                        className="w-full text-sm px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#F53F7A] focus:ring-1 focus:ring-[#F53F7A] transition-colors"
                                    />
                                    <CalendarIcon className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={14} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1.5">End Date</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={dateRange.end ? format(dateRange.end, "yyyy-MM-dd") : ""}
                                        onChange={(e) => handleCustomDateChange('end', e.target.value)}
                                        className="w-full text-sm px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#F53F7A] focus:ring-1 focus:ring-[#F53F7A] transition-colors"
                                    />
                                    <CalendarIcon className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={14} />
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="w-full py-2 bg-[#F53F7A] hover:bg-[#E02E68] text-white rounded-lg text-sm font-medium transition-colors shadow-sm shadow-pink-200"
                                >
                                    Apply Range
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
