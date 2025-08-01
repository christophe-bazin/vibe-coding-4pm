/**
 * WorkflowService - Workflow guidance and validation
 */

import { WorkflowConfig, WorkflowState } from '../models/Workflow.js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

export class WorkflowService {
  constructor(private workflowConfig: WorkflowConfig) {}

  async getWorkflowGuidance(type: 'creation' | 'update' | 'execution', context?: any): Promise<string> {
    const workflowFile = this.workflowConfig.workflowFiles[type];
    
    if (!workflowFile) {
      return `No workflow guidance available for ${type}`;
    }

    const filePath = resolve(workflowFile);
    
    if (!existsSync(filePath)) {
      return `Workflow file not found: ${workflowFile}`;
    }

    try {
      let content = readFileSync(filePath, 'utf-8');
      
      // Process templates if context provided
      if (context) {
        content = this.processTemplates(content, context);
      }

      return content;
    } catch (error) {
      return `Error reading workflow file: ${error}`;
    }
  }

  getWorkflowState(taskId: string, currentStatus: string): WorkflowState {
    const statusKey = this.getStatusKey(currentStatus);
    const availableTransitions = this.workflowConfig.transitions[statusKey] || [];
    const availableNotionStatuses = availableTransitions.map(key => this.workflowConfig.statusMapping[key]).filter(Boolean) as string[];
    const canAutoProgress = this.shouldAutoProgress(currentStatus);

    return {
      taskId,
      currentStatus,
      availableTransitions: availableNotionStatuses,
      canAutoProgress
    };
  }

  validateTransition(fromStatus: string, toStatus: string): boolean {
    const fromStatusKey = this.getStatusKey(fromStatus);
    const toStatusKey = this.getStatusKey(toStatus);
    const availableTransitions = this.workflowConfig.transitions[fromStatusKey] || [];
    return availableTransitions.includes(toStatusKey);
  }

  getNextRecommendedStatus(currentStatus: string, progressPercentage: number): string | null {
    const statusKey = this.getStatusKey(currentStatus);
    const transitions = this.workflowConfig.transitions[statusKey] || [];
    
    if (transitions.length === 0) return null;

    // Get status names from config
    const notStarted = this.workflowConfig.statusMapping.notStarted || null;
    const inProgress = this.workflowConfig.statusMapping.inProgress || null;
    const done = this.workflowConfig.statusMapping.done || null;
    const test = this.workflowConfig.statusMapping.test || null;

    // Logic for recommendations based on progress (using Notion status names)
    if (currentStatus === notStarted && progressPercentage > 0) {
      return transitions.includes('inProgress') ? inProgress : (transitions[0] ? this.workflowConfig.statusMapping[transitions[0]] || null : null);
    }
    
    if (currentStatus === inProgress && progressPercentage >= 100) {
      return transitions.includes('done') ? done : (transitions[0] ? this.workflowConfig.statusMapping[transitions[0]] || null : null);
    }

    if (currentStatus === test && progressPercentage >= 100) {
      return transitions.includes('done') ? done : null;
    }

    return null;
  }

  private getStatusKey(status: string): string {
    for (const [key, value] of Object.entries(this.workflowConfig.statusMapping)) {
      if (value === status) return key;
    }
    return 'unknown';
  }

  private shouldAutoProgress(currentStatus: string): boolean {
    // Get auto-progress statuses from config
    const notStarted = this.workflowConfig.statusMapping.notStarted || 'Not started';
    const inProgress = this.workflowConfig.statusMapping.inProgress || 'In progress';
    const autoProgressStatuses = [notStarted, inProgress];
    
    return autoProgressStatuses.includes(currentStatus);
  }

  private processTemplates(content: string, context: any): string {
    // Replace template variables like {{status_inProgress}}
    let processed = content;

    // Replace status mappings
    for (const [key, value] of Object.entries(this.workflowConfig.statusMapping)) {
      const placeholder = `{{status_${key}}}`;
      processed = processed.replace(new RegExp(placeholder, 'g'), value);
    }

    // Replace context variables
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