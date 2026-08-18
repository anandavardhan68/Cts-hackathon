import { Link } from 'react-router-dom';
import { ShieldCheck, Network, BookOpen, ArrowRight, Zap, Eye, GitBranch } from 'lucide-react';

const FEATURES = [
  {
    icon: Zap,
    title: 'Dual-model scoring',
    body: 'A supervised classifier and an unsupervised anomaly detector score every transaction independently. When they disagree, that disagreement is itself a signal — routed to manual review instead of silently resolved.',
  },
  {
    icon: Eye,
    title: 'Explainable by default',
    body: 'Every score ships with its top contributing factors, in plain terms — not a black-box number a human has to trust blind.',
  },
  {
    icon: GitBranch,
    title: 'Network-aware',
    body: 'Devices linked across multiple accounts are caught before they are ever individually blocklisted, using graph traversal — not just a lookup table.',
  },
];

export default function Landing() {
  return (
    <div>
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-700 bg-brand-50 px-3 py-1 rounded-full mb-6">
            <ShieldCheck className="w-3.5 h-3.5" />
            Fraud Detection as a Service
          </div>
          <h1 className="text-5xl font-display font-800 text-ink-900 leading-tight mb-4">
            Know which transactions to trust, in one call.
          </h1>
          <p className="text-lg text-ink-700 leading-relaxed mb-8">
            AEGIS scores every transaction against behavioral, geospatial,
            and device-network signals — and tells you exactly why, in
            plain terms, not just a number.
          </p>
          <div className="aegis-arc w-40 mb-8" />
          <div className="flex flex-wrap gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 bg-brand-500 text-white px-5 py-3 rounded-xl2 font-medium hover:bg-brand-700 transition-colors"
            >
              Open Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/docs"
              className="inline-flex items-center gap-2 bg-surface border border-brand-200 text-ink-900 px-5 py-3 rounded-xl2 font-medium hover:bg-brand-50 transition-colors"
            >
              <BookOpen className="w-4 h-4" /> Integration Docs
            </Link>
            <Link
              to="/graph"
              className="inline-flex items-center gap-2 bg-surface border border-brand-200 text-ink-900 px-5 py-3 rounded-xl2 font-medium hover:bg-brand-50 transition-colors"
            >
              <Network className="w-4 h-4" /> Explore the Graph
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="bg-surface border border-brand-200/60 rounded-xl2 p-6 shadow-sm"
            >
              <Icon className="w-6 h-6 text-brand-500 mb-4" strokeWidth={1.75} />
              <h3 className="font-display font-700 text-ink-900 mb-2">{title}</h3>
              <p className="text-sm text-ink-700 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="bg-surface border border-brand-200/60 rounded-xl2 p-8 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-3xl font-display font-800 text-brand-700">12</div>
            <div className="text-sm text-ink-500 mt-1">behavioral + network features</div>
          </div>
          <div>
            <div className="text-3xl font-display font-800 text-brand-700">3</div>
            <div className="text-sm text-ink-500 mt-1">risk tiers per transaction</div>
          </div>
          <div>
            <div className="text-3xl font-display font-800 text-brand-700">2</div>
            <div className="text-sm text-ink-500 mt-1">independent models, always agreeing to disagree</div>
          </div>
        </div>
      </section>
    </div>
  );
}
