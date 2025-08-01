import { NotionTask } from '../models/Task.js';
import { TodoAnalysisResult, TodoUpdateRequest } from '../models/Todo.js';

export interface TaskProvider {
  getTask(taskId: string): Promise<NotionTask>;
  createTask(title: string, taskType: string, description: string): Promise<NotionTask>;
  updateTask(taskId: string, updates: { title?: string; taskType?: string; status?: string }): Promise<void>;
  updateTaskStatus(taskId: string, status: string): Promise<void>;

  analyzeTodos(taskId: string, includeHierarchy?: boolean): Promise<TodoAnalysisResult>;
  updateTodos(taskId: string, updates: TodoUpdateRequest[]): Promise<{ updated: number; failed: number }>;
  updateSingleTodo(taskId: string, todoText: string, completed: boolean): Promise<boolean>;

  getProviderName(): string;
  getProviderType(): string;
}