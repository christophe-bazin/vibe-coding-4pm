/**
 * Simplified progress tracker using config-based approach
 */

import { Client } from '@notionhq/client';
import { ConfigLoader } from './config-loader.js';
import { TodoItem } from './types.js';

export interface SimpleWorkflowState {
  taskId: string;
  taskType: string;
  currentStatus: string;
  todos: TodoItem[];
  completedTodos: Set<string>;
  startedAt: Date;
  lastUpdated: Date;
}

export class SimpleProgressTracker {
  private notion: Client;
  private config: ConfigLoader;
  private workflowStates: Map<string, SimpleWorkflowState> = new Map();

  constructor(notion: Client, configPath?: string) {
    this.notion = notion;
    this.config = new ConfigLoader(configPath);
  }

  /**
   * Initialize workflow for a task
   */
  initializeWorkflow(taskId: string, taskType: string, todos: TodoItem[] = []): SimpleWorkflowState {
    const defaultStatus = this.config.getDefaultStatus();
    
    const state: SimpleWorkflowState = {
      taskId,
      taskType,
      currentStatus: defaultStatus,
      todos,
      completedTodos: new Set(),
      startedAt: new Date(),
      lastUpdated: new Date()
    };

    this.workflowStates.set(taskId, state);
    return state;
  }

  /**
   * Update task status with validation
   */
  async updateTaskStatus(taskId: string, newStatus: string, force: boolean = false): Promise<void> {
    const state = this.workflowStates.get(taskId);
    if (!state) {
      throw new Error(`No workflow state found for task ${taskId}`);
    }

    // Validate status
    if (!this.config.getValidStatuses().includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }

    // Check transition
    if (!force && !this.config.isTransitionAllowed(state.currentStatus, newStatus)) {
      throw new Error(`Invalid transition from ${state.currentStatus} to ${newStatus}`);
    }

    try {
      // Update in Notion
      await this.notion.pages.update({
        page_id: taskId,
        properties: {
          Status: {
            select: {
              name: newStatus
            }
          }
        }
      });

      // Update local state
      state.currentStatus = newStatus;
      state.lastUpdated = new Date();

    } catch (error) {
      throw new Error(`Failed to update task status: ${error}`);
    }
  }

  /**
   * Get workflow guidance for a specific action
   */
  getWorkflowGuidance(action: 'creation' | 'update' | 'execution'): string {
    return this.config.loadWorkflow(action);
  }

  /**
   * Get current state
   */
  getWorkflowState(taskId: string): SimpleWorkflowState | undefined {
    return this.workflowStates.get(taskId);
  }

  /**
   * Get available statuses
   */
  getAvailableStatuses(): string[] {
    return this.config.getValidStatuses();
  }

  /**
   * Get available task types
   */
  getAvailableTaskTypes(): string[] {
    return this.config.getValidTaskTypes();
  }

  /**
   * Get next possible statuses for current state
   */
  getNextStatuses(taskId: string): string[] {
    const state = this.workflowStates.get(taskId);
    if (!state) {
      return [];
    }

    const config = this.config.loadConfig();
    return config.board.transitions[state.currentStatus] || [];
  }

  /**
   * Force status update (bypass validation)
   */
  async forceStatusUpdate(taskId: string, newStatus: string, reason?: string): Promise<void> {
    console.warn(`Forcing status update for ${taskId}: ${reason || 'No reason provided'}`);
    await this.updateTaskStatus(taskId, newStatus, true);
  }

  /**
   * Read current status from Notion
   */
  async readCurrentStatus(taskId: string): Promise<string> {
    try {
      const page = await this.notion.pages.retrieve({ page_id: taskId });
      const status = (page as any).properties?.Status?.select?.name;
      return status || this.config.getDefaultStatus();
    } catch (error) {
      throw new Error(`Failed to read status from Notion: ${error}`);
    }
  }

  /**
   * Sync state with Notion (useful for initialization)
   */
  async syncWithNotion(taskId: string, taskType: string): Promise<SimpleWorkflowState> {
    const currentStatus = await this.readCurrentStatus(taskId);
    
    // Get todos from Notion (simplified - would need full implementation)
    const todos: TodoItem[] = []; // TODO: Extract from Notion page
    
    const state: SimpleWorkflowState = {
      taskId,
      taskType,
      currentStatus,
      todos,
      completedTodos: new Set(),
      startedAt: new Date(),
      lastUpdated: new Date()
    };

    this.workflowStates.set(taskId, state);
    return state;
  }

  /**
   * Get summary for all tasks
   */
  getSummary(): { taskId: string; status: string; type: string }[] {
    return Array.from(this.workflowStates.values()).map(state => ({
      taskId: state.taskId,
      status: state.currentStatus,
      type: state.taskType
    }));
  }

  /**
   * Create a new task in Notion
   */
  async createTask(
    databaseId: string, 
    title: string, 
    taskType: string, 
    content: string
  ): Promise<string> {
    try {
      // Validate task type
      if (!this.config.getValidTaskTypes().includes(taskType)) {
        throw new Error(`Invalid task type: ${taskType}`);
      }

      const defaultStatus = this.config.getDefaultStatus();

      // Create the page in Notion
      const response = await this.notion.pages.create({
        parent: {
          database_id: databaseId
        },
        properties: {
          title: {
            title: [
              {
                text: {
                  content: title
                }
              }
            ]
          },
          Status: {
            select: {
              name: defaultStatus
            }
          },
          Type: {
            select: {
              name: taskType
            }
          }
        },
        children: [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: content
                  }
                }
              ]
            }
          }
        ]
      });

      const taskId = response.id;

      // Initialize workflow state
      this.initializeWorkflow(taskId, taskType);

      return taskId;
    } catch (error) {
      throw new Error(`Failed to create task: ${error}`);
    }
  }

  /**
   * Update task content in Notion
   */
  async updateTaskContent(
    taskId: string, 
    updates: {
      title?: string;
      content?: string;
      taskType?: string;
    }
  ): Promise<void> {
    try {
      const properties: any = {};

      // Update title if provided
      if (updates.title) {
        properties.title = {
          title: [
            {
              text: {
                content: updates.title
              }
            }
          ]
        };
      }

      // Update task type if provided and valid
      if (updates.taskType) {
        if (!this.config.getValidTaskTypes().includes(updates.taskType)) {
          throw new Error(`Invalid task type: ${updates.taskType}`);
        }
        properties.Type = {
          select: {
            name: updates.taskType
          }
        };
      }

      // Update properties if any
      if (Object.keys(properties).length > 0) {
        await this.notion.pages.update({
          page_id: taskId,
          properties
        });
      }

      // Update content if provided
      if (updates.content) {
        // Get current blocks
        const blocks = await this.notion.blocks.children.list({
          block_id: taskId
        });

        // Clear existing blocks (simplified approach)
        for (const block of blocks.results) {
          await this.notion.blocks.delete({
            block_id: block.id
          });
        }

        // Add new content
        await this.notion.blocks.children.append({
          block_id: taskId,
          children: [
            {
              object: 'block',
              type: 'paragraph',
              paragraph: {
                rich_text: [
                  {
                    type: 'text',
                    text: {
                      content: updates.content
                    }
                  }
                ]
              }
            }
          ]
        });
      }

      // Update local state if it exists
      const state = this.workflowStates.get(taskId);
      if (state) {
        if (updates.taskType) {
          state.taskType = updates.taskType;
        }
        state.lastUpdated = new Date();
      }

    } catch (error) {
      throw new Error(`Failed to update task content: ${error}`);
    }
  }

  /**
   * Reload configuration
   */
  reloadConfig(): void {
    this.config.reload();
  }
}