import React from 'react';

const AdminStockSources = () => {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-slate-50">Stock Source Configuration</h2>
        <p className="mt-2 text-sm text-slate-400">
          Manage provider availability, pricing, and throttling controls for downstream order flows.
        </p>
      </header>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 className="text-lg font-semibold text-slate-100">Configuration Checklist</h3>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-400">
          <li>Sync active providers from `/api/stocksites`.</li>
          <li>Allow price overrides with RBAC enforcement and audit prompts.</li>
          <li>Display historical performance to justify toggles.</li>
        </ul>
      </section>

      <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-sm text-slate-500">
        Placeholder form & table – integrate react-hook-form + Zod validations for configuration changes.
      </div>
    </div>
  );
};

export default AdminStockSources;
