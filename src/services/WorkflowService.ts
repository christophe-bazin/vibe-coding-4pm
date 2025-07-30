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
    const availableTransitions = this.workflowConfig.transitions[currentStatus] || [];
    const canAutoProgress = this.shouldAutoProgress(currentStatus);

    return {
      taskId,
      currentStatus,
      availableTransitions,
      canAutoProgress
    };
  }

  validateTransition(fromStatus: string, toStatus: string): boolean {
    const availableTransitions = this.workflowConfig.transitions[fromStatus] || [];
    return availableTransitions.includes(toStatus);
  }

  getNextRecommendedStatus(currentStatus: string, progressPercentage: number): string | null {
    const transitions = this.workflowConfig.transitions[currentStatus] || [];
    
    if (transitions.length === 0) return null;

    // Get status keys dynamically from config
    const notStarted = this.workflowConfig.statusMapping.notStarted || 'Not started';
    const inProgress = this.workflowConfig.statusMapping.inProgress || 'In progress';
    const done = this.workflowConfig.statusMapping.done || 'Done';
    const test = this.workflowConfig.statusMapping.test || 'Test';

    // Logic for recommendations based on progress (using config values)
    if (currentStatus === notStarted && progressPercentage > 0) {
      return transitions.includes(inProgress) ? inProgress : (transitions[0] || null);
    }
    
    if (currentStatus === inProgress && progressPercentage >= 100) {
      return transitions.includes(done) ? done : (transitions[0] || null);
    }

    if (currentStatus === test && progressPercentage >= 100) {
      return transitions.includes(done) ? done : null;
    }

    return null;
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