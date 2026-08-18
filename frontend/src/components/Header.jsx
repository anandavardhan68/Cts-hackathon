import React from 'react';
import { Shield, Terminal, Code2, RefreshCw } from 'lucide-react';

export default function Header({ isConnected, onOpenSandbox, onOpenApiDocs, onClearStream }) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-md">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <span className="text-2xl font-black text-slate-900 tracking-tight">AEGIS</span>
              <span className="text-xs font-mono uppercase px-2 py-1 rounded bg-slate-100 border border-slate-300 text-slate-700 font-bold">
                FDaaS OPS
              </span>
            </div>
          </div>
        </div>

        <div className="h-8 w-px bg-slate-200 hidden md:block" />

        {/* Live Status indicator */}
        <div className="flex items-center">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-mono font-bold shadow-sm ${
            isConnected 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            <span className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            {isConnected ? 'LIVE STREAM CONNECTED' : 'DISCONNECTED'}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <button
          onClick={onClearStream}
          title="Clear Table"
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md border border-slate-200 transition"
        >
          <RefreshCw className="w-5 h-5" />
        </button>

        <button
          onClick={onOpenApiDocs}
          className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 rounded-md border border-slate-300 transition shadow-sm"
        >
          <Code2 className="w-4 h-4 text-slate-500" />
          <span>API Docs</span>
        </button>

        <button
          onClick={onOpenSandbox}
          className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition shadow-sm"
        >
          <Terminal className="w-4 h-4" />
          <span>Test Sandbox</span>
        </button>
      </div>
    </header>
  );
}