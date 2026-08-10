-- Add "every_n_days" recurrence type (repeat every N days), distinct from the
-- existing 'custom' type which uses recurrence_interval as a weekday bitmask.
alter table tasks drop constraint if exists tasks_recurrence_type_check;
alter table tasks add constraint tasks_recurrence_type_check
  check (recurrence_type in ('daily','weekly','biweekly','monthly','custom','every_n_days'));
