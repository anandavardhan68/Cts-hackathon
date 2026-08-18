import React from 'react';
import { Shield } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-8 px-6 mt-auto">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center text-sm text-slate-500">
        <div className="flex items-center space-x-2 mb-4 md:mb-0">
          <Shield className="w-5 h-5 text-slate-400" />
          <span className="font-bold text-slate-700">AEGIS FDaaS</span>
        </div>
        <div className="flex space-x-6">
          <span className="hover:text-slate-900 transition cursor-pointer">Documentation</span>
          <span className="hover:text-slate-900 transition cursor-pointer">API Status</span>
          <span className="hover:text-slate-900 transition cursor-pointer">Support</span>
        </div>
      </div>
    </footer>
  );
}


// import { Link } from 'react-router-dom';
// import { GitHub } from 'lucide-react';

// export default function Footer() {
//   return (
//     <footer className="border-t border-brand-200/60 bg-surface mt-24">
//       <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
//         <div>
//           <div className="flex items-center gap-2 mb-2">
//             <ShieldCheck className="w-5 h-5 text-brand-500" />
//             <span className="font-display font-700 text-ink-900">AEGIS</span>
//           </div>
//           <p className="text-sm text-ink-500 leading-relaxed">
//             Real-time transaction risk scoring — behavioral, geospatial, and
//             network signals in one call.
//           </p>
//         </div>
//         <div>
//           <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-500 mb-3">
//             Product
//           </h4>
//           <ul className="space-y-2 text-sm">
//             <li><Link to="/dashboard" className="text-ink-700 hover:text-brand-500">Dashboard</Link></li>
//             <li><Link to="/graph" className="text-ink-700 hover:text-brand-500">Graph Explorer</Link></li>
//             <li><Link to="/docs" className="text-ink-700 hover:text-brand-500">API Docs</Link></li>
//           </ul>
//         </div>
//         <div>
//           <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-500 mb-3">
//             Project
//           </h4>
//           <a
//             href="https://github.com/anandavardhan68/Cts-hackathon"
//             target="_blank"
//             rel="noreferrer"
//             className="inline-flex items-center gap-2 text-sm text-ink-700 hover:text-brand-500"
//           >
//             <Github className="w-4 h-4" /> Source on GitHub
//           </a>
//         </div>
//       </div>
//       <div className="text-center text-xs text-ink-500 pb-6">
//         Built for the Cognizant NPN Hackathon.
//       </div>
//     </footer>
//   );
// }
