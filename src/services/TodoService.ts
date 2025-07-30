/**
 * TodoService - Todo management and analysis (delegated to TaskProvider)
 */

import { TaskProvider } from '../interfaces/TaskProvider.js';
import { TodoAnalysisResult, TodoUpdateRequest } from '../models/Todo.js';

export class TodoService {
  constructor(private taskProvider: TaskProvider) {}

  async analyzeTodos(taskId: string, includeHierarchy: boolean = false): Promise<TodoAnalysisResult> {
    return await this.taskProvider.analyzeTodos(taskId, includeHierarchy);
  }

  async updateTodos(taskId: string, updates: TodoUpdateRequest[]): Promise<{ updated: number; failed: number }> {
    return await this.taskProvider.updateTodos(taskId, updates);
  }

  async updateSingleTodo(taskId: string, todoText: string, completed: boolean): Promise<boolean> {
    return await this.taskProvider.updateSingleTodo(taskId, todoText, completed);
  }
}