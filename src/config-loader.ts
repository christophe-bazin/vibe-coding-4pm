/**
 * Simple configuration loader for workflow files
 */

import { readFileSync } from 'fs';
import { join } from 'path';

export interface BoardConfig {
  name: string;
  statuses: string[];
  transitions: Record<string, string[]>;
  autoProgressionEnabled: boolean;
  requiresValidation: string[];
}

export interface WorkflowConfig {
  board: BoardConfig;
  taskTypes: string[];
  defaultStatus: string;
  workflowFiles: {
    creation: string;
    update: string;
    execution: string;
  };
}

export class ConfigLoader {
  private configPath: string;
  private config: WorkflowConfig | null = null;
  private workflows: Map<string, string> = new Map();

  constructor(configPath: string = './config.json') {
    this.configPath = configPath;
  }

  /**
   * Load configuration from config.json
   */
  loadConfig(): WorkflowConfig {
    if (this.config) {
      return this.config;
    }

    try {
      const configContent = readFileSync(this.configPath, 'utf-8');
      this.config = JSON.parse(configContent);
      return this.config!;
    } catch (error) {
      throw new Error(`Failed to load config from ${this.configPath}: ${error}`);
    }
  }

  /**
   * Load a specific workflow file
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

  /**
   * Get all available workflows
   */
  getAllWorkflows(): Record<string, string> {
    const config = this.loadConfig();
    const workflows: Record<string, string> = {};

    for (const [type, _] of Object.entries(config.workflowFiles)) {
      workflows[type] = this.loadWorkflow(type as any);
    }

    return workflows;
  }

  /**
   * Check if a status transition is allowed
   */
  isTransitionAllowed(currentStatus: string, newStatus: string): boolean {
    const config = this.loadConfig();
    const allowedTransitions = config.board.transitions[currentStatus] || [];
    return allowedTransitions.includes(newStatus);
  }

  /**
   * Get all valid statuses
   */
  getValidStatuses(): string[] {
    const config = this.loadConfig();
    return config.board.statuses;
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
    return config.board.requiresValidation.includes(status);
  }

  /**
   * Reload configuration (useful for development)
   */
  reload(): void {
    this.config = null;
    this.workflows.clear();
  }
}