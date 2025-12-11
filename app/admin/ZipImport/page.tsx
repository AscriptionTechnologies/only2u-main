"use client";

import React, { useState, useCallback } from "react";
import { Upload, Archive, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface ImportResult {
  success: boolean;
  message: string;
  productsCreated?: number;
  errors?: string[];
}

export default function ZipImportPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const zipFile = files.find((file) => file.name.endsWith(".zip"));

    if (zipFile) {
      setSelectedFile(zipFile);
      setImportResult(null);
    } else {
      alert("Please drop a ZIP file");
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.endsWith(".zip")) {
        setSelectedFile(file);
        setImportResult(null);
      } else {
        alert("Please select a ZIP file");
      }
    }
  }, []);

  const handleImport = async () => {
    if (!selectedFile) {
      alert("Please select a ZIP file");
      return;
    }

    setIsProcessing(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("zipFile", selectedFile);

      const response = await fetch("/api/zip-import/process", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setImportResult({
          success: true,
          message: result.message || "Products imported successfully!",
          productsCreated: result.productsCreated,
          errors: result.errors,
        });
        setSelectedFile(null);
      } else {
        setImportResult({
          success: false,
          message: result.error || "Failed to import products",
          errors: result.errors,
        });
      }
    } catch (error: any) {
      setImportResult({
        success: false,
        message: error.message || "An error occurred while importing",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">ZIP Product Import</h1>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Import Products from ZIP File
          </h2>
          <p className="text-gray-600 mb-6">
            Drag and drop a ZIP file containing product images and metadata, or click to select a file.
            The ZIP should contain:
          </p>
          <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
            <li><code className="bg-gray-100 px-2 py-1 rounded">M_Size/</code> folder with Size M images</li>
            <li><code className="bg-gray-100 px-2 py-1 rounded">L_Size/</code> folder with Size L images</li>
            <li><code className="bg-gray-100 px-2 py-1 rounded">product_details.json</code> file with product metadata</li>
            <li><code className="bg-gray-100 px-2 py-1 rounded">Descriptions/</code> folder (optional) with text descriptions</li>
          </ul>

          {/* Drag and Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              isDragging
                ? "border-[#F53F7A] bg-[#F53F7A]/5"
                : "border-gray-300 hover:border-[#F53F7A]/50"
            } ${isProcessing ? "opacity-50 pointer-events-none" : ""}`}
          >
            {selectedFile ? (
              <div className="flex flex-col items-center">
                <Archive className="w-16 h-16 text-[#F53F7A] mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  {selectedFile.name}
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Remove file
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Drag and drop your ZIP file here
                </p>
                <p className="text-sm text-gray-500 mb-4">or</p>
                <label className="inline-block">
                  <span className="px-6 py-3 bg-[#F53F7A] text-white rounded-lg hover:bg-[#F53F7A]/90 cursor-pointer transition-colors inline-block">
                    Browse Files
                  </span>
                  <input
                    type="file"
                    accept=".zip"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isProcessing}
                  />
                </label>
              </>
            )}
          </div>

          {/* Import Button */}
          {selectedFile && !isProcessing && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleImport}
                className="px-6 py-3 bg-[#F53F7A] text-white rounded-lg hover:bg-[#F53F7A]/90 transition-colors font-medium"
              >
                Import Products
              </button>
            </div>
          )}

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="mt-6 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-[#F53F7A] mr-3" />
              <span className="text-gray-700">Processing ZIP file and creating products...</span>
            </div>
          )}

          {/* Result Message */}
          {importResult && (
            <div
              className={`mt-6 p-4 rounded-lg ${
                importResult.success
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <div className="flex items-start">
                {importResult.success ? (
                  <CheckCircle className="w-6 h-6 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p
                    className={`font-medium ${
                      importResult.success ? "text-green-800" : "text-red-800"
                    }`}
                  >
                    {importResult.message}
                  </p>
                  {importResult.productsCreated !== undefined && (
                    <p className="text-sm text-gray-600 mt-2">
                      {importResult.productsCreated} product(s) created successfully.
                    </p>
                  )}
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">Errors:</p>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        {importResult.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

