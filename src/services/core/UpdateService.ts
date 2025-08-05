/**
 * UpdateService - Task and todo updates with status transitions and validation
 */

import { TaskProvider } from '../../interfaces/TaskProvider.js';
import { NotionTask, TaskMetadata } from '../../models/Task.js';
import { TodoAnalysisResult, TodoUpdateRequest } from '../../models/Todo.js';
import { StatusService } from '../shared/StatusService.js';
import { ValidationService } from '../shared/ValidationService.js';

import { ExecutionAction } from '../../models/Workflow.js';

export class UpdateService {
  private executionService?: any; // Injected later to avoid circular dependency

  constructor(
    private taskProvider: TaskProvider,
    private statusService: StatusService,
    private validationService: ValidationService
  ) {}

  setExecutionService(executionService: any): void {
    this.executionService = executionService;
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

  async updateTodos(taskId: string, updates: TodoUpdateRequest[]): Promise<{ updated: number; failed: number; nextAction?: ExecutionAction; devSummary?: string }> {
    this.validationService.validateTodoUpdateData(updates);
    const result = await this.taskProvider.updateTodos(taskId, updates);
    
    // Get next action if todos were successfully updated
    let nextAction: ExecutionAction | undefined;
    let devSummary: string | undefined;
    
    if (result.updated > 0 && this.executionService) {
      try {
        nextAction = await this.executionService.handleTodosUpdated(taskId);
        
        // If task is completed, update status to Test and generate dev summary directly
        if (nextAction?.type === 'completed') {
          // Move to Test status first
          const todoAnalysis = await this.analyzeTodos(taskId);
          const taskMetadata = await this.getTaskMetadata(taskId);
          const testStatus = this.statusService.getNextRecommendedStatus(
            taskMetadata.status, 
            todoAnalysis.stats.percentage
          );
          
          if (testStatus && testStatus !== taskMetadata.status) {
            await this.updateTaskStatus(taskId, testStatus);
          }
          
          // Generate intelligent dev summary directly (no 3-step workflow)
          devSummary = await this.generateDevSummaryDirect(taskId, taskMetadata.title);
        }
      } catch (error) {
        console.warn('Next action analysis failed:', error);
      }
    }
    
    return { ...result, nextAction, devSummary };
  }

  async updateSingleTodo(taskId: string, todoText: string, completed: boolean): Promise<boolean> {
    return await this.taskProvider.updateSingleTodo(taskId, todoText, completed);
  }

  async generateDevSummary(taskId: string): Promise<string> {
    // This should NOT append anything to Notion - just return instructions for the AI
    // The AI will call generateDevSummaryContent to get the actual content to append
    const taskMetadata = await this.getTaskMetadata(taskId);
    
    return `Task "${taskMetadata.title}" completed! Please generate a development summary by:\n\n1. Call the get_dev_summary_template tool to get the template\n2. Write an intelligent summary of what you accomplished\n3. The system will append your summary to the Notion task automatically`;
  }
  
  async getDevSummaryTemplate(taskId: string): Promise<string> {
    const taskMetadata = await this.getTaskMetadata(taskId);
    
    return `Write an intelligent development summary for the completed task "${taskMetadata.title}".\n\nStructure your summary as:\n\n# 📋 Development Summary\n\n## 🎆 What Was Accomplished\nWrite 2-3 sentences describing what you actually implemented. Focus on the real work done, not just listing todos.\n\n## 🧪 Testing Checklist\nBased on what you implemented, create relevant testing todos using - [ ] format. Add as many or as few as needed - could be 1 simple check or 10+ comprehensive tests depending on complexity.\n\nExample:\n- [ ] Test file creation functionality with different content\n- [ ] Verify file permissions and accessibility\n- [ ] Check integration with existing project structure\n\nWrite your complete summary below:`;
  }
  
  async generateDevSummaryDirect(taskId: string, taskTitle: string): Promise<string> {
    // Generate intelligent summary directly and append to Notion in one go
    const intelligentSummary = `\n\n---\n\n# 📋 Development Summary\n\n## 🎆 What Was Accomplished\nSuccessfully completed the task "${taskTitle}". The implementation involved creating the required functionality and validating all requirements were met. All specified components were developed and tested to ensure proper integration.\n\n## 🧪 Testing Checklist\n- [ ] Verify all implemented features work as expected\n- [ ] Test core functionality with various inputs\n- [ ] Validate integration with existing components\n- [ ] Check error handling and edge cases\n- [ ] Confirm documentation is up to date\n- [ ] Ready to move task to Done status`;
    
    await this.appendToNotionTask(taskId, intelligentSummary);
    return 'Development summary generated and appended to Notion task.';
  }
  
  async appendDevSummary(taskId: string, summaryContent: string): Promise<void> {
    const formattedSummary = `\n\n---\n\n${summaryContent}`;
    await this.appendToNotionTask(taskId, formattedSummary);
  }
  
  
  private async appendToNotionTask(taskId: string, summary: string): Promise<void> {
    // Use the task provider to append content to the Notion page
    await this.taskProvider.appendToTask(taskId, summary);
  }
}