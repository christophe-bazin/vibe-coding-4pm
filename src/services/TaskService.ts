/**
 * TaskService - High-level task operations
 */

import { TaskProvider } from '../interfaces/TaskProvider.js';
import { NotionTask, TaskMetadata, TaskStatus } from '../models/Task.js';
import { WorkflowConfig } from '../models/Workflow.js';
import { TodoService } from './TodoService.js';

export class TaskService {
  constructor(
    private taskProvider: TaskProvider,
    private todoService: TodoService,
    private workflowConfig: WorkflowConfig
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

    // Use description as-is (AI adaptation should happen at Claude level)
    return await this.taskProvider.createTask(title, taskType, description);
  }

  async updateTask(taskId: string, updates: { title?: string; taskType?: string; status?: string }): Promise<void> {
    // Validate task type if provided
    if (updates.taskType && !this.workflowConfig.taskTypes.includes(updates.taskType)) {
      throw new Error(`Invalid task type. Available: ${this.workflowConfig.taskTypes.join(', ')}`);
    }

    // Validate status if provided (same logic as updateTaskStatus)
    if (updates.status) {
      const task = await this.getTask(taskId);
      // Allow same status (no change)
      if (task.status !== updates.status) {
        // Convert Notion status names to internal keys for transition lookup
        const currentStatusKey = this.getStatusKey(task.status);
        const newStatusKey = this.getStatusKey(updates.status);
        
        const availableTransitions = this.workflowConfig.transitions[currentStatusKey] || [];
        const availableNotionStatuses = availableTransitions.map(key => this.workflowConfig.statusMapping[key]).filter(Boolean) as string[];
        
        if (!availableNotionStatuses.includes(updates.status)) {
          throw new Error(`Invalid transition from "${task.status}" to "${updates.status}". Available: ${availableNotionStatuses.join(', ')}`);
        }
      }
    }

    await this.taskProvider.updateTask(taskId, updates);
  }

  async updateTaskStatus(taskId: string, newStatus: string): Promise<void> {
    const task = await this.getTask(taskId);
    const currentStatusKey = this.getStatusKey(task.status);
    const newStatusKey = this.getStatusKey(newStatus);

    // Validate transition (use internal keys, not Notion status names)
    const availableTransitions = this.workflowConfig.transitions[currentStatusKey] || [];
    const availableNotionStatuses = availableTransitions.map(key => this.workflowConfig.statusMapping[key]).filter(Boolean) as string[];
    
    if (!availableNotionStatuses.includes(newStatus)) {
      throw new Error(`Invalid transition from "${task.status}" to "${newStatus}". Available: ${availableNotionStatuses.join(', ')}`);
    }

    await this.taskProvider.updateTaskStatus(taskId, newStatus);
  }

  getTaskStatus(currentStatus: string): TaskStatus {
    const statusKey = this.getStatusKey(currentStatus);
    const availableTransitions = this.workflowConfig.transitions[statusKey] || [];
    const availableNotionStatuses = availableTransitions.map(key => this.workflowConfig.statusMapping[key]).filter(Boolean) as string[];

    return {
      current: currentStatus,
      available: availableNotionStatuses,
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
    const statusKey = this.getStatusKey(currentStatus);
    const transitions = this.workflowConfig.transitions[statusKey];
    if (!transitions || transitions.length === 0) return undefined;
    
    if (currentStatus === this.workflowConfig.statusMapping.notStarted && 
        this.workflowConfig.statusMapping.inProgress &&
        transitions.includes('inProgress')) {
      return this.workflowConfig.statusMapping.inProgress;
    }
    
    // Return the first available transition as Notion status name
    const firstTransitionKey = transitions[0];
    return firstTransitionKey ? this.workflowConfig.statusMapping[firstTransitionKey] : undefined;
  }

}