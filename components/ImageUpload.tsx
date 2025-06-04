// components/ImageUpload.tsx
import React, { useState } from "react";
import { Upload } from "lucide-react";

interface ImageUploadProps {
  onImageUpload: (files: File[]) => void;
  disabled: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageUpload,
  disabled,
}) => {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && !disabled) {
      onImageUpload(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0 && !disabled) {
      onImageUpload(Array.from(e.target.files));
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <h2 className="text-lg font-semibold text-gray-900 p-6 pb-4 flex items-center">
        <Upload className="h-5 w-5 mr-2 text-green-600" />
        Upload Check Image
      </h2>

      {/* Background Image */}
      <div className="relative">
        <div
          className="absolute inset-0 opacity-10 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('/cekgorsel.png')`,
            filter: "blur(1px)",
          }}
        />

        {/* Upload Area */}
        <div className="relative p-6 pt-2">
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${
              dragActive
                ? "border-green-500 bg-green-50/80 backdrop-blur-sm"
                : disabled
                ? "border-gray-200 bg-gray-50/80"
                : "border-gray-300 hover:border-green-400 hover:bg-green-50/80 backdrop-blur-sm"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleChange}
              disabled={disabled}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
            />

            <div className="space-y-4 relative z-0">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <Upload className="h-full w-full" />
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900">
                  {dragActive
                    ? "Drop the check image here"
                    : "Upload a Turkish bank check"}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Supports PNG, JPG, JPEG or WEBP formats
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Maximum file size: 10MB
                </p>
              </div>
              <button
                type="button"
                disabled={disabled}
                className={`inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 ${
                  disabled
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700 hover:shadow-md transform hover:-translate-y-0.5"
                }`}
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose File
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
