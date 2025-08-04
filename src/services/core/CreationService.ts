/**
 * CreationService - Task creation with template processing and validation
 */

import { TaskProvider } from '../../interfaces/TaskProvider.js';
import { NotionTask } from '../../models/Task.js';
import { WorkflowConfig } from '../../models/Workflow.js';
import { ValidationService } from '../shared/ValidationService.js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

export class CreationService {
  constructor(
    private taskProvider: TaskProvider,
    private workflowConfig: WorkflowConfig,
    private validationService: ValidationService
  ) {}

  async createTask(title: string, taskType: string, adaptedWorkflow: string): Promise<NotionTask> {
    this.validationService.validateTaskCreationData(title, taskType, adaptedWorkflow);
    
    const structuredDescription = await this.applyTaskTemplate(taskType, adaptedWorkflow, title);
    return await this.taskProvider.createTask(title, taskType, structuredDescription);
  }

  private async applyTaskTemplate(taskType: string, adaptedWorkflow: string, title: string): Promise<string> {
    return adaptedWorkflow;
  }

  async getTaskTemplate(taskType: string): Promise<string> {
    this.validationService.validateTaskType(taskType);
    
    const templateContent = await this.loadTaskTypeTemplate(taskType);
    return templateContent;
  }

  private async loadTaskTypeTemplate(taskType: string): Promise<string> {
    const templateFile = `workflows/${taskType.toLowerCase()}.md`;
    const filePath = resolve(templateFile);
    
    if (!existsSync(filePath)) {
      throw new Error(`Template file not found: ${templateFile}`);
    }

    try {
      return readFileSync(filePath, 'utf-8');
    } catch (error) {
      throw new Error(`Error reading template file ${templateFile}: ${error}`);
    }
  }
}