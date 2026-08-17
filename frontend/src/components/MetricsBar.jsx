import React from 'react';
import { Activity, CheckCircle2, AlertTriangle, XOctagon } from 'lucide-react';

export default function MetricsBar({ transactions }) {
  const total = transactions.length;
  const approved = transactions.filter(t => t.result?.tier === 'auto_approve').length;
  const review = transactions.filter(t => t.result?.tier === 'manual_review').length;
  const blocked = transactions.filter(t => t.result?.tier === 'auto_block').length;

  const pct = (val) => (total > 0 ? ((val / total) * 100).toFixed(1) : '0.0');

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 py-4 bg-sentinel-50/50">
      {/* Total Card */}
      <div className="bg-white p-3.5 rounded border border-sentinel-200 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs uppercase font-mono tracking-wider text-sentinel-500 font-semibold">Total Scanned</p>
          <p className="text-2xl font-bold font-mono text-sentinel-900 mt-0.5">{total}</p>
        </div>
        <div className="w-8 h-8 rounded bg-sentinel-100 flex items-center justify-center text-sentinel-700">
          <Activity className="w-4 h-4" />
        </div>
      </div>

      {/* Auto Approved Card */}
      <div className="bg-white p-3.5 rounded border border-sentinel-200 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs uppercase font-mono tracking-wider text-emerald-700 font-semibold">Auto Approved</p>
          <div className="flex items-baseline space-x-1.5 mt-0.5">
            <span className="text-2xl font-bold font-mono text-sentinel-900">{approved}</span>
            <span className="text-xs font-mono text-emerald-600 font-medium">{pct(approved)}%</span>
          </div>
        </div>
        <div className="w-8 h-8 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
          <CheckCircle2 className="w-4 h-4" />
        </div>
      </div>

      {/* Manual Review Card */}
      <div className="bg-white p-3.5 rounded border border-sentinel-200 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs uppercase font-mono tracking-wider text-amber-700 font-semibold">Manual Review</p>
          <div className="flex items-baseline space-x-1.5 mt-0.5">
            <span className="text-2xl font-bold font-mono text-sentinel-900">{review}</span>
            <span className="text-xs font-mono text-amber-600 font-medium">{pct(review)}%</span>
          </div>
        </div>
        <div className="w-8 h-8 rounded bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
          <AlertTriangle className="w-4 h-4" />
        </div>
      </div>

      {/* Auto Blocked Card */}
      <div className="bg-white p-3.5 rounded border border-sentinel-200 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs uppercase font-mono tracking-wider text-red-700 font-semibold">Auto Blocked</p>
          <div className="flex items-baseline space-x-1.5 mt-0.5">
            <span className="text-2xl font-bold font-mono text-sentinel-900">{blocked}</span>
            <span className="text-xs font-mono text-red-600 font-medium">{pct(blocked)}%</span>
          </div>
        </div>
        <div className="w-8 h-8 rounded bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
          <XOctagon className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}