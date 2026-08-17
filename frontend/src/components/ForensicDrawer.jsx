import React from 'react';
import { X, Network, MapPin, Gauge, Cpu, CheckCircle, ShieldAlert, ArrowRight } from 'lucide-react';

export default function ForensicDrawer({ item, onClose }) {
  if (!item) return null;

  const txn = item.transaction || item;
  const feat = item.features || {};
  const res = item.result || {};
  const shapFactors = res.shap_factors || [];

  const isImpossibleTravel = feat.velocity_kmh > 1000;
  const isDirectlyBlocklisted = feat.hop_distance_to_flagged === 0;
  const isSyndicateHop = feat.hop_distance_to_flagged === 1;

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white border-l border-sentinel-200 shadow-2xl z-40 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-sentinel-200 bg-sentinel-50 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs font-bold uppercase text-sentinel-500">FORENSIC CASE INSPECTOR</span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
              res.tier === 'auto_approve' ? 'bg-emerald-100 text-emerald-800' :
              res.tier === 'auto_block' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {res.tier?.toUpperCase()}
            </span>
          </div>
          <p className="text-base font-bold font-mono text-sentinel-900 mt-1">
            ${Number(txn.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            <span className="text-xs font-normal text-sentinel-500 ml-2 font-mono">({txn.merchant_category})</span>
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded hover:bg-sentinel-200 text-sentinel-500 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        
        {/* Section 1: Spatial & Impossible Travel */}
        <div>
          <div className="flex items-center space-x-1.5 text-xs font-mono font-bold uppercase text-sentinel-700 mb-2">
            <MapPin className="w-3.5 h-3.5 text-sentinel-500" />
            <span>Geospatial & Velocity Intel</span>
          </div>

          <div className={`p-3 rounded border ${isImpossibleTravel ? 'bg-red-50/70 border-red-200' : 'bg-sentinel-50 border-sentinel-200'}`}>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <span className="text-sentinel-500 text-[11px]">Distance Delta:</span>
                <p className="font-semibold text-sentinel-900">{feat.distance_from_last_txn_km?.toLocaleString()} km</p>
              </div>
              <div>
                <span className="text-sentinel-500 text-[11px]">Speed Velocity:</span>
                <p className={`font-semibold ${isImpossibleTravel ? 'text-red-700' : 'text-sentinel-900'}`}>
                  {feat.velocity_kmh?.toLocaleString()} km/h
                </p>
              </div>
              <div className="col-span-2 pt-1 border-t border-sentinel-200/50">
                <span className="text-sentinel-500 text-[11px]">Coordinates:</span>
                <p className="text-sentinel-700">
                  Lat: {txn.location?.lat?.toFixed(4)}, Lng: {txn.location?.lng?.toFixed(4)}
                </p>
              </div>
            </div>

            {isImpossibleTravel && (
              <div className="mt-2.5 flex items-center space-x-1 text-xs text-red-800 font-medium">
                <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>Triggered Impossible-Travel spatial anomaly rule.</span>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Neo4j Graph Ring Intelligence */}
        <div>
          <div className="flex items-center space-x-1.5 text-xs font-mono font-bold uppercase text-sentinel-700 mb-2">
            <Network className="w-3.5 h-3.5 text-sentinel-500" />
            <span>Neo4j Syndicate Proximity</span>
          </div>

          <div className="p-3 bg-sentinel-50 rounded border border-sentinel-200 space-y-2.5">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-sentinel-500">Hop Distance to Flagged:</span>
              <span className={`px-2 py-0.5 rounded font-semibold ${
                isDirectlyBlocklisted ? 'bg-red-100 text-red-800' :
                isSyndicateHop ? 'bg-amber-100 text-amber-800' : 'bg-sentinel-200 text-sentinel-700'
              }`}>
                {feat.hop_distance_to_flagged === -1 ? 'CLEAN (NO PATH)' : `HOP ${feat.hop_distance_to_flagged}`}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-sentinel-500">Shared Accounts on Device:</span>
              <span className="font-bold text-sentinel-900">{feat.linked_account_count ?? 0}</span>
            </div>

            {/* Visual Mini Graph Path */}
            <div className="pt-2 border-t border-sentinel-200">
              <span className="text-[10px] font-mono text-sentinel-400 uppercase">Entity Resolution Graph</span>
              <div className="mt-1.5 p-2 bg-white rounded border border-sentinel-200 flex items-center justify-between text-[11px] font-mono">
                <span className="bg-sentinel-100 px-1.5 py-0.5 rounded border border-sentinel-200">{txn.user_id}</span>
                <ArrowRight className="w-3 h-3 text-sentinel-400" />
                <span className="bg-sentinel-100 px-1.5 py-0.5 rounded border border-sentinel-200">{txn.device_id?.slice(0, 10)}...</span>
                <ArrowRight className="w-3 h-3 text-sentinel-400" />
                <span className={`px-1.5 py-0.5 rounded border ${
                  isDirectlyBlocklisted ? 'bg-red-50 text-red-700 border-red-200' : 
                  isSyndicateHop ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {isDirectlyBlocklisted ? 'BLOCKLIST' : isSyndicateHop ? 'SYNDICATE' : 'TRUSTED'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Explainable AI (SHAP Impact Breakdown) */}
        <div>
          <div className="flex items-center space-x-1.5 text-xs font-mono font-bold uppercase text-sentinel-700 mb-2">
            <Cpu className="w-3.5 h-3.5 text-sentinel-500" />
            <span>XAI SHAP Attribution Weights</span>
          </div>

          <div className="p-3 bg-sentinel-50 rounded border border-sentinel-200 space-y-3">
            <p className="text-[11px] text-sentinel-500 leading-snug">
              Direct mathematical feature contributions to the Random Forest classifier:
            </p>

            <div className="space-y-2">
              {shapFactors.length > 0 ? (
                shapFactors.map((item, idx) => {
                  const isPositive = item.impact > 0;
                  const absImpact = Math.min(Math.abs(item.impact) * 100, 100);

                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-sentinel-800">{item.feature}</span>
                        <span className={`font-semibold ${isPositive ? 'text-red-600' : 'text-emerald-600'}`}>
                          {isPositive ? '+' : ''}{item.impact}
                        </span>
                      </div>
                      {/* Dual Directional Bar */}
                      <div className="h-1.5 w-full bg-sentinel-200 rounded-full overflow-hidden flex">
                        {isPositive ? (
                          <div 
                            className="bg-red-500 h-full rounded-full" 
                            style={{ width: `${absImpact}%` }}
                          />
                        ) : (
                          <div 
                            className="bg-emerald-500 h-full rounded-full" 
                            style={{ width: `${absImpact}%` }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-sentinel-400 font-mono">No SHAP attribution records returned.</p>
              )}
            </div>
          </div>
        </div>

        {/* Section 4: Raw Features Summary */}
        <div>
          <span className="text-[11px] font-mono uppercase text-sentinel-400 font-semibold">Normalized Vector Feed</span>
          <div className="mt-1 p-2 bg-sentinel-900 rounded text-sentinel-100 font-mono text-[11px] overflow-x-auto">
            <pre>{JSON.stringify(feat, null, 2)}</pre>
          </div>
        </div>

      </div>

      {/* Action Footer */}
      <div className="p-4 border-t border-sentinel-200 bg-sentinel-50 flex items-center justify-between">
        <button 
          onClick={onClose}
          className="w-full py-2 bg-sentinel-900 hover:bg-sentinel-800 text-white rounded text-xs font-medium transition font-mono"
        >
          DISMISS INSPECTION
        </button>
      </div>
    </div>
  );
}