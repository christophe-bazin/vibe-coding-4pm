/**
 * StatusService - Task status management, transitions validation and recommendations
 */

import { WorkflowConfig } from '../../models/Workflow.js';
import { TaskStatus } from '../../models/Task.js';

export class StatusService {
  constructor(private workflowConfig: WorkflowConfig) {}

  getTaskStatus(currentStatus: string): TaskStatus {
    const statusKey = this.getStatusKey(currentStatus);
    const availableTransitions = this.workflowConfig.transitions[statusKey] || [];
    const availableNotionStatuses = availableTransitions.map(key => this.workflowConfig.statusMapping[key]).filter(Boolean) as string[];

    return {
      current: currentStatus,
      available: availableNotionStatuses,
      recommended: this.getRecommendedStatus(currentStatus),
      shouldAutoProgress: false
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

    if (!this.workflowConfig.statusMapping.notStarted) {
      throw new Error('Missing required status mapping: notStarted');
    }
    if (!this.workflowConfig.statusMapping.inProgress) {
      throw new Error('Missing required status mapping: inProgress');
    }
    if (!this.workflowConfig.statusMapping.done) {
      throw new Error('Missing required status mapping: done');
    }
    if (!this.workflowConfig.statusMapping.test) {
      throw new Error('Missing required status mapping: test');
    }

    const notStarted = this.workflowConfig.statusMapping.notStarted;
    const inProgress = this.workflowConfig.statusMapping.inProgress;
    const done = this.workflowConfig.statusMapping.done;
    const test = this.workflowConfig.statusMapping.test;

    if (currentStatus === notStarted && progressPercentage > 0) {
      return transitions.includes('inProgress') ? inProgress : (transitions[0] ? this.workflowConfig.statusMapping[transitions[0]] || null : null);
    }
    
    if (currentStatus === inProgress && progressPercentage >= 100) {
      return transitions.includes('test') ? test : (transitions.includes('done') ? done : (transitions[0] ? this.workflowConfig.statusMapping[transitions[0]] || null : null));
    }

    if (currentStatus === test && progressPercentage >= 100) {
      return transitions.includes('done') ? done : null;
    }

    return null;
  }

  shouldAutoProgress(currentStatus: string): boolean {
    if (!this.workflowConfig.statusMapping.notStarted) {
      throw new Error('Missing required status mapping: notStarted');
    }
    if (!this.workflowConfig.statusMapping.inProgress) {
      throw new Error('Missing required status mapping: inProgress');
    }
    
    const notStarted = this.workflowConfig.statusMapping.notStarted;
    const inProgress = this.workflowConfig.statusMapping.inProgress;
    const autoProgressStatuses = [notStarted, inProgress];
    
    return autoProgressStatuses.includes(currentStatus);
  }

  getStatusKey(status: string): string {
    for (const [key, value] of Object.entries(this.workflowConfig.statusMapping)) {
      if (value === status) return key;
    }
    return 'unknown';
  }

  getNotStartedStatus(): string {
    if (!this.workflowConfig.statusMapping.notStarted) {
      throw new Error('Missing required status mapping: notStarted');
    }
    return this.workflowConfig.statusMapping.notStarted;
  }

  private getRecommendedStatus(currentStatus: string): string | undefined {
    const statusKey = this.getStatusKey(currentStatus);
    const transitions = this.workflowConfig.transitions[statusKey];
    if (!transitions || transitions.length === 0) return undefined;
    
    if (!this.workflowConfig.statusMapping.notStarted) {
      throw new Error('Missing required status mapping: notStarted');
    }
    if (!this.workflowConfig.statusMapping.inProgress) {
      throw new Error('Missing required status mapping: inProgress');
    }
    
    if (currentStatus === this.workflowConfig.statusMapping.notStarted && 
        transitions.includes('inProgress')) {
      return this.workflowConfig.statusMapping.inProgress;
    }
    
    const firstTransitionKey = transitions[0];
    return firstTransitionKey ? this.workflowConfig.statusMapping[firstTransitionKey] : undefined;
  }
}