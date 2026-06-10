-- Projects table
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  description text,
  color text default '#6c5ce7',
  priority text check (priority in ('low', 'medium', 'high', 'urgent')) default 'medium',
  status text check (status in ('active', 'paused', 'completed', 'archived')) default 'active',
  deadline date,
  user_id uuid references auth.users(id) on delete cascade
);

-- Tasks table (supports nesting via parent_task_id)
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  project_id uuid references projects(id) on delete cascade not null,
  parent_task_id uuid references tasks(id) on delete cascade,
  title text not null,
  notes text,
  priority text check (priority in ('low', 'medium', 'high', 'urgent')) default 'medium',
  status text check (status in ('todo', 'in_progress', 'done')) default 'todo',
  deadline date,
  sort_order integer default 0,
  user_id uuid references auth.users(id) on delete cascade
);

-- Enable RLS
alter table projects enable row level security;
alter table tasks enable row level security;

-- RLS policies
create policy "Users own their projects" on projects
  for all using (auth.uid() = user_id);

create policy "Users own their tasks" on tasks
  for all using (auth.uid() = user_id);

-- Indexes
create index if not exists tasks_project_id_idx on tasks(project_id);
create index if not exists tasks_parent_task_id_idx on tasks(parent_task_id);
