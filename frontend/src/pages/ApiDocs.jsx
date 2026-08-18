const REQUEST_EXAMPLE = `curl -X POST https://your-gateway-url/api/v1/evaluate-risk \\
  -H "Content-Type: application/json" \\
  -d '{
    "user_id": "user_015",
    "device_id": "device_007",
    "amount": 4200,
    "merchant_category": "shopping_net",
    "timestamp": "2026-08-18T09:12:00Z",
    "location": { "lat": 17.385, "lng": 78.4867 }
  }'`;

const RESPONSE_EXAMPLE = `{
  "transaction": { "...": "the original request" },
  "features": { "...": "12 engineered risk features" },
  "result": {
    "isolation_forest_score": 0.41,
    "random_forest_score": 0.62,
    "tier": "manual_review",
    "shap_factors": [
      { "feature": "amount", "impact": 0.31 },
      { "feature": "hour_of_day", "impact": -0.14 }
    ]
  }
}`;

const FIELDS = [
  ['user_id', 'string', 'Stable account identifier — never a name or card number.'],
  ['device_id', 'string', 'Raw device fingerprint. Hashed server-side before storage — never sent back.'],
  ['amount', 'number', 'Transaction amount.'],
  ['merchant_category', 'string', 'Merchant category code.'],
  ['timestamp', 'string (ISO 8601)', 'When the transaction occurred.'],
  ['location.lat / location.lng', 'number', 'Cardholder or terminal location.'],
];

const TIERS = [
  ['auto_approve', 'bg-status-approveBg text-status-approve', 'Safe to process without review.'],
  ['manual_review', 'bg-status-reviewBg text-status-review', 'Ambiguous — route to a human.'],
  ['auto_block', 'bg-status-blockBg text-status-block', 'High-confidence fraud — hold the transaction.'],
];

function CodeBlock({ children }) {
  return (
    <pre className="bg-ink-900 text-brand-50 rounded-xl2 p-5 text-sm font-mono overflow-x-auto">
      {children}
    </pre>
  );
}

export default function ApiDocs() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-display font-800 text-ink-900 mb-2">
        Integrate AEGIS
      </h1>
      <p className="text-ink-700 mb-10">
        One endpoint, one call, a risk tier back. No SDK required.
      </p>

      <section className="mb-10">
        <h2 className="text-xl font-display font-700 text-ink-900 mb-3">
          Score a transaction
        </h2>
        <p className="text-sm text-ink-700 mb-4">
          <span className="font-mono bg-brand-50 text-brand-700 px-2 py-0.5 rounded">POST</span>
          {' '}
          <span className="font-mono">/api/v1/evaluate-risk</span>
        </p>
        <CodeBlock>{REQUEST_EXAMPLE}</CodeBlock>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-display font-700 text-ink-900 mb-3">Request fields</h2>
        <div className="bg-surface border border-brand-200/60 rounded-xl2 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-ink-700">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Field</th>
                <th className="text-left px-4 py-2 font-medium">Type</th>
                <th className="text-left px-4 py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {FIELDS.map(([field, type, note]) => (
                <tr key={field} className="border-t border-brand-200/40">
                  <td className="px-4 py-2 font-mono text-brand-700">{field}</td>
                  <td className="px-4 py-2 text-ink-500">{type}</td>
                  <td className="px-4 py-2 text-ink-700">{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-display font-700 text-ink-900 mb-3">Response</h2>
        <CodeBlock>{RESPONSE_EXAMPLE}</CodeBlock>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-display font-700 text-ink-900 mb-3">Risk tiers</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TIERS.map(([tier, badgeClasses, desc]) => (
            <div key={tier} className="border border-brand-200/60 rounded-xl2 p-4">
              <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full mb-2 ${badgeClasses}`}>
                {tier}
              </span>
              <p className="text-sm text-ink-700">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
