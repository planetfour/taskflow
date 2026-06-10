-- Fix RLS policies for project_areas and task_areas to explicitly allow SELECT

drop policy if exists "Users own their project_areas" on project_areas;
drop policy if exists "Users own their task_areas" on task_areas;

create policy "Users own their project_areas" on project_areas
  for all using (
    exists (select 1 from projects p where p.id = project_id and p.user_id = auth.uid())
  );

create policy "Users own their task_areas" on task_areas
  for all using (
    exists (select 1 from tasks t where t.id = task_id and t.user_id = auth.uid())
  );
