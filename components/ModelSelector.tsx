import React from 'react';
import type { OllamaModel } from '../types';

const GARANTI_GREEN = '#1EA48A';

interface ModelSelectorProps {
  models: OllamaModel[];
  selectedModels: string[];
  onChange: (modelName: string, isSelected: boolean) => void;
  disabled?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ models, selectedModels, onChange, disabled }) => {
  if (!models || models.length === 0) {
    return (
      <div className="p-4 mb-4 text-sm text-yellow-700 bg-yellow-100 rounded-lg" role="alert">
        <span className="font-medium">No Ollama models found or Ollama might not be reachable.</span> Please ensure Ollama is running and models are available.
      </div>
    );
  }

  const formatSize = (sizeInBytes: number): string => {
    const gb = sizeInBytes / (1024 * 1024 * 1024);
    if (gb >= 1) {
      return `${gb.toFixed(2)} GB`;
    }
    const mb = sizeInBytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };


  return (
    <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-white shadow">
      <h3 className="text-lg font-semibold mb-3" style={{ color: GARANTI_GREEN }}>Select Ollama Models for Analysis:</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto pr-2">
        {models.map((model) => (
          <label
            key={model.name}
            htmlFor={`model-${model.name}`}
            className={`
              flex items-center p-3 space-x-3 rounded-lg border
              transition-all duration-150 ease-in-out
              ${disabled ? 'cursor-not-allowed bg-gray-100 opacity-70' : 'cursor-pointer hover:shadow-md hover:border-green-400'}
              ${selectedModels.includes(model.name) ? `bg-green-50 border-[${GARANTI_GREEN}] ring-2 ring-[${GARANTI_GREEN}]` : 'bg-gray-50 border-gray-200'}
            `}
          >
            <input
              type="checkbox"
              id={`model-${model.name}`}
              name={model.name}
              checked={selectedModels.includes(model.name)}
              onChange={(e) => onChange(model.name, e.target.checked)}
              disabled={disabled}
              className="form-checkbox h-5 w-5 rounded text-[#1EA48A] focus:ring-[#1EA48A] border-gray-300 disabled:opacity-50"
            />
            <div className="flex flex-col">
              <span className={`text-sm font-medium ${selectedModels.includes(model.name) ? `text-[${GARANTI_GREEN}]` : 'text-gray-800'}`}>
                {model.name}
              </span>
              <span className="text-xs text-gray-500">
                {formatSize(model.size)}
              </span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
};