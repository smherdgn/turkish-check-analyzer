import React from 'react';

const GARANTI_GREEN = '#1EA48A';

export const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex justify-center items-center">
      <div 
        className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4"
        style={{ borderColor: GARANTI_GREEN, borderTopColor: GARANTI_GREEN, borderBottomColor: GARANTI_GREEN, borderLeftColor: 'transparent', borderRightColor: 'transparent' }}
      ></div>
    </div>
  );
};