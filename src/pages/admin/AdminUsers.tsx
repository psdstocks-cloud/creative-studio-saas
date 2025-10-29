import React from 'react';

const AdminUsers = () => {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-slate-50">User Directory</h2>
        <p className="mt-2 text-sm text-slate-400">
          Search, filter, and inspect user balances, order history, and RBAC assignments.
        </p>
      </header>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 className="text-lg font-semibold text-slate-100">Management Actions</h3>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-400">
          <li>Attach TanStack Table with virtualized rows for quick lookups.</li>
          <li>Expose impersonation-safe flows for regenerating download links.</li>
          <li>Trigger balance adjustments with audit reason prompts.</li>
        </ul>
      </section>

      <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-sm text-slate-500">
        Placeholder data grid – bind to `/api/me`, `/api/stockorder/{site}/{id}`, and other admin endpoints once BFF is ready.
      </div>
    </div>
  );
};

export default AdminUsers;
