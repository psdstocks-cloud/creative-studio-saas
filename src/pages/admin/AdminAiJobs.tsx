import React from 'react';

const AdminAiJobs = () => {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-slate-50">AI Job Monitor</h2>
        <p className="mt-2 text-sm text-slate-400">
          Observe queued, running, and completed AI generations with actionable controls for upscale/vary operations.
        </p>
      </header>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 className="text-lg font-semibold text-slate-100">Job Lifecycle</h3>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-400">
          <li>Poll `/api/aig/public/{job_id}` with ≥2s cadence for status updates.</li>
          <li>Trigger `/api/aig/actions` mutations (upscale, vary) with audit reason prompts.</li>
          <li>Persist job history for post-incident review and SLA tracking.</li>
        </ul>
      </section>

      <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-sm text-slate-500">
        Placeholder TanStack table – wire React Query once the BFF exposes consolidated AI job endpoints.
      </div>
    </div>
  );
};

export default AdminAiJobs;
