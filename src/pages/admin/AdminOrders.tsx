import React from 'react';

const AdminOrders = () => {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-slate-50">Stock Orders</h2>
        <p className="mt-2 text-sm text-slate-400">
          Track order ingestion, payment state, and download eligibility across all supported stock providers.
        </p>
      </header>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 className="text-lg font-semibold text-slate-100">Operational Toolkit</h3>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-400">
          <li>Surface TanStack Table filters for `site`, `status`, and `task_id`.</li>
          <li>Expose regenerate download link action hitting `/api/v2/order/{task_id}/download`.</li>
          <li>Enforce 2s polling cadence when monitoring `/api/order/{task_id}/status`.</li>
        </ul>
      </section>

      <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-sm text-slate-500">
        Placeholder order table – integrate once the admin BFF stabilizes and audit logging is wired.
      </div>
    </div>
  );
};

export default AdminOrders;
