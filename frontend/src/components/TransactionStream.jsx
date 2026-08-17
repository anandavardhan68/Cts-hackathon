import React from 'react';
import { ChevronRight, ShieldAlert, GitFork, ArrowUpRight } from 'lucide-react';

export default function TransactionStream({ transactions, selectedTxn, onSelectTxn }) {
  const getTierBadge = (tier) => {
    switch (tier) {
      case 'auto_approve':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            AUTO_APPROVE
          </span>
        );
      case 'auto_block':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-red-50 text-red-700 border border-red-200">
            AUTO_BLOCK
          </span>
        );
      case 'manual_review':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-50 text-amber-700 border border-amber-200">
            MANUAL_REVIEW
          </span>
        );
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '--:--:--';
    const date = new Date(ts);
    return date.toLocaleTimeString('en-US', { hour12: false });
  };

  return (
    <div className="flex-1 px-6 pb-6 overflow-hidden flex flex-col">
      <div className="border border-sentinel-200 rounded-lg bg-white shadow-sm flex-1 flex flex-col overflow-hidden">
        {/* Table Header Bar */}
        <div className="bg-sentinel-100/75 px-4 py-2.5 border-b border-sentinel-200 flex justify-between items-center text-xs font-mono text-sentinel-600">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-sentinel-800">LIVE TRANSACTION STREAM</span>
            <span className="text-sentinel-400">({transactions.length} buffered)</span>
          </div>
          <span className="text-[11px] text-sentinel-500">SELECT ROW FOR DEEP FORENSICS</span>
        </div>

        {/* Tabular View */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-sentinel-50 border-b border-sentinel-200 sticky top-0 z-10 text-[11px] font-mono uppercase text-sentinel-500">
              <tr>
                <th className="py-2 px-3 font-semibold">Time</th>
                <th className="py-2 px-3 font-semibold">User / Device</th>
                <th className="py-2 px-3 font-semibold text-right">Amount</th>
                <th className="py-2 px-3 font-semibold">Category</th>
                <th className="py-2 px-3 font-semibold">Risk Flags</th>
                <th className="py-2 px-3 font-semibold">Decision</th>
                <th className="py-2 px-3 font-semibold text-right">RF / Iso Score</th>
                <th className="py-2 px-2 text-center w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sentinel-100 text-xs">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-sentinel-400 font-mono text-xs">
                    Waiting for transactions from simulator (`python simulate.py`)...
                  </td>
                </tr>
              ) : (
                transactions.map((item, idx) => {
                  const txn = item.transaction || item;
                  const feat = item.features || {};
                  const res = item.result || {};
                  const isSelected = selectedTxn?.transaction?.timestamp === txn.timestamp;
                  const isImpossibleTravel = feat.velocity_kmh > 1000;
                  const isGraphRing = feat.hop_distance_to_flagged >= 0;

                  return (
                    <tr
                      key={txn.timestamp + '-' + idx}
                      onClick={() => onSelectTxn(item)}
                      className={`cursor-pointer transition-colors duration-150 ${
                        idx === 0 ? 'animate-flash' : ''
                      } ${
                        isSelected 
                          ? 'bg-sentinel-100 font-medium' 
                          : 'hover:bg-sentinel-50'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono text-sentinel-500 whitespace-nowrap">
                        {formatTime(txn.timestamp)}
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        <div className="text-sentinel-900 font-medium">{txn.user_id}</div>
                        <div className="text-[10px] text-sentinel-400">{txn.device_id}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-sentinel-900">
                        ${Number(txn.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-sentinel-700 font-mono text-[11px]">
                        {txn.merchant_category}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-wrap gap-1">
                          {isImpossibleTravel && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-red-50 text-red-700 border border-red-200">
                              <ShieldAlert className="w-3 h-3 mr-0.5 text-red-500" />
                              VELOCITY
                            </span>
                          )}
                          {isGraphRing && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-50 text-amber-700 border border-amber-200">
                              <GitFork className="w-3 h-3 mr-0.5 text-amber-500" />
                              HOP-{feat.hop_distance_to_flagged}
                            </span>
                          )}
                          {feat.is_new_device_for_user && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-sentinel-100 text-sentinel-700 border border-sentinel-200">
                              NEW_DEV
                            </span>
                          )}
                          {!isImpossibleTravel && !isGraphRing && !feat.is_new_device_for_user && (
                            <span className="text-[11px] text-sentinel-400 font-mono">—</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {getTierBadge(res.tier)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[11px] text-sentinel-600">
                        <span>{res.random_forest_score?.toFixed(3) ?? '0.000'}</span>
                        <span className="text-sentinel-300 mx-1">/</span>
                        <span>{res.isolation_forest_score?.toFixed(3) ?? '0.000'}</span>
                      </td>
                      <td className="py-2.5 px-2 text-center text-sentinel-400">
                        <ChevronRight className="w-4 h-4 inline" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}