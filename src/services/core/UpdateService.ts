/**
 * UpdateService - Task and todo updates with status transitions and validation
 */

import { TaskProvider } from '../../interfaces/TaskProvider.js';
import { NotionTask, TaskMetadata } from '../../models/Task.js';
import { TodoAnalysisResult, TodoUpdateRequest } from '../../models/Todo.js';
import { StatusService } from '../shared/StatusService.js';
import { ValidationService } from '../shared/ValidationService.js';

export class UpdateService {
  private onTodosUpdatedCallback?: (taskId: string) => Promise<void>;

  constructor(
    private taskProvider: TaskProvider,
    private statusService: StatusService,
    private validationService: ValidationService
  ) {}

  setOnTodosUpdatedCallback(callback: (taskId: string) => Promise<void>): void {
    this.onTodosUpdatedCallback = callback;
  }

  async getTask(taskId: string): Promise<NotionTask> {
    return await this.taskProvider.getTask(taskId);
  }

  async getTaskMetadata(taskId: string): Promise<TaskMetadata> {
    const task = await this.getTask(taskId);
    const todoAnalysis = await this.taskProvider.analyzeTodos(taskId);
    const statusInfo = this.statusService.getTaskStatus(task.status);

    return {
      id: task.id,
      title: task.title,
      status: task.status,
      type: task.type || 'Unknown',
      todoStats: todoAnalysis.stats,
      statusInfo
    };
  }

  async updateTask(taskId: string, updates: { title?: string; taskType?: string; status?: string }): Promise<void> {
    this.validationService.validateTaskUpdateData(updates);

    if (updates.status) {
      const task = await this.getTask(taskId);
      this.validationService.validateStatusTransition(task.status, updates.status);
    }

    await this.taskProvider.updateTask(taskId, updates);
  }

  async updateTaskStatus(taskId: string, newStatus: string): Promise<void> {
    const task = await this.getTask(taskId);
    this.validationService.validateStatusTransition(task.status, newStatus);
    await this.taskProvider.updateTaskStatus(taskId, newStatus);
  }

  async analyzeTodos(taskId: string, includeHierarchy: boolean = false): Promise<TodoAnalysisResult> {
    return await this.taskProvider.analyzeTodos(taskId, includeHierarchy);
  }

  async updateTodos(taskId: string, updates: TodoUpdateRequest[]): Promise<{ updated: number; failed: number }> {
    this.validationService.validateTodoUpdateData(updates);
    const result = await this.taskProvider.updateTodos(taskId, updates);
    
    // Trigger callback if todos were successfully updated
    if (result.updated > 0 && this.onTodosUpdatedCallback) {
      try {
        await this.onTodosUpdatedCallback(taskId);
      } catch (error) {
        // Callback error shouldn't fail the todo update
        console.warn('Todo update callback failed:', error);
      }
    }
    
    return result;
  }

  async updateSingleTodo(taskId: string, todoText: string, completed: boolean): Promise<boolean> {
    return await this.taskProvider.updateSingleTodo(taskId, todoText, completed);
  }

  async generateDevSummary(taskId: string): Promise<string> {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      const { stdout: diff } = await execAsync('git diff HEAD');
      const { stdout: status } = await execAsync('git status --porcelain');
      
      if (!status.trim() && !diff.trim()) {
        return `📋 Development Summary for Task ${taskId}\n\nNo changes detected since last commit.\nTask appears to be up to date.`;
      }

      let summary = `📋 Development Summary for Task ${taskId}\n\n`;
      
      if (status.trim()) {
        summary += `🔄 Modified Files:\n`;
        const files = status.trim().split('\n');
        files.forEach(file => {
          const parts = file.trim().split(/\s+/);
          const statusCode = parts[0] || '';
          const fileName = parts[1] || 'unknown';
          const statusText = statusCode.includes('M') ? 'Modified' : 
                           statusCode.includes('A') ? 'Added' : 
                           statusCode.includes('D') ? 'Deleted' : 'Changed';
          summary += `• ${statusText}: ${fileName}\n`;
        });
        summary += '\n';
      }

      summary += `🧪 Important Testing Todos:\n`;
      summary += `- [ ] Run build: npm run build\n`;
      summary += `- [ ] Run tests: npm test (if available)\n`;
      summary += `- [ ] Manual testing of implemented features\n`;
      summary += `- [ ] Verify all todos are completed\n`;
      summary += `- [ ] Consider moving task to Test status\n\n`;
      
      summary += `📝 Development Next Actions:\n`;
      summary += `- [ ] Use update_todos to mark completed todos\n`;
      summary += `- [ ] Update task status when testing is complete\n`;
      summary += `- [ ] Commit changes when satisfied`;

      return summary;
    } catch (error) {
      return `📋 Development Summary for Task ${taskId}\n\nError generating summary: ${error}`;
    }
  }
}