
create table if not exists transactions (
  id text primary key,
  user_id text not null,
  source text,
  date text,
  description text,
  category text,
  amount numeric,
  type text,
  anomaly boolean default false,
  anomaly_reason text,
  created_at timestamptz default now()
);

create table if not exists profiles (
  user_id text primary key,
  data jsonb,
  updated_at timestamptz default now()
);

create table if not exists chat_history (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  role text,
  content text,
  created_at timestamptz default now()
);

alter table transactions enable row level security;
alter table profiles enable row level security;
alter table chat_history enable row level security;

create policy "Allow all" on transactions for all using (true);
create policy "Allow all" on profiles for all using (true);
create policy "Allow all" on chat_history for all using (true);
