import { TaskProvider } from '../../interfaces/TaskProvider.js';
import { Task } from '../../models/Task.js';
import { TodoAnalysisResult, TodoUpdateRequest } from '../../models/Todo.js';
import { PageContent } from '../../models/Page.js';

export class LinearProvider implements TaskProvider {
  constructor(private config: { apiKey: string; teamId: string }) {
    // Linear API initialization would go here
  }

  async getTask(taskId: string): Promise<Task> {
    throw new Error('Linear provider not implemented yet');
  }

  async createTask(title: string, taskType: string, description: string): Promise<Task> {
    throw new Error('Linear provider not implemented yet');
  }

  async updateTask(taskId: string, updates: { title?: string; taskType?: string; status?: string }): Promise<void> {
    throw new Error('Linear provider not implemented yet');
  }

  async updateTaskStatus(taskId: string, status: string): Promise<void> {
    throw new Error('Linear provider not implemented yet');
  }

  async analyzeTodos(taskId: string, includeHierarchy?: boolean): Promise<TodoAnalysisResult> {
    throw new Error('Linear provider not implemented yet');
  }

  async updateTodos(taskId: string, updates: TodoUpdateRequest[]): Promise<{ updated: number; failed: number }> {
    throw new Error('Linear provider not implemented yet');
  }

  async updateSingleTodo(taskId: string, todoText: string, completed: boolean): Promise<boolean> {
    throw new Error('Linear provider not implemented yet');
  }

  async appendToTask(taskId: string, content: string): Promise<void> {
    throw new Error('Linear provider not implemented yet');
  }

  getProviderName(): string {
    return 'Linear';
  }

  getProviderType(): string {
    return 'linear';
  }

  async readPage(pageId: string, includeLinkedPages?: boolean): Promise<PageContent> {
    throw new Error('Linear page reading not implemented yet');
  }

  async createNotionPage(databaseId: string, title: string, content?: string, properties?: Record<string, any>): Promise<PageContent> {
    throw new Error('createNotionPage is only available for Notion provider');
  }

  async updateNotionPage(pageId: string, title?: string, content?: string, properties?: Record<string, any>, mode?: 'append' | 'replace' | 'insert', insertAfter?: string): Promise<void> {
    throw new Error('updateNotionPage is only available for Notion provider');
  }
}