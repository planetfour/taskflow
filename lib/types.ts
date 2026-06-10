export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived'
export type TaskStatus = 'todo' | 'in_progress' | 'done'

export interface Project {
  id: string
  created_at: string
  name: string
  description: string | null
  color: string
  priority: Priority
  status: ProjectStatus
  deadline: string | null
  user_id: string
  task_count?: number
  completed_count?: number
}

export interface Task {
  id: string
  created_at: string
  project_id: string
  parent_task_id: string | null
  title: string
  notes: string | null
  priority: Priority
  status: TaskStatus
  deadline: string | null
  sort_order: number
  user_id: string
  subtasks?: Task[]
}
