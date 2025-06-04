import React from 'react';
import { AlertTriangleIcon } from 'lucide-react';

export const ErrorMessage: React.FC<{ title: string; message: string; }> = ({ title, message }) => {
  return (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative" role="alert">
      <div className="flex items-center">
        <AlertTriangleIcon className="h-6 w-6 text-red-500 mr-3 flex-shrink-0" />
        <div>
          <strong className="font-bold block">{title}</strong>
          <span className="block sm:inline break-words">{message}</span>
        </div>
      </div>
    </div>
  );
};