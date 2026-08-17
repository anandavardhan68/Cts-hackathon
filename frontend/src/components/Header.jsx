import React from 'react';
import { Shield, Radio, Terminal, Code2, RefreshCw } from 'lucide-react';

export default function Header({ isConnected, onOpenSandbox, onOpenApiDocs, onClearStream }) {
  return (
    <header className="bg-white border-b border-sentinel-200 sticky top-0 z-30 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded bg-sentinel-900 flex items-center justify-center text-white">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-sentinel-900 tracking-tight text-base">SENTINEL</span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-sentinel-100 border border-sentinel-300 text-sentinel-700 font-bold">
                FDaaS OPS
              </span>
            </div>
            <p className="text-xs text-sentinel-500 font-mono">NODE GATEWAY :4000 // ML ENGINE :5001</p>
          </div>
        </div>

        <div className="h-5 w-px bg-sentinel-200 hidden md:block" />

        {/* Live Status indicator */}
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-medium ${
            isConnected 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            {isConnected ? 'SOCKET LIVE' : 'DISCONNECTED'}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <button
          onClick={onClearStream}
          title="Clear Table"
          className="px-2.5 py-1.5 text-xs font-medium text-sentinel-600 hover:text-sentinel-900 hover:bg-sentinel-100 rounded border border-sentinel-200 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onOpenApiDocs}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-sentinel-700 bg-white hover:bg-sentinel-50 rounded border border-sentinel-300 transition shadow-sm"
        >
          <Code2 className="w-3.5 h-3.5 text-sentinel-500" />
          <span>API Docs</span>
        </button>

        <button
          onClick={onOpenSandbox}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-white bg-sentinel-900 hover:bg-sentinel-800 rounded transition shadow-sm"
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Test Sandbox</span>
        </button>
      </div>
    </header>
  );
}