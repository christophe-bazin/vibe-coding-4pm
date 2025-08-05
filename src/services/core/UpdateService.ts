/**
 * UpdateService - Task and todo updates with status transitions and validation
 */

import { TaskProvider } from '../../interfaces/TaskProvider.js';
import { NotionTask, TaskMetadata } from '../../models/Task.js';
import { TodoAnalysisResult, TodoUpdateRequest } from '../../models/Todo.js';
import { StatusService } from '../shared/StatusService.js';
import { ValidationService } from '../shared/ValidationService.js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

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
          
          // Generate summary instructions for AI
          devSummary = await this.generateSummary(taskId);
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

  async generateSummary(taskId: string): Promise<string> {
    // This should NOT append anything to Notion - just return instructions for the AI
    // The AI will call get_summary_template, adapt it, then we append
    const taskMetadata = await this.getTaskMetadata(taskId);
    
    return `Task "${taskMetadata.title}" completed! Please generate a summary by:\n\n1. Call get_summary_template to get the raw template\n2. Adapt the template with specific details of what you accomplished\n3. Call this tool again with your adapted summary to append it to Notion`;
  }
  
  async getSummaryTemplate(taskId: string): Promise<string> {
    // Return raw template for AI adaptation - same pattern as CreationService
    return await this.loadSummaryTemplate();
  }
  
  
  private async loadSummaryTemplate(): Promise<string> {
    const templateFile = 'templates/summary/summary.md';
    const filePath = resolve(templateFile);
    
    if (!existsSync(filePath)) {
      throw new Error(`Summary template not found: ${templateFile}`);
    }

    try {
      return readFileSync(filePath, 'utf-8');
    } catch (error) {
      throw new Error(`Error reading summary template ${templateFile}: ${error}`);
    }
  }
  
  async appendSummary(taskId: string, adaptedSummary: string): Promise<void> {
    // Append the AI-adapted summary to Notion
    const formattedSummary = `\n\n---\n\n${adaptedSummary}`;
    await this.appendToNotionTask(taskId, formattedSummary);
  }
  
  
  private async appendToNotionTask(taskId: string, summary: string): Promise<void> {
    // Use the task provider to append content to the Notion page
    await this.taskProvider.appendToTask(taskId, summary);
  }
}