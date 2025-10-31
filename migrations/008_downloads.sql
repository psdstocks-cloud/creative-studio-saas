-- Downloads schema
create table if not exists download_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  status text not null default 'queued',
  items_count integer not null default 0,
  items_completed integer not null default 0,
  items_failed integer not null default 0,
  bytes_total bigint,
  bytes_downloaded bigint not null default 0,
  provider_batch_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists download_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references download_jobs(id) on delete cascade,
  provider text not null,
  source_url text not null,
  filename text,
  bytes_total bigint,
  bytes_downloaded bigint not null default 0,
  status text not null default 'queued',
  error_message text,
  thumb_url text,
  started_at timestamptz,
  finished_at timestamptz,
  meta jsonb default '{}'::jsonb
);

create index if not exists idx_download_jobs_user_created_at on download_jobs (user_id, created_at desc);
create index if not exists idx_download_items_job on download_items (job_id);
create index if not exists idx_download_jobs_status on download_jobs (status);
