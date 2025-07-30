/**
 * TaskService - High-level task operations
 */

import { TaskProvider } from '../interfaces/TaskProvider.js';
import { NotionTask, TaskMetadata, TaskStatus } from '../models/Task.js';
import { WorkflowConfig } from '../models/Workflow.js';
import { TodoService } from './TodoService.js';
import { WorkflowService } from './WorkflowService.js';

export class TaskService {
  constructor(
    private taskProvider: TaskProvider,
    private todoService: TodoService,
    private workflowConfig: WorkflowConfig,
    private workflowService: WorkflowService
  ) {}

  async getTask(taskId: string): Promise<NotionTask> {
    return await this.taskProvider.getTask(taskId);
  }

  async getTaskMetadata(taskId: string): Promise<TaskMetadata> {
    const task = await this.getTask(taskId);
    const todoAnalysis = await this.taskProvider.analyzeTodos(taskId);
    const statusInfo = this.getTaskStatus(task.status);

    return {
      id: task.id,
      title: task.title,
      status: task.status,
      type: task.type || 'Unknown',
      todoStats: todoAnalysis.stats,
      statusInfo
    };
  }

  async createTask(title: string, taskType: string, description: string): Promise<NotionTask> {
    // Validate task type
    if (!this.workflowConfig.taskTypes.includes(taskType)) {
      throw new Error(`Invalid task type. Available: ${this.workflowConfig.taskTypes.join(', ')}`);
    }

    // Enhance description with workflow template based on task type
    const enhancedDescription = await this.enhanceDescriptionWithTemplate(taskType, description);
    
    return await this.taskProvider.createTask(title, taskType, enhancedDescription);
  }

  async updateTask(taskId: string, updates: { title?: string; description?: string; taskType?: string }): Promise<void> {
    // Validate task type if provided
    if (updates.taskType && !this.workflowConfig.taskTypes.includes(updates.taskType)) {
      throw new Error(`Invalid task type. Available: ${this.workflowConfig.taskTypes.join(', ')}`);
    }

    await this.taskProvider.updateTask(taskId, updates);
  }

  async updateTaskStatus(taskId: string, newStatus: string): Promise<void> {
    const task = await this.getTask(taskId);
    const currentStatusKey = this.getStatusKey(task.status);
    const newStatusKey = this.getStatusKey(newStatus);

    // Validate transition
    const availableTransitions = this.workflowConfig.transitions[task.status] || [];
    if (!availableTransitions.includes(newStatus)) {
      throw new Error(`Invalid transition from "${task.status}" to "${newStatus}". Available: ${availableTransitions.join(', ')}`);
    }

    await this.taskProvider.updateTaskStatus(taskId, newStatus);
  }

  getTaskStatus(currentStatus: string): TaskStatus {
    const availableTransitions = this.workflowConfig.transitions[currentStatus] || [];
    const statusKey = this.getStatusKey(currentStatus);

    return {
      current: currentStatus,
      available: availableTransitions,
      recommended: this.getRecommendedStatus(currentStatus),
      shouldAutoProgress: false // Will be determined by ExecutionService
    };
  }

  private getStatusKey(status: string): string {
    for (const [key, value] of Object.entries(this.workflowConfig.statusMapping)) {
      if (value === status) return key;
    }
    return 'unknown';
  }

  private getRecommendedStatus(currentStatus: string): string | undefined {
    const transitions = this.workflowConfig.transitions[currentStatus];
    if (!transitions || transitions.length === 0) return undefined;
    
    // Simple logic: if in notStarted, recommend inProgress
    const notStarted = this.workflowConfig.statusMapping.notStarted || 'Not started';
    const inProgress = this.workflowConfig.statusMapping.inProgress || 'In progress';
    
    if (currentStatus === notStarted && transitions.includes(inProgress)) {
      return inProgress;
    }
    
    return transitions[0]; // Default to first available
  }

  private async enhanceDescriptionWithTemplate(taskType: string, userDescription: string): Promise<string> {
    try {
      // Get workflow template for creation
      const template = await this.workflowService.getWorkflowGuidance('creation');
      
      // Extract template for specific task type
      const typeTemplate = this.extractTemplateForType(template, taskType);
      
      if (!typeTemplate) {
        return userDescription;
      }
      
      // Intelligently merge user content with template
      return this.mergeContentWithTemplate(typeTemplate, userDescription, taskType);
      
    } catch (error) {
      // If template fails, use original description
      return userDescription;
    }
  }

  private extractTemplateForType(template: string, taskType: string): string | null {
    const typeSection = new RegExp(`#### ${taskType}\\s*\`\`\`([\\s\\S]*?)\`\`\``, 'i');
    const match = template.match(typeSection);
    
    if (match && match[1]) {
      return match[1].trim();
    }
    
    return null;
  }

  private mergeContentWithTemplate(template: string, userDescription: string, taskType: string): string {
    let result = template;
    
    switch (taskType.toLowerCase()) {
      case 'bug':
        // Replace [Description of the bug] with user content
        result = result.replace(/\[Description of the bug\]/g, userDescription);
        break;
        
      case 'feature':
        // Replace [Description of the feature] with user content
        result = result.replace(/\[Description of the feature\]/g, userDescription);
        break;
        
      case 'refactoring':
        // Replace [Why this refactoring is necessary] with user content
        result = result.replace(/\[Why this refactoring is necessary\]/g, userDescription);
        break;
        
      default:
        // For unknown types, prepend user description
        result = `${userDescription}\n\n${template}`;
    }
    
    return result;
  }
}