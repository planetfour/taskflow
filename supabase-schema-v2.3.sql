-- Allow tasks to exist without a project ("No Project" tasks)

alter table tasks alter column project_id drop not null;

alter table tasks drop constraint if exists tasks_project_id_fkey;
alter table tasks add constraint tasks_project_id_fkey
  foreign key (project_id) references projects(id) on delete set null;
