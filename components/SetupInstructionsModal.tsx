import React, { useState } from 'react';
import { XIcon } from 'lucide-react';

const GARANTI_GREEN = '#1EA48A';

interface SetupInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ActiveTab = 'windows' | 'macos';

export const SetupInstructionsModal: React.FC<SetupInstructionsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('windows');

  if (!isOpen) {
    return null;
  }

  const commonRestartNote = "After installation or configuration changes, please restart the backend server for changes to take effect.";

  const TabButton: React.FC<{ tabId: ActiveTab; currentTab: ActiveTab; onClick: (tabId: ActiveTab) => void; children: React.ReactNode }> = 
    ({ tabId, currentTab, onClick, children }) => (
    <button
      onClick={() => onClick(tabId)}
      className={`px-4 py-2 text-sm font-medium rounded-t-lg focus:outline-none transition-colors
        ${currentTab === tabId 
          ? `text-white bg-[${GARANTI_GREEN}]` 
          : `text-gray-600 hover:bg-gray-200 hover:text-[${GARANTI_GREEN}]`
        }`}
    >
      {children}
    </button>
  );

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 transition-opacity duration-300"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="setup-instructions-title"
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 relative"
        onClick={(e) => e.stopPropagation()} // Prevent click inside modal from closing it
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors"
          aria-label="Close setup instructions"
        >
          <XIcon size={24} />
        </button>

        <h2 id="setup-instructions-title" className="text-2xl font-bold mb-6 text-center" style={{ color: GARANTI_GREEN }}>
          OCR Tool Setup Instructions
        </h2>
        
        <p className="text-center text-gray-600 mb-6">
          It seems Tesseract OCR or EasyOCR might not be set up correctly on your backend server.
          Please follow these instructions:
        </p>

        <div className="mb-4 border-b border-gray-200">
          <nav className="-mb-px flex space-x-1" aria-label="Tabs">
            <TabButton tabId="windows" currentTab={activeTab} onClick={setActiveTab}>Windows</TabButton>
            <TabButton tabId="macos" currentTab={activeTab} onClick={setActiveTab}>macOS</TabButton>
          </nav>
        </div>

        <div className="space-y-6 text-sm">
          {activeTab === 'windows' && (
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-800">Windows Setup</h3>
              
              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <h4 className="font-semibold text-md mb-1" style={{ color: GARANTI_GREEN }}>1. Tesseract OCR</h4>
                <p className="mb-1">Download the Tesseract installer from <a href="https://github.com/UB-Mannheim/tesseract/wiki" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Tesseract at UB Mannheim</a>.</p>
                <p className="mb-1">During installation:</p>
                <ul className="list-disc list-inside pl-4 text-gray-700">
                  <li>Ensure "Add Tesseract to system PATH" is checked.</li>
                  <li>Install language packs: at least "Turkish" (tur) and "English" (eng).</li>
                </ul>
                <p className="mt-1">Verify by opening Command Prompt and typing: <code className="bg-gray-200 px-1 rounded">tesseract --version</code></p>
              </div>

              <div className="p-3 bg-gray-50 rounded-md">
                <h4 className="font-semibold text-md mb-1" style={{ color: GARANTI_GREEN }}>2. EasyOCR (Python)</h4>
                <p className="mb-1">EasyOCR is installed via pip (see <code className="bg-gray-200 px-1 rounded">requirements.txt</code>). If issues persist, it might be related to PyTorch.</p>
                <p className="mb-1">Ensure you have Python and pip installed.</p>
                <p className="mb-1">From your project's virtual environment, <code className="bg-gray-200 px-1 rounded">pip install -r requirements.txt</code> should handle it.</p>
                <p className="mb-1">If you encounter PyTorch issues, you might need to install it separately first. For CPU:
                  <br /><code className="bg-gray-200 px-1 rounded text-xs">pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu</code>
                </p>
              </div>
            </div>
          )}

          {activeTab === 'macos' && (
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-800">macOS Setup</h3>
              
              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <h4 className="font-semibold text-md mb-1" style={{ color: GARANTI_GREEN }}>1. Tesseract OCR</h4>
                <p className="mb-1">Install using Homebrew:</p>
                <pre className="bg-gray-200 p-2 rounded text-xs overflow-x-auto">
                  brew install tesseract<br/>
                  brew install tesseract-lang # For all language packs, or install specific ones
                </pre>
                 <p className="mt-1">Alternatively, for specific languages like Turkish and English after installing tesseract core:</p>
                 <pre className="bg-gray-200 p-2 rounded text-xs overflow-x-auto">
                   {`# After 'brew install tesseract', download .traineddata files (e.g., tur.traineddata, eng.traineddata)\n# from https://github.com/tesseract-ocr/tessdata_fast\n# and place them in your Tesseract's tessdata directory.\n# Find path with: tesseract --print-tessdata-dir`}
                 </pre>
                <p className="mt-1">Verify by opening Terminal and typing: <code className="bg-gray-200 px-1 rounded">tesseract --version</code></p>
              </div>

              <div className="p-3 bg-gray-50 rounded-md">
                <h4 className="font-semibold text-md mb-1" style={{ color: GARANTI_GREEN }}>2. EasyOCR (Python)</h4>
                <p className="mb-1">EasyOCR is installed via pip (see <code className="bg-gray-200 px-1 rounded">requirements.txt</code>). If issues persist, it might be related to PyTorch.</p>
                <p className="mb-1">Ensure you have Python and pip installed (often pre-installed or via Homebrew <code className="bg-gray-200 px-1 rounded">brew install python</code>).</p>
                <p className="mb-1">From your project's virtual environment, <code className="bg-gray-200 px-1 rounded">pip install -r requirements.txt</code> should handle it.</p>
                 <p className="mb-1">If you encounter PyTorch issues, you might need to install it separately. For CPU:
                  <br /><code className="bg-gray-200 px-1 rounded text-xs">pip install torch torchvision torchaudio</code>
                </p>
              </div>
            </div>
          )}
           <p className="mt-6 text-center text-xs text-gray-500 italic">{commonRestartNote}</p>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={onClose}
            className={`px-6 py-2 text-white rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[${GARANTI_GREEN}]`}
            style={{ backgroundColor: GARANTI_GREEN, }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#008C73'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = GARANTI_GREEN }
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
