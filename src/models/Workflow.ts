/**
 * Workflow-related types and interfaces
 */

export interface WorkflowConfig {
  statusMapping: Record<string, string>;
  transitions: Record<string, string[]>;
  taskTypes: string[];
  defaultStatus: string;
  requiresValidation: boolean;
  templates?: TemplateConfig;
}

export interface TemplateConfig {
  override: boolean;
  customPath?: string;
}


export interface ExecutionMode {
  showProgress: boolean;
  autoUpdateStatus: boolean;
}

export interface ExecutionResult {
  success: boolean;
  taskId: string;
  sectionsProcessed?: number;
  totalSections?: number;
  todosCompleted?: number;
  totalTodos?: number;
  finalStats: TodoStats;
  progression?: ExecutionStep[];
  message: string;
  nextAction?: ExecutionAction;
}

export type ExecutionAction = 
  | { type: 'completed'; message: string; stats: TodoStats }
  | { type: 'needs_implementation'; todo: string; instructions: string; context: ExecutionContext }
  | { type: 'needs_analysis'; message: string; context: ExecutionContext }
  | { type: 'continue'; message: string };

export interface ExecutionContext {
  taskId: string;
  taskTitle: string;
  todoStats: TodoStats;
  currentTodo?: string;
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