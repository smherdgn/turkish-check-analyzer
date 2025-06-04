import React from 'react';
import type { CheckDetails, LLMAnalysis } from '../types'; // Updated import
import { ErrorMessage } from './ErrorMessage'; // For displaying LLM-specific errors

const GARANTI_GREEN = '#1EA48A';

interface DetailItemProps {
  label: string; 
  value: string | boolean | number | null | undefined | Record<string, any>;
}

const DetailItem: React.FC<DetailItemProps> = ({ label, value }) => {
  if (value === null || value === undefined || value === '' || (typeof value === 'object' && Object.keys(value).length === 0)) {
    return null; 
  }
  
  let displayValue: string;
  if (typeof value === 'boolean') {
    displayValue = value ? 'Yes' : 'No';
  } else if (typeof value === 'object') {
    displayValue = JSON.stringify(value, null, 2);
    return (
      <div className="py-2 px-3 bg-gray-50 rounded-md col-span-1 md:col-span-2">
        <span className="font-semibold block mb-1" style={{ color: GARANTI_GREEN }}>{label}: </span>
        <pre className="text-sm text-gray-700 whitespace-pre-wrap break-all bg-gray-100 p-2 rounded">{displayValue}</pre>
      </div>
    );
  } else {
    displayValue = String(value);
  }

  return (
    <div className="py-2 px-3 bg-gray-50 rounded-md">
      <span className="font-semibold" style={{ color: GARANTI_GREEN }}>{label}: </span>
      <span className="text-gray-700">{displayValue}</span>
    </div>
  );
};

// Updated Props for CheckDisplay
interface CheckDisplayProps {
  imageSrc: string | null;
  rawOcrTesseract: string | null;
  rawOcrEasyOcr: string | null;
  llmAnalyses: LLMAnalysis[] | null;
}

export const CheckDisplay: React.FC<CheckDisplayProps> = ({ 
    imageSrc, 
    rawOcrTesseract, 
    rawOcrEasyOcr, 
    llmAnalyses 
}) => {
  const formatKey = (key: string) => {
    if (key.toLowerCase() === 'iban') return 'IBAN';
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .trim()
      .replace(/^\w/, (c) => c.toUpperCase())
      .replace(/\s\w/g, (c) => c.toUpperCase());
  };
  
  return (
    <div className="space-y-8">
      {imageSrc && (
        <section>
          <h2 className="text-2xl font-semibold mb-3" style={{ color: GARANTI_GREEN }}>Uploaded Check Image</h2>
          <div className="bg-gray-100 p-2 rounded-lg shadow-lg overflow-hidden">
            <img src={imageSrc} alt="Uploaded Check" className="max-w-full h-auto max-h-[400px] mx-auto rounded object-contain" />
          </div>
        </section>
      )}

      {(rawOcrTesseract || rawOcrEasyOcr) && (
        <section>
          <h2 className="text-2xl font-semibold mb-4" style={{ color: GARANTI_GREEN }}>Raw OCR Data</h2>
          {rawOcrTesseract && (
            <div className="mt-4">
              <h3 className="text-xl font-medium mb-2 text-gray-700">Text Extracted by Tesseract OCR:</h3>
              <div className="bg-gray-100 p-4 rounded-lg shadow-inner max-h-60 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 break-words">{rawOcrTesseract}</pre>
              </div>
            </div>
          )}
          {rawOcrEasyOcr && (
            <div className="mt-4">
              <h3 className="text-xl font-medium mb-2 text-gray-700">Text Extracted by EasyOCR:</h3>
              <div className="bg-gray-100 p-4 rounded-lg shadow-inner max-h-60 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 break-words">{rawOcrEasyOcr}</pre>
              </div>
            </div>
          )}
        </section>
      )}

      {llmAnalyses && llmAnalyses.length > 0 && (
         <section>
          <h2 className="text-2xl font-semibold mb-3" style={{ color: GARANTI_GREEN }}>LLM Analysis Results</h2>
          {llmAnalyses.map((resultItem) => (
            <div key={resultItem.model_name} className="mb-8 p-4 border border-gray-200 rounded-lg shadow-md bg-white">
              <h3 className="text-xl font-semibold mb-2" style={{ color: GARANTI_GREEN }}>
                Analysis from: <span className="font-bold">{resultItem.model_name}</span>
              </h3>
              {resultItem.error && (
                <ErrorMessage title={`Error from ${resultItem.model_name}`} message={resultItem.error} />
              )}
              {resultItem.analysis && (
                <>
                  {resultItem.analysis.side && resultItem.analysis.side !== 'Unknown' && (
                    <div className="mb-4 p-3 text-center font-medium rounded-lg" style={{backgroundColor: `${GARANTI_GREEN}20`, color: GARANTI_GREEN }}>
                      Detected Side: {resultItem.analysis.side}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(resultItem.analysis)
                      .filter(([key, value]) => 
                        key !== 'side' &&
                        value !== null && value !== '' && !(typeof value === 'object' && value !== null && Object.keys(value).length === 0)
                      )
                      .map(([key, value]) => (
                        <DetailItem key={`${resultItem.model_name}-${key}`} label={formatKey(key)} value={value} />
                    ))}
                  </div>
                </>
              )}
              {!resultItem.analysis && !resultItem.error && (
                <p className="text-gray-500">No analysis data provided by this model.</p>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
};