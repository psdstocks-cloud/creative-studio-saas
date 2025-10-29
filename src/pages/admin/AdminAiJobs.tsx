import React, { useMemo, useState } from 'react';
import { useAdminAiJob } from '../../hooks/admin/useAdminAiJob';
import { useAdminAiActivity } from '../../hooks/admin/useAdminAiActivity';
import { ArrowPathIcon } from '../../components/icons/Icons';

const renderStatusBadge = (status?: string) => {
  const base =
    'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide';
  switch (status) {
    case 'completed':
      return (
        <span className={`${base} border-emerald-500/40 bg-emerald-500/10 text-emerald-300`}>
          Completed
        </span>
      );
    case 'processing':
      return (
        <span className={`${base} border-amber-500/40 bg-amber-500/10 text-amber-300`}>
          Processing
        </span>
      );
    case 'failed':
      return (
        <span className={`${base} border-rose-500/40 bg-rose-500/10 text-rose-300`}>
          Failed
        </span>
      );
    default:
      return (
        <span className={`${base} border-slate-600 bg-slate-800/70 text-slate-300`}>
          {status || 'Unknown'}
        </span>
      );
  }
};

const AdminAiJobs = () => {
  const [jobIdInput, setJobIdInput] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const jobQuery = useAdminAiJob(selectedJobId);
  const activityQuery = useAdminAiActivity();

  const job = jobQuery.data;
  const files = useMemo(() => job?.files ?? [], [job?.files]);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-50">AI Job Monitor</h2>
        <p className="text-sm text-slate-400">
          Inspect generation jobs by ID, monitor upstream polling responses, and review recent
          AI-related audit events.
        </p>
      </header>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <form
          className="flex flex-col gap-4 md:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            setSelectedJobId(jobIdInput.trim() || null);
          }}
        >
          <div className="flex-1">
            <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-400">
              Job ID
              <input
                value={jobIdInput}
                onChange={(event) => setJobIdInput(event.target.value)}
                placeholder="Enter AI job ID"
                className="mt-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-slate-500 focus:outline-none"
              />
            </label>
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            {jobQuery.isFetching ? (
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowPathIcon className="h-4 w-4" />
            )}
            {selectedJobId ? 'Refetch Job' : 'Lookup Job'}
          </button>
        </form>
        {jobQuery.error ? (
          <p className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
            {(jobQuery.error as Error).message || 'Unable to load job.'}
          </p>
        ) : null}
      </section>

      {job ? (
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-slate-100">Job Detail</h3>
              <p className="font-mono text-xs text-slate-500">{job._id}</p>
              {renderStatusBadge(job.status)}
            </div>
            <div className="text-sm text-slate-400">
              <p>Created: {job.created_at ? new Date(job.created_at).toLocaleString() : 'Unknown'}</p>
              <p>Completion: {job.percentage_complete ?? 0}%</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Prompt</h4>
              <p className="mt-2 whitespace-pre-line rounded-lg border border-slate-800/60 bg-slate-950/40 p-4 text-sm text-slate-200">
                {job.prompt || '—'}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Outputs</h4>
              {files.length ? (
                <div className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {files.map((file) => (
                    <a
                      key={`${file.index}-${file.download}`}
                      href={file.download}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group overflow-hidden rounded-lg border border-slate-800/60 bg-slate-950/40"
                    >
                      <img
                        src={file.thumb_lg || file.thumb_sm}
                        alt={`Output ${file.index}`}
                        className="h-40 w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                      <div className="border-t border-slate-800/60 px-3 py-2 text-xs text-slate-400">
                        Download #{file.index + 1}
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-lg border border-dashed border-slate-700 bg-slate-950/30 p-4 text-sm text-slate-500">
                  No files available for this job yet.
                </p>
              )}
            </div>
          </div>
        </section>
      ) : selectedJobId ? (
        <p className="rounded-lg border border-dashed border-slate-700 bg-slate-950/30 p-4 text-sm text-slate-500">
          Loading job details…
        </p>
      ) : null}

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 className="text-lg font-semibold text-slate-100">Recent AI Activity</h3>
        <p className="mt-1 text-sm text-slate-400">
          Events derived from the audit log that reference <code className="font-mono">/aig/*</code> endpoints.
        </p>
        <div className="mt-4 space-y-4">
          {(activityQuery.data || []).map((entry) => (
            <div
              key={`${entry.requestId}-${entry.timestamp}`}
              className="rounded-lg border border-slate-800/60 bg-slate-950/40 p-4"
            >
              <p className="text-sm font-semibold text-slate-200">{entry.action}</p>
              <p className="mt-1 text-xs text-slate-400">
                {entry.method} {entry.path}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {entry.actor?.email || entry.actor?.id || 'Unknown actor'} • {entry.timestamp}
              </p>
              {entry.metadata?.auditReason ? (
                <p className="mt-2 text-xs text-slate-400">
                  Reason: {String(entry.metadata.auditReason)}
                </p>
              ) : null}
            </div>
          ))}
          {activityQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 border border-slate-800/60 bg-slate-950/40 p-4 text-xs text-slate-400">
              <ArrowPathIcon className="h-4 w-4 animate-spin" /> Loading activity…
            </div>
          ) : null}
          {!activityQuery.isLoading && (activityQuery.data?.length ?? 0) === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-700 bg-slate-950/30 p-4 text-center text-sm text-slate-500">
              No AI activity recorded yet.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
};

export default AdminAiJobs;
