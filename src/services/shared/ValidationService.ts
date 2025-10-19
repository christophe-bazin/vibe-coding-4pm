/**
 * ValidationService - Input validation for task types, statuses and data integrity
 */

import { WorkflowConfig } from '../../models/Workflow.js';
import { StatusService } from './StatusService.js';

export class ValidationService {
  constructor(
    private workflowConfig: WorkflowConfig,
    private statusService: StatusService
  ) {}

  /**
   * Validate and normalize task type (case-insensitive)
   * @returns normalized task type or throws error
   */
  validateTaskType(taskType: string): void {
    const normalizedType = this.workflowConfig.taskTypes.find(
      t => t.toLowerCase() === taskType.toLowerCase()
    );

    if (!normalizedType) {
      throw new Error(`Invalid task type "${taskType}". Available: ${this.workflowConfig.taskTypes.join(', ')}`);
    }
  }

  validateStatusTransition(currentStatus: string, newStatus: string): void {
    if (currentStatus === newStatus) {
      return;
    }

    // Check if the new status exists in the configuration
    const newStatusKey = this.statusService.getStatusKey(newStatus);
    if (newStatusKey === 'unknown') {
      const validStatuses = Object.values(this.workflowConfig.statusMapping);
      throw new Error(`Invalid status "${newStatus}". Valid statuses: ${validStatuses.join(', ')}`);
    }
    
    // Allow all transitions - remove rigid workflow constraints
    // Users should be able to move tasks freely for corrections and flexibility
  }

  validateTaskUpdateData(updates: { title?: string; taskType?: string; status?: string }): void {
    if (updates.taskType) {
      this.validateTaskType(updates.taskType);
    }

    if (updates.title && typeof updates.title !== 'string') {
      throw new Error('Title must be a string');
    }

    if (updates.status && typeof updates.status !== 'string') {
      throw new Error('Status must be a string');
    }
  }

  validateTaskCreationData(title: string, taskType: string, description: string): void {
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      throw new Error('Title is required and must be a non-empty string');
    }

    if (!taskType || typeof taskType !== 'string') {
      throw new Error('Task type is required and must be a string');
    }

    if (!description || typeof description !== 'string') {
      throw new Error('Description is required and must be a string');
    }

    this.validateTaskType(taskType);
  }

  validateTodoUpdateData(updates: Array<{ todoText: string; completed: boolean }>): void {
    if (!Array.isArray(updates)) {
      throw new Error('Updates must be an array of todo updates. Expected format: [{"todoText": "...", "completed": true}]');
    }

    if (updates.length === 0) {
      throw new Error('Updates array cannot be empty');
    }

    for (const [index, update] of updates.entries()) {
      if (typeof update !== 'object' || update === null) {
        throw new Error(`Update at index ${index} must be an object with todoText and completed properties`);
      }

      if (!update.todoText || typeof update.todoText !== 'string') {
        throw new Error(`Update at index ${index} must have a todoText string. Got: ${JSON.stringify(update)}`);
      }

      if (typeof update.completed !== 'boolean') {
        throw new Error(`Update at index ${index} must have a completed boolean. Got: ${JSON.stringify(update)}`);
      }

      // Check for common wrong property names
      if ('content' in update) {
        throw new Error(`Update at index ${index} uses 'content' but should use 'todoText'. Correct format: {"todoText": "...", "completed": true}`);
      }
    }
  }

  validateSummaryData(adaptedSummary: string): void {
    if (!adaptedSummary || typeof adaptedSummary !== 'string') {
      throw new Error('adaptedSummary parameter is required and must be a non-empty string. Did you use "summary" instead of "adaptedSummary"?');
    }

    if (adaptedSummary.trim().length === 0) {
      throw new Error('adaptedSummary cannot be empty or just whitespace');
    }

    if (adaptedSummary === 'undefined' || adaptedSummary === 'null') {
      throw new Error('adaptedSummary appears to be undefined/null as string. Check your parameter passing.');
    }
  }
}