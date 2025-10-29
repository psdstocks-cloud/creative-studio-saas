import React from 'react';

const AdminAudit = () => {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-slate-50">Audit Trail</h2>
        <p className="mt-2 text-sm text-slate-400">
          Every privileged write funnels through this immutable log for compliance-ready visibility.
        </p>
      </header>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 className="text-lg font-semibold text-slate-100">What to Capture</h3>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-400">
          <li>Actor metadata (user id, role set) and timestamp.</li>
          <li>Target resource identifiers (order id, user id, job id).</li>
          <li>Supplied reason codes and before/after payload diffs.</li>
        </ul>
      </section>

      <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-sm text-slate-500">
        Placeholder timeline – back with infinite scroll when `/admin/audit` endpoint is defined.
      </div>
    </div>
  );
};

export default AdminAudit;
