/**
 * CreationService - Task creation with template processing and validation
 */

import { TaskProvider } from '../../interfaces/TaskProvider.js';
import { ProviderManager } from '../../providers/ProviderManager.js';
import { Task } from '../../models/Task.js';
import { ValidationService } from '../shared/ValidationService.js';
import { WorkflowConfig } from '../../models/Workflow.js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

export class CreationService {
  constructor(
    private providerManager: ProviderManager,
    private validationService: ValidationService,
    private workflowConfig: WorkflowConfig
  ) {}

  async createTask(title: string, taskType: string, description: string, adaptedWorkflow?: string, provider?: string): Promise<Task | string> {
    this.validationService.validateTaskType(taskType);
    
    // Check if we have a valid adaptedWorkflow
    let workflow = adaptedWorkflow;
    if (adaptedWorkflow) {
      const hasTemplateStructure = adaptedWorkflow.includes('##') || adaptedWorkflow.includes('# ');
      const hasCheckboxes = adaptedWorkflow.includes('- [ ]');
      const isLongEnough = adaptedWorkflow.length > 50;
      
      // If adaptedWorkflow is provided but invalid, treat as if no adaptedWorkflow
      if (!hasTemplateStructure || !hasCheckboxes || !isLongEnough) {
        workflow = undefined;
      }
    }
    
    if (!workflow) {
      // Auto-fetch template and guide AI to adapt it
      const baseTemplate = await this.getTaskTemplate(taskType);
      return `Please adapt the template below to your specific context ("${title}") and call create_task again with adaptedWorkflow parameter:

${baseTemplate}

Adapt this template by keeping the ## headers structure but customizing the implementation steps and acceptance criteria to match the specific task: "${description}". Keep the checkbox format (- [ ]) but make the todos relevant to this specific task.`;
    }
    
    const structuredDescription = await this.applyTaskTemplate(taskType, workflow, title);
    const taskProvider = this.providerManager.getProvider(provider);
    return await taskProvider.createTask(title, taskType, structuredDescription);
  }


  private async applyTaskTemplate(taskType: string, adaptedWorkflow: string, title: string): Promise<string> {
    // Return the pre-adapted workflow directly - AI has already contextualized the template
    // No further processing needed since workflow adaptation happens before task creation
    return adaptedWorkflow;
  }

  async getTaskTemplate(taskType: string): Promise<string> {
    this.validationService.validateTaskType(taskType);
    
    const templateContent = await this.loadTaskTypeTemplate(taskType);
    return templateContent;
  }

  private async loadTaskTypeTemplate(taskType: string): Promise<string> {
    // Load raw workflow template from markdown files
    // Templates contain placeholder content that AI will adapt to specific contexts
    const templateFileName = `${taskType.toLowerCase()}.md`;
    
    // Check for custom templates if override is enabled
    if (this.workflowConfig.templates?.override) {
      const taskPath = this.workflowConfig.templates.taskPath || '.vc4pm/templates/task/';
      const customTemplateFile = `${taskPath}${templateFileName}`;
      const customFilePath = resolve(customTemplateFile);
      
      if (existsSync(customFilePath)) {
        try {
          return readFileSync(customFilePath, 'utf-8');
        } catch (error) {
          throw new Error(`Error reading custom template file ${customTemplateFile} at ${customFilePath}: ${error}`);
        }
      }
    }
    
    // Fallback to global templates
    const templateFile = `templates/task/${templateFileName}`;
    const filePath = resolve(templateFile);
    
    if (!existsSync(filePath)) {
      throw new Error(`Template file not found: ${templateFile} in templates/task/ directory`);
    }

    try {
      return readFileSync(filePath, 'utf-8');
    } catch (error) {
      throw new Error(`Error reading template file ${templateFile} at ${filePath}: ${error}`);
    }
  }
}