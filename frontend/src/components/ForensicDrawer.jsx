import React from 'react';
import { X, Network, MapPin, Cpu, ShieldAlert, ArrowRight } from 'lucide-react';

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
    <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white border-l border-slate-200 shadow-2xl z-40 flex flex-col font-sans">
      {/* Header */}
      <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">FORENSIC CASE INSPECTOR</span>
            <span className={`text-xs px-2.5 py-1 rounded-md font-bold uppercase tracking-wide ${
              res.tier === 'auto_approve' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
              res.tier === 'auto_block' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
            }`}>
              {res.tier?.toUpperCase()}
            </span>
          </div>
          <p className="text-xl font-black text-slate-900 mt-1 font-mono">
            ${Number(txn.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            <span className="text-sm font-normal text-slate-500 ml-2 font-mono">({txn.merchant_category})</span>
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 transition"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Section 1: Spatial & Impossible Travel */}
        <div>
          <div className="flex items-center space-x-2 text-sm font-bold uppercase tracking-wide text-slate-800 mb-3">
            <MapPin className="w-4 h-4 text-slate-600" />
            <span>Geospatial & Velocity Intel</span>
          </div>

          <div className={`p-4 rounded-lg border ${isImpossibleTravel ? 'bg-red-50/70 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className="grid grid-cols-2 gap-3 text-sm font-mono">
              <div>
                <span className="text-slate-500 text-xs">Distance Delta:</span>
                <p className="font-bold text-slate-900">{feat.distance_from_last_txn_km?.toLocaleString()} km</p>
              </div>
              <div>
                <span className="text-slate-500 text-xs">Speed Velocity:</span>
                <p className={`font-bold ${isImpossibleTravel ? 'text-red-700' : 'text-slate-900'}`}>
                  {feat.velocity_kmh?.toLocaleString()} km/h
                </p>
              </div>
              <div className="col-span-2 pt-2 border-t border-slate-200">
                <span className="text-slate-500 text-xs">Coordinates:</span>
                <p className="text-slate-700 font-medium">
                  Lat: {txn.location?.lat?.toFixed(4)}, Lng: {txn.location?.lng?.toFixed(4)}
                </p>
              </div>
            </div>

            {isImpossibleTravel && (
              <div className="mt-3 flex items-center space-x-2 text-xs text-red-800 font-bold bg-red-100/60 p-2 rounded border border-red-200">
                <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>Triggered Impossible-Travel spatial anomaly rule (&gt;1,000 km/h).</span>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Neo4j Graph Ring Intelligence (ENLARGED) */}
        <div>
          <div className="flex items-center space-x-2 text-sm font-bold uppercase tracking-wide text-slate-800 mb-3">
            <Network className="w-4 h-4 text-slate-600" />
            <span>Neo4j Syndicate Proximity</span>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
            <div className="flex justify-between items-center text-sm font-mono">
              <span className="text-slate-600">Hop Distance to Flagged:</span>
              <span className={`px-2.5 py-1 rounded-md font-bold text-xs ${
                isDirectlyBlocklisted ? 'bg-red-100 text-red-800 border border-red-200' :
                isSyndicateHop ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-slate-200 text-slate-700'
              }`}>
                {feat.hop_distance_to_flagged === -1 ? 'CLEAN (NO PATH)' : `HOP ${feat.hop_distance_to_flagged}`}
              </span>
            </div>

            <div className="flex justify-between items-center text-sm font-mono">
              <span className="text-slate-600">Shared Accounts on Device:</span>
              <span className="font-bold text-slate-900">{feat.linked_account_count ?? 0}</span>
            </div>

            {/* Visual Mini Graph Path (ENLARGED) */}
            <div className="pt-4 border-t border-slate-200 mt-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Entity Resolution Graph</span>
              
              <div className="mt-3 p-4 bg-white rounded-lg border-2 border-slate-200 flex items-center justify-between text-sm font-mono shadow-inner">
                
                <div className="flex flex-col items-center">
                  <span className="bg-slate-100 px-3 py-2 rounded-md border border-slate-300 font-bold text-slate-800 shadow-sm">
                    {txn.user_id}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 uppercase font-bold">User</span>
                </div>

                <ArrowRight className="w-6 h-6 text-slate-400" />
                
                <div className="flex flex-col items-center">
                  <span className="bg-slate-100 px-3 py-2 rounded-md border border-slate-300 font-bold text-slate-800 shadow-sm">
                    {txn.device_id?.slice(0, 10)}...
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Device</span>
                </div>

                <ArrowRight className="w-6 h-6 text-slate-400" />
                
                <div className="flex flex-col items-center">
                  <span className={`px-4 py-2 rounded-md border-2 font-bold uppercase text-xs ${
                    isDirectlyBlocklisted ? 'bg-red-50 text-red-700 border-red-300 shadow-[0_0_10px_rgba(220,38,38,0.2)]' : 
                    isSyndicateHop ? 'bg-amber-50 text-amber-700 border-amber-300 shadow-[0_0_10px_rgba(217,119,6,0.2)]' : 
                    'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-[0_0_10px_rgba(5,150,105,0.2)]'
                  }`}>
                    {isDirectlyBlocklisted ? 'BLOCKLIST' : isSyndicateHop ? 'SYNDICATE' : 'TRUSTED'}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Status</span>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Explainable AI (SHAP Impact Breakdown) */}
        <div>
          <div className="flex items-center space-x-2 text-sm font-bold uppercase tracking-wide text-slate-800 mb-3">
            <Cpu className="w-4 h-4 text-slate-600" />
            <span>XAI SHAP Attribution Weights</span>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
            <p className="text-xs text-slate-600 leading-snug font-medium">
              Direct mathematical feature contributions to the Random Forest classifier:
            </p>

            <div className="space-y-3">
              {shapFactors.length > 0 ? (
                shapFactors.map((item, idx) => {
                  const isPositive = item.impact > 0;
                  const absImpact = Math.min(Math.abs(item.impact) * 100, 100);

                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-mono font-bold">
                        <span className="text-slate-800">{item.feature}</span>
                        <span className={`${isPositive ? 'text-red-600' : 'text-emerald-600'}`}>
                          {isPositive ? '+' : ''}{item.impact}
                        </span>
                      </div>
                      {/* Dual Directional Bar */}
                      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden flex">
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
                <p className="text-xs text-slate-400 font-mono">No SHAP attribution records returned.</p>
              )}
            </div>
          </div>
        </div>

        {/* Section 4: Raw Features Summary */}
        <div>
          <span className="text-xs font-mono uppercase text-slate-500 font-bold tracking-wider">Normalized Vector Feed</span>
          <div className="mt-1 p-3 bg-slate-900 rounded-lg text-slate-100 font-mono text-xs overflow-x-auto shadow-inner">
            <pre>{JSON.stringify(feat, null, 2)}</pre>
          </div>
        </div>

      </div>

      {/* Action Footer */}
      <div className="p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
        <button 
          onClick={onClose}
          className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-bold transition font-sans shadow-md"
        >
          DISMISS INSPECTION
        </button>
      </div>
    </div>
  );
}