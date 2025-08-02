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

  async createTask(title: string, taskType: string, description: string): Promise<NotionTask> {
    this.validationService.validateTaskCreationData(title, taskType, description);
    
    const structuredDescription = await this.applyTaskTemplate(taskType, description, title);
    return await this.taskProvider.createTask(title, taskType, structuredDescription);
  }

  private async applyTaskTemplate(taskType: string, userDescription: string, _title: string): Promise<string> {
    const templateContent = await this.loadTaskTypeTemplate(taskType);
    
    // Parse and adapt template intelligently
    return this.adaptTemplateToUserRequest(templateContent, userDescription, taskType);
  }

  private adaptTemplateToUserRequest(template: string, userDescription: string, taskType: string): string {
    // Replace main description placeholder
    let adaptedTemplate = this.replaceMainDescription(template, userDescription, taskType);
    
    // Use AI-like adaptation for todos based on user description
    adaptedTemplate = this.adaptTodosIntelligently(adaptedTemplate, userDescription, taskType);
    
    return adaptedTemplate;
  }

  private replaceMainDescription(template: string, userDescription: string, taskType: string): string {
    const placeholders = {
      'feature': /\[Description of the feature\]/g,
      'bug': /\[Description of the bug\]/g,
      'refactoring': /\[Why this refactoring is necessary\]/g
    };
    
    const placeholder = placeholders[taskType.toLowerCase() as keyof typeof placeholders];
    if (placeholder) {
      return template.replace(placeholder, userDescription);
    }
    
    return template;
  }

  private adaptTodosIntelligently(template: string, userDescription: string, taskType: string): string {
    // Mini-prompt for AI-like adaptation of todos based on user description
    const adaptationPrompt = `
    Task: Adapt the template todos based on the user description.
    User Description: "${userDescription}"
    Task Type: ${taskType}
    
    Guidelines:
    - Keep the structure and main sections
    - Replace generic todos with specific ones based on the description
    - Maintain the same number of todos or add more if needed
    - Focus on actionable, specific steps
    `;
    
    // For now, implement basic adaptation logic
    // TODO: Could be enhanced with actual AI/LLM integration later
    return this.basicTodoAdaptation(template, userDescription, taskType);
  }

  private basicTodoAdaptation(template: string, userDescription: string, taskType: string): string {
    if (taskType.toLowerCase() === 'feature') {
      // Adapt based on common patterns in the description
      if (userDescription.toLowerCase().includes('file')) {
        template = template.replace(/Criterion 1/g, 'File created with correct name and location');
        template = template.replace(/Criterion 2/g, 'File contains expected content');
        template = template.replace(/Step 1/g, 'Create the file at specified location');
        template = template.replace(/Step 2/g, 'Add the required content to the file');
      } else {
        template = template.replace(/Criterion 1/g, 'Feature works as described');
        template = template.replace(/Criterion 2/g, 'All edge cases handled');
        template = template.replace(/Step 1/g, 'Implement core functionality');
        template = template.replace(/Step 2/g, 'Add error handling and validation');
      }
    }
    
    return template;
  }

  async getTaskTemplate(taskType: string): Promise<string> {
    this.validationService.validateTaskType(taskType);
    
    const templateContent = await this.loadTaskTypeTemplate(taskType);
    return `Template for ${taskType}:\n\n${templateContent}`;
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



  private processTemplates(content: string, context: any): string {
    let processed = content;

    for (const [key, value] of Object.entries(this.workflowConfig.statusMapping)) {
      const placeholder = `{{status_${key}}}`;
      processed = processed.replace(new RegExp(placeholder, 'g'), value);
    }

    if (context.taskType) {
      processed = processed.replace(/{{taskType}}/g, context.taskType);
    }
    
    if (context.title) {
      processed = processed.replace(/{{title}}/g, context.title);
    }

    if (context.currentStatus) {
      processed = processed.replace(/{{currentStatus}}/g, context.currentStatus);
    }

    return processed;
  }
}