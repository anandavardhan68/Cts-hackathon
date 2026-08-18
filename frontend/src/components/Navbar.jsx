import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

const LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/graph', label: 'Graph Explorer' },
  { to: '/docs', label: 'API Docs' },
];

export default function Navbar() {
  const { pathname } = useLocation();

  return (
    <header className="border-b border-brand-200/60 bg-surface/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-brand-500" strokeWidth={2} />
          <span className="font-display font-800 text-lg tracking-tight text-ink-900">
            AEGIS
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          {LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === link.to
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-ink-700 hover:bg-canvas hover:text-ink-900'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
