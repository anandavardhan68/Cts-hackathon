import React, { useState } from 'react';
import axios from 'axios';
import { X, Play, Loader2 } from 'lucide-react';

export default function SandboxModal({ isOpen, onClose, onResult }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    user_id: 'user_015',
    device_id: 'device_007',
    amount: 50000,
    merchant_category: 'shopping_net',
    timestamp: new Date().toISOString(),
    lat: 40.7128,
    lng: -74.006,
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      user_id: formData.user_id,
      device_id: formData.device_id,
      amount: parseFloat(formData.amount),
      merchant_category: formData.merchant_category,
      timestamp: new Date().toISOString(),
      location: {
        lat: parseFloat(formData.lat),
        lng: parseFloat(formData.lng),
      }
    };

    try {
      const res = await axios.post('http://localhost:4000/api/v1/evaluate-risk', payload);
      onResult(res.data);
      onClose();
    } catch (err) {
      alert('Gateway evaluation failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-sentinel-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-sentinel-200 rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-sentinel-200 flex justify-between items-center bg-sentinel-50">
          <div>
            <h3 className="font-semibold text-sentinel-900 text-sm">Interactive Sandbox Evaluator</h3>
            <p className="text-xs text-sentinel-500 font-mono">Inject a direct synchronous test payload</p>
          </div>
          <button onClick={onClose} className="text-sentinel-400 hover:text-sentinel-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-mono">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sentinel-600 mb-1">User ID</label>
              <input
                type="text"
                value={formData.user_id}
                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-sentinel-300 rounded focus:ring-1 focus:ring-sentinel-900 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sentinel-600 mb-1">Device ID</label>
              <input
                type="text"
                value={formData.device_id}
                onChange={(e) => setFormData({ ...formData, device_id: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-sentinel-300 rounded focus:ring-1 focus:ring-sentinel-900 outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sentinel-600 mb-1">Amount ($ USD)</label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-sentinel-300 rounded focus:ring-1 focus:ring-sentinel-900 outline-none font-bold"
                required
              />
            </div>
            <div>
              <label className="block text-sentinel-600 mb-1">Category</label>
              <select
                value={formData.merchant_category}
                onChange={(e) => setFormData({ ...formData, merchant_category: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-sentinel-300 rounded focus:ring-1 focus:ring-sentinel-900 outline-none bg-white"
              >
                <option value="shopping_net">shopping_net</option>
                <option value="shopping_pos">shopping_pos</option>
                <option value="travel">travel</option>
                <option value="dining">dining</option>
                <option value="utilities">utilities</option>
                <option value="misc_net">misc_net</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sentinel-600 mb-1">Target Latitude</label>
              <input
                type="number"
                step="any"
                value={formData.lat}
                onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-sentinel-300 rounded focus:ring-1 focus:ring-sentinel-900 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sentinel-600 mb-1">Target Longitude</label>
              <input
                type="number"
                step="any"
                value={formData.lng}
                onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-sentinel-300 rounded focus:ring-1 focus:ring-sentinel-900 outline-none"
                required
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div className="pt-2">
            <span className="text-[11px] text-sentinel-400 uppercase font-semibold">Load Attack Scenario Presets:</span>
            <div className="flex gap-2 mt-1.5">
              <button
                type="button"
                onClick={() => setFormData({
                  user_id: 'user_015',
                  device_id: 'device_007',
                  amount: 50000,
                  merchant_category: 'shopping_net',
                  lat: 40.7128,
                  lng: -74.006,
                  timestamp: new Date().toISOString()
                })}
                className="px-2 py-1 text-[10px] bg-sentinel-100 hover:bg-sentinel-200 border border-sentinel-200 rounded"
              >
                NYC Impossible Travel ($50k)
              </button>

              <button
                type="button"
                onClick={() => setFormData({
                  user_id: 'user_001',
                  device_id: 'device_001',
                  amount: 8000,
                  merchant_category: 'shopping_net',
                  lat: 17.385,
                  lng: 78.486,
                  timestamp: new Date().toISOString()
                })}
                className="px-2 py-1 text-[10px] bg-sentinel-100 hover:bg-sentinel-200 border border-sentinel-200 rounded"
              >
                Blocklisted Device (Hop-0)
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-sentinel-200 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-sentinel-300 rounded text-sentinel-700 hover:bg-sentinel-50 font-medium font-sans"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-sentinel-900 text-white rounded font-medium hover:bg-sentinel-800 disabled:opacity-50 font-sans"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              <span>Execute Risk Evaluation</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}