import { Task } from '../models/Task.js';
import { TodoAnalysisResult, TodoUpdateRequest } from '../models/Todo.js';
import { PageContent } from '../models/Page.js';

export interface TaskProvider {
  getTask(taskId: string): Promise<Task>;
  createTask(title: string, taskType: string, description: string): Promise<Task>;
  updateTask(taskId: string, updates: { title?: string; taskType?: string; status?: string }): Promise<void>;
  updateTaskStatus(taskId: string, status: string): Promise<void>;

  analyzeTodos(taskId: string, includeHierarchy?: boolean): Promise<TodoAnalysisResult>;
  updateTodos(taskId: string, updates: TodoUpdateRequest[]): Promise<{ updated: number; failed: number }>;
  updateSingleTodo(taskId: string, todoText: string, completed: boolean): Promise<boolean>;
  appendToTask(taskId: string, content: string): Promise<void>;

  getProviderName(): string;
  getProviderType(): string;

  // Page operations
  readPage(pageId: string, includeLinkedPages?: boolean): Promise<PageContent>;
  createNotionPage(databaseId: string, title: string, content?: string, properties?: Record<string, any>): Promise<PageContent>;
  updateNotionPage(pageId: string, title?: string, content?: string, properties?: Record<string, any>, mode?: 'append' | 'replace' | 'insert', insertAfter?: string): Promise<void>;
}