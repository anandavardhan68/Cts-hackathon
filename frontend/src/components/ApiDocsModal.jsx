import React from 'react';
import { X, Copy, Check } from 'lucide-react';

export default function ApiDocsModal({ isOpen, onClose }) {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const curlCode = `curl -X POST http://localhost:4000/api/v1/evaluate-risk \\
  -H "Content-Type: application/json" \\
  -d '{
    "user_id": "user_015",
    "device_id": "device_007",
    "amount": 2500.00,
    "merchant_category": "shopping_net",
    "timestamp": "2026-08-17T12:00:00Z",
    "location": {
      "lat": 40.7128,
      "lng": -74.0060
    }
  }'`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(curlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-sentinel-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-sentinel-200 rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-sentinel-200 flex justify-between items-center bg-sentinel-50">
          <div>
            <h3 className="font-semibold text-sentinel-900 text-sm">FDaaS OpenAPI Reference</h3>
            <p className="text-xs text-sentinel-500 font-mono">Synchronous Fraud Evaluation Endpoint</p>
          </div>
          <button onClick={onClose} className="text-sentinel-400 hover:text-sentinel-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs font-mono">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-sentinel-700">HTTP ENDPOINT:</span>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded">POST</span>
              <span className="text-sentinel-800">http://localhost:4000/api/v1/evaluate-risk</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-sentinel-700">EXAMPLE cURL REQUEST:</span>
              <button 
                onClick={copyToClipboard}
                className="text-[11px] text-sentinel-500 hover:text-sentinel-900 inline-flex items-center space-x-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy cURL'}</span>
              </button>
            </div>
            <pre className="p-3 bg-sentinel-900 text-sentinel-100 rounded text-[11px] overflow-x-auto leading-relaxed">
              {curlCode}
            </pre>
          </div>

          <div className="space-y-1 pt-2 border-t border-sentinel-200">
            <span className="text-[11px] font-bold text-sentinel-700">RETURN SCHEMA (200 OK):</span>
            <p className="text-sentinel-500 text-[11px]">Returns decision tier, computed 12-feature vector, and top-3 SHAP impact attributions within &lt;50ms.</p>
          </div>
        </div>

        <div className="p-4 border-t border-sentinel-200 bg-sentinel-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-sentinel-900 text-white rounded text-xs font-medium hover:bg-sentinel-800 transition font-sans"
          >
            Close Documentation
          </button>
        </div>
      </div>
    </div>
  );
}