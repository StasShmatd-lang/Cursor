create table if not exists events (
  id text primary key,
  host_key_hash text not null,
  vote_key_hash text not null,
  state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
