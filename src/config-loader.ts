/**
 * Configuration manager for workflow settings
 */

import { readFileSync } from 'fs';

export interface WorkflowConfig {
  statusMapping: Record<string, string>;
  transitions: Record<string, string[]>;
  taskTypes: string[];
  defaultStatus: string;
  requiresValidation: string[];
  workflowFiles: {
    creation: string;
    update: string;
    execution: string;
  };
}

export class ConfigLoader {
  private config: WorkflowConfig;
  private workflows: Map<string, string> = new Map();

  constructor(config: WorkflowConfig) {
    this.config = config;
  }

  /**
   * Get configuration
   */
  loadConfig(): WorkflowConfig {
    return this.config;
  }



  /**
   * Check if a status transition is allowed
   */
  isTransitionAllowed(currentStatus: string, newStatus: string): boolean {
    const config = this.loadConfig();
    const allowedTransitions = config.transitions[currentStatus] || [];
    return allowedTransitions.includes(newStatus);
  }

  /**
   * Get all valid statuses (derived from statusMapping)
   */
  getValidStatuses(): string[] {
    const config = this.loadConfig();
    return Object.keys(config.statusMapping);
  }

  /**
   * Get all valid task types
   */
  getValidTaskTypes(): string[] {
    const config = this.loadConfig();
    return config.taskTypes;
  }

  /**
   * Get default status for new tasks
   */
  getDefaultStatus(): string {
    const config = this.loadConfig();
    return config.defaultStatus;
  }

  /**
   * Check if status requires manual validation
   */
  requiresValidation(status: string): boolean {
    const config = this.loadConfig();
    return config.requiresValidation.includes(status);
  }

  /**
   * Get status display label from key
   */
  getStatusLabel(statusKey: string): string {
    const config = this.loadConfig();
    return config.statusMapping[statusKey] || statusKey;
  }

  /**
   * Get status key from display label
   */
  getStatusKey(statusLabel: string): string {
    const config = this.loadConfig();
    for (const [key, label] of Object.entries(config.statusMapping)) {
      if (label === statusLabel) return key;
    }
    return statusLabel;
  }

  /**
   * Get all status mappings
   */
  getStatusMappings(): Record<string, string> {
    const config = this.loadConfig();
    return config.statusMapping;
  }

  /**
   * Load a specific workflow content
   */
  loadWorkflow(workflowType: 'creation' | 'update' | 'execution'): string {
    const cacheKey = workflowType;
    
    if (this.workflows.has(cacheKey)) {
      return this.workflows.get(cacheKey)!;
    }

    const config = this.loadConfig();
    const workflowPath = config.workflowFiles[workflowType];

    try {
      const workflowContent = readFileSync(workflowPath, 'utf-8');
      this.workflows.set(cacheKey, workflowContent);
      return workflowContent;
    } catch (error) {
      throw new Error(`Failed to load workflow ${workflowType} from ${workflowPath}: ${error}`);
    }
  }
}