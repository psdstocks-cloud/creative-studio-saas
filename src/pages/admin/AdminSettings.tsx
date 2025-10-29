import React from 'react';

const AdminSettings = () => {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-slate-50">Admin Settings</h2>
        <p className="mt-2 text-sm text-slate-400">
          Configure RBAC policies, observability hooks, and environment level toggles for the operations console.
        </p>
      </header>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 className="text-lg font-semibold text-slate-100">Roadmap</h3>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-400">
          <li>Expose BFF-proxied toggles for maintenance windows.</li>
          <li>Manage API rate limits and throttle thresholds per persona.</li>
          <li>Configure external observability (Sentry, audit sinks).</li>
        </ul>
      </section>

      <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-sm text-slate-500">
        Placeholder settings form – connect react-hook-form + Zod once configuration schema is finalized.
      </div>
    </div>
  );
};

export default AdminSettings;
