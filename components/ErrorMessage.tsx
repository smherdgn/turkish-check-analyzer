// components/ErrorMessage.tsx
import React from "react";
import { AlertCircle } from "lucide-react";

interface ErrorMessageProps {
  title: string;
  message: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title,
  message,
}) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
    <div className="flex">
      <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
      <div>
        <h3 className="text-sm font-medium text-red-800">{title}</h3>
        <p className="mt-1 text-sm text-red-700">{message}</p>
      </div>
    </div>
  </div>
);
