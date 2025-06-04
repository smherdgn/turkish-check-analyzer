import React, { useCallback, useState } from 'react';
import { UploadCloudIcon, FileIcon, XIcon } from 'lucide-react';

const GARANTI_GREEN = '#1EA48A';
const GARANTI_GREEN_LIGHT_BG = '#E9F6F4';

interface ImageUploadProps {
  onImageUpload: (file: File) => void;
  disabled?: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ onImageUpload, disabled }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      onImageUpload(file);
    } else if (file) {
      alert("Please upload an image file (e.g., PNG, JPG, WEBP).");
      event.target.value = ''; // Reset file input
    }
  }, [onImageUpload]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    if (disabled) return;
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      const file = event.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
        onImageUpload(file);
      } else {
        alert("Please upload an image file (e.g., PNG, JPG, WEBP).");
      }
    }
  }, [onImageUpload, disabled]);

  const handleDragEvent = useCallback((event: React.DragEvent<HTMLLabelElement>, activate: boolean) => {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled) {
      setDragActive(activate);
    }
  }, [disabled]);
  
  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
    const fileInput = document.getElementById('image-upload') as HTMLInputElement;
    if(fileInput) fileInput.value = '';
    // Parent component (App.tsx) handles resetting main state on new upload or if needed.
    // If an explicit "clear all" action is required from here, a callback prop could be used.
  }, []);


  return (
    <div className="w-full p-1 bg-white rounded-lg">
      <label
        htmlFor="image-upload"
        className={`
          flex flex-col items-center justify-center w-full h-64
          border-2 border-dashed rounded-lg cursor-pointer
          transition-colors duration-200 ease-in-out
          ${disabled ? 'cursor-not-allowed bg-gray-200 opacity-60' : 
            dragActive ? `border-[${GARANTI_GREEN}] bg-[${GARANTI_GREEN_LIGHT_BG}]` : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}
        `}
        onDragEnter={(e) => handleDragEvent(e, true)}
        onDragOver={(e) => handleDragEvent(e, true)}
        onDragLeave={(e) => handleDragEvent(e, false)}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
          {selectedFile && !disabled ? (
            <>
              <FileIcon className="w-12 h-12 mb-3" style={{ color: GARANTI_GREEN }} />
              <p className="mb-2 text-sm text-gray-700">
                <span className="font-semibold">{selectedFile.name}</span>
              </p>
              <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(2)} KB</p>
              <button 
                onClick={(e) => { 
                  e.preventDefault(); 
                  e.stopPropagation();
                  handleRemoveFile(); 
                }}
                className="mt-2 text-red-600 hover:text-red-700 text-xs flex items-center bg-red-100 hover:bg-red-200 px-2 py-1 rounded"
                aria-label="Remove selected file"
              >
                <XIcon size={14} className="mr-1"/> Remove
              </button>
            </>
          ) : (
            <>
              <UploadCloudIcon className={`w-12 h-12 mb-3 ${dragActive ? `text-[${GARANTI_GREEN}]` : 'text-gray-400'}`} />
              <p className="mb-2 text-sm text-gray-600">
                <span className="font-semibold" style={{ color: GARANTI_GREEN }}>Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500">PNG, JPG, GIF, WEBP (MAX. 5MB RECOMMENDED)</p>
            </>
          )}
        </div>
        <input
          id="image-upload"
          type="file"
          className="hidden"
          accept="image/png, image/jpeg, image/gif, image/webp"
          onChange={handleFileChange}
          disabled={disabled}
        />
      </label>
    </div>
  );
};