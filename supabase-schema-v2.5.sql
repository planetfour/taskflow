-- Day planner: a lightweight, UI-only scheduling layer. Assigns tasks to
-- 30-minute time slots for a given date without ever touching the tasks
-- table itself (no deadline/status writes) — purely a visual arrangement
-- that persists across refreshes and devices for reference.

create table if not exists planner_slots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  user_id uuid references auth.users(id) on delete cascade not null,
  task_id uuid references tasks(id) on delete cascade not null,
  date date not null,
  start_minutes integer not null check (start_minutes >= 0 and start_minutes < 1440),
  sort_order integer default 0,
  unique (user_id, date, task_id)
);

alter table planner_slots enable row level security;

create policy "Users own their planner slots" on planner_slots
  for all using (auth.uid() = user_id);

create index if not exists planner_slots_user_date_idx on planner_slots(user_id, date);
create index if not exists planner_slots_task_id_idx on planner_slots(task_id);
