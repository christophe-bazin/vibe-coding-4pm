/**
 * Workflow-related types and interfaces
 */

export interface WorkflowConfig {
  statusMapping: Record<string, string>;
  transitions: Record<string, string[]>;
  taskTypes: string[];
  defaultStatus: string;
  requiresValidation: boolean;
}


export interface ExecutionMode {
  type: 'auto' | 'step' | 'batch';
  showProgress: boolean;
  autoUpdateStatus: boolean;
}

export interface ExecutionResult {
  success: boolean;
  taskId: string;
  mode: ExecutionMode['type'];
  sectionsProcessed?: number;
  totalSections?: number;
  todosCompleted?: number;
  totalTodos?: number;
  finalStats: TodoStats;
  progression?: ExecutionStep[];
  message: string;
}

export interface ExecutionStep {
  type: 'section' | 'todo' | 'status_update';
  message: string;
  sectionName?: string;
  todoText?: string;
  completed: boolean;
  timestamp: Date;
}

import { TodoStats } from './Todo.js';