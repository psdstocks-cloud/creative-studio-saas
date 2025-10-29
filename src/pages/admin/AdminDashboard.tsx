import React from 'react';

const AdminDashboard = () => {
  const metrics = [
    { name: 'Orders (24h)', value: '—', helper: 'Live updates every 2s via TanStack Query polling.' },
    { name: 'Active AI Jobs', value: '—', helper: 'Shows running jobs and historical completion rate.' },
    { name: 'Total Spend (30d)', value: '—', helper: 'Aggregated across stock orders and AI actions.' },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-slate-50">Operational KPIs</h2>
        <p className="mt-2 text-sm text-slate-400">
          Monitor mission-critical signals for stock delivery, AI workloads, and spend in a single glance.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.name} className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-400">{metric.name}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-50">{metric.value}</p>
            <p className="mt-3 text-xs text-slate-500">{metric.helper}</p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 className="text-lg font-semibold text-slate-100">Realtime Activity Stream</h3>
        <p className="mt-2 text-sm text-slate-400">
          Feed placeholder – wire TanStack Query to `/api/order/{task_id}/status` and `/api/aig/public/{job_id}` to respect ≥ 2s polling intervals.
        </p>
        <div className="mt-4 rounded-lg border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">
          Add a virtualized list to surface order lifecycle changes, job completions, and escalations with timestamps.
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
