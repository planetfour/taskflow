-- Add columns to tasks
alter table tasks 
  add column if not exists completed_at timestamptz,
  add column if not exists recurrence_type text check (recurrence_type in ('daily','weekly','biweekly','monthly','custom')),
  add column if not exists recurrence_interval integer, -- for custom: every N days
  add column if not exists recurrence_next_due date;

-- Areas table
create table if not exists areas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  color text default '#6c5ce7',
  user_id uuid references auth.users(id) on delete cascade
);

-- Project <-> Area join
create table if not exists project_areas (
  project_id uuid references projects(id) on delete cascade,
  area_id uuid references areas(id) on delete cascade,
  primary key (project_id, area_id)
);

-- Task <-> Area join
create table if not exists task_areas (
  task_id uuid references tasks(id) on delete cascade,
  area_id uuid references areas(id) on delete cascade,
  primary key (task_id, area_id)
);

-- RLS
alter table areas enable row level security;
alter table project_areas enable row level security;
alter table task_areas enable row level security;

create policy "Users own their areas" on areas
  for all using (auth.uid() = user_id);

create policy "Users own their project_areas" on project_areas
  for all using (
    exists (select 1 from projects p where p.id = project_id and p.user_id = auth.uid())
  );

create policy "Users own their task_areas" on task_areas
  for all using (
    exists (select 1 from tasks t where t.id = task_id and t.user_id = auth.uid())
  );

-- Indexes
create index if not exists areas_user_id_idx on areas(user_id);
create index if not exists project_areas_project_id_idx on project_areas(project_id);
create index if not exists task_areas_task_id_idx on task_areas(task_id);
