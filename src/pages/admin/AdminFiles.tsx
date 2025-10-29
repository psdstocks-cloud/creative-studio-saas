import React from 'react';

const AdminFiles = () => {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-slate-50">File Distribution</h2>
        <p className="mt-2 text-sm text-slate-400">
          Audit generated download URLs, revoke compromised links, and regenerate secure alternatives.
        </p>
      </header>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 className="text-lg font-semibold text-slate-100">Visibility</h3>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-400">
          <li>Index files by task, user, and expiry metadata.</li>
          <li>Highlight large downloads or repeated regeneration attempts.</li>
          <li>Pipe revoke/regenerate actions into the audit sink.</li>
        </ul>
      </section>

      <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-sm text-slate-500">
        Placeholder list view – connect to `/api/v2/order/{task_id}/download` via the BFF for secure proxying.
      </div>
    </div>
  );
};

export default AdminFiles;
