/**
 * UpdateService - Task and todo updates with status transitions and validation
 */

import { TaskProvider } from '../../interfaces/TaskProvider.js';
import { ProviderManager } from '../../providers/ProviderManager.js';
import { Task, TaskMetadata } from '../../models/Task.js';
import { TodoAnalysisResult, TodoUpdateRequest } from '../../models/Todo.js';
import { PageContent } from '../../models/Page.js';
import { StatusService } from '../shared/StatusService.js';
import { ValidationService } from '../shared/ValidationService.js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

import { ExecutionAction, WorkflowConfig } from '../../models/Workflow.js';

export class UpdateService {
  private executionService?: any; // Injected later to avoid circular dependency

  constructor(
    private providerManager: ProviderManager,
    private statusService: StatusService,
    private validationService: ValidationService,
    private workflowConfig: WorkflowConfig
  ) {}

  setExecutionService(executionService: any): void {
    this.executionService = executionService;
  }

  async getTask(taskId: string, provider?: string): Promise<Task> {
    const taskProvider = this.providerManager.getProvider(provider);
    return await taskProvider.getTask(taskId);
  }

  async getTaskMetadata(taskId: string, provider?: string): Promise<TaskMetadata> {
    const task = await this.getTask(taskId, provider);
    const taskProvider = this.providerManager.getProvider(provider);
    const todoAnalysis = await taskProvider.analyzeTodos(taskId);
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

  async updateTask(taskId: string, updates: { title?: string; taskType?: string; status?: string }, provider?: string): Promise<void> {
    this.validationService.validateTaskUpdateData(updates);

    if (updates.status) {
      const task = await this.getTask(taskId, provider);
      this.validationService.validateStatusTransition(task.status, updates.status);
    }

    const taskProvider = this.providerManager.getProvider(provider);
    await taskProvider.updateTask(taskId, updates);
  }

  async updateTaskStatus(taskId: string, newStatus: string, provider?: string): Promise<void> {
    const task = await this.getTask(taskId, provider);
    this.validationService.validateStatusTransition(task.status, newStatus);
    const taskProvider = this.providerManager.getProvider(provider);
    await taskProvider.updateTaskStatus(taskId, newStatus);
  }

  async analyzeTodos(taskId: string, includeHierarchy: boolean = false, provider?: string): Promise<TodoAnalysisResult> {
    const taskProvider = this.providerManager.getProvider(provider);
    return await taskProvider.analyzeTodos(taskId, includeHierarchy);
  }

  async updateTodos(taskId: string, updates: TodoUpdateRequest[], provider?: string): Promise<{ updated: number; failed: number; nextAction?: ExecutionAction; devSummary?: string }> {
    this.validationService.validateTodoUpdateData(updates);
    const taskProvider = this.providerManager.getProvider(provider);
    const result = await taskProvider.updateTodos(taskId, updates);
    
    // Get next action if todos were successfully updated
    let nextAction: ExecutionAction | undefined;
    let devSummary: string | undefined;
    
    if (result.updated > 0 && this.executionService) {
      try {
        nextAction = await this.executionService.handleTodosUpdated(taskId);
        
        // If task is completed, update status to Test and generate dev summary directly
        if (nextAction?.type === 'completed') {
          // Move to Test status first
          const todoAnalysis = await this.analyzeTodos(taskId, false, provider);
          const taskMetadata = await this.getTaskMetadata(taskId, provider);
          const testStatus = this.statusService.getNextRecommendedStatus(
            taskMetadata.status, 
            todoAnalysis.stats.percentage
          );
          
          if (testStatus && testStatus !== taskMetadata.status) {
            await this.updateTaskStatus(taskId, testStatus, provider);
          }
          
          // Generate summary instructions for AI
          devSummary = await this.generateSummary(taskId, provider);
        }
      } catch (error) {
        console.warn('Next action analysis failed:', error);
      }
    }
    
    return { ...result, nextAction, devSummary };
  }

  async updateSingleTodo(taskId: string, todoText: string, completed: boolean, provider?: string): Promise<boolean> {
    const taskProvider = this.providerManager.getProvider(provider);
    return await taskProvider.updateSingleTodo(taskId, todoText, completed);
  }

  async generateSummary(taskId: string, provider?: string): Promise<string> {
    // This should NOT append anything to the task - just return instructions for the AI
    // The AI will call get_summary_template, adapt it, then we append
    const taskMetadata = await this.getTaskMetadata(taskId, provider);
    
    return `Task "${taskMetadata.title}" completed! Please generate a summary by:

1. Call get_summary_template to get the raw template
2. Adapt the template with specific details of what you accomplished  
3. Call append_summary with these parameters:
   - taskId: "${taskId}"
   - adaptedSummary: "your adapted text here"
   
⚠️  IMPORTANT: Use "adaptedSummary" parameter, NOT "summary"
⚠️  DO NOT check testing checkboxes - use unchecked format: - [ ] item
   Format: {"taskId":"${taskId}","adaptedSummary":"your adapted summary text"}`;
  }
  
  async getSummaryTemplate(taskId: string, provider?: string): Promise<string> {
    // Return raw template for AI adaptation - same pattern as CreationService
    return await this.loadSummaryTemplate();
  }
  
  
  private async loadSummaryTemplate(): Promise<string> {
    const templateFileName = 'summary.md';
    
    // Check for custom templates if override is enabled
    if (this.workflowConfig.templates?.override) {
      const summaryPath = this.workflowConfig.templates.summaryPath || '.vc4pm/templates/summary/';
      const customTemplateFile = `${summaryPath}${templateFileName}`;
      const projectRoot = process.env.PROJECT_ROOT || process.cwd();
      const customFilePath = resolve(projectRoot, customTemplateFile);
      
      if (existsSync(customFilePath)) {
        try {
          return readFileSync(customFilePath, 'utf-8');
        } catch (error) {
          throw new Error(`Error reading custom summary template ${customTemplateFile}: ${error}`);
        }
      }
    }
    
    // Fallback to global templates (resolve from package directory)
    const templateFile = `templates/summary/${templateFileName}`;
    const packageRoot = resolve(__dirname, '../../..');  // From dist/services/core to package root
    const filePath = resolve(packageRoot, templateFile);
    
    if (!existsSync(filePath)) {
      throw new Error(`Summary template not found: ${templateFile} in package templates/summary/ directory. Expected path: ${filePath}`);
    }

    try {
      return readFileSync(filePath, 'utf-8');
    } catch (error) {
      throw new Error(`Error reading summary template ${templateFile}: ${error}`);
    }
  }
  
  async appendSummary(taskId: string, adaptedSummary: string, provider?: string): Promise<void> {
    // Validate the summary data with detailed error messages
    this.validationService.validateSummaryData(adaptedSummary);
    
    // Append the AI-adapted summary to the task
    const formattedSummary = `\n\n---\n\n${adaptedSummary}`;
    await this.appendToTask(taskId, formattedSummary, provider);
  }
  
  
  private async appendToTask(taskId: string, summary: string, provider?: string): Promise<void> {
    // Use the task provider to append content to the task page
    const taskProvider = this.providerManager.getProvider(provider);
    await taskProvider.appendToTask(taskId, summary);
  }

  async readNotionPage(pageId: string, includeLinkedPages: boolean = true, provider?: string): Promise<PageContent> {
    const taskProvider = this.providerManager.getProvider(provider);
    return await taskProvider.readPage(pageId, includeLinkedPages);
  }

  async createNotionPage(databaseId: string, title: string, content?: string, properties?: Record<string, any>, provider?: string): Promise<PageContent> {
    const taskProvider = this.providerManager.getProvider(provider);
    return await taskProvider.createNotionPage(databaseId, title, content, properties);
  }

  async updateNotionPage(pageId: string, title?: string, content?: string, properties?: Record<string, any>, mode: 'append' | 'replace' | 'insert' = 'append', insertAfter?: string, provider?: string): Promise<void> {
    const taskProvider = this.providerManager.getProvider(provider);
    await taskProvider.updateNotionPage(pageId, title, content, properties, mode, insertAfter);
  }
}