/**
 * Task-related types and interfaces
 */

export interface Task {
  id: string;
  title: string;
  status: string;
  type?: string;
  description?: string;
  url?: string;
  createdTime?: string;
  lastEditedTime?: string;
  properties?: Record<string, any>;
}

export interface TaskStatus {
  current: string;
  available: string[];
  recommended?: string;
  shouldAutoProgress?: boolean;
  reason?: string;
}

export interface TaskMetadata {
  id: string;
  title: string;
  status: string;
  type: string;
  todoStats: TodoStats;
  statusInfo: TaskStatus;
}

export interface TodoStats {
  total: number;
  completed: number;
  percentage: number;
  nextTodos: string[];
}