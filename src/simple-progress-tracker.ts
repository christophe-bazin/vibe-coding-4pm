/**
 * Simplified progress tracker using config-based approach
 */

import { Client } from '@notionhq/client';
import { ConfigLoader, WorkflowConfig } from './config-loader.js';
import { TodoItem } from './types.js';
import { TaskIntelligenceService, ProjectContext, IntelligenceConfig, ContextualInstruction } from './task-intelligence-service.js';

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
  private databaseId: string;
  private intelligenceService: TaskIntelligenceService;

  constructor(notion: Client, config: WorkflowConfig, databaseId: string, intelligenceConfig?: IntelligenceConfig) {
    this.notion = notion;
    this.config = new ConfigLoader(config);
    this.databaseId = databaseId;
    
    // Initialize intelligence service with default config if not provided
    const defaultIntelligenceConfig: IntelligenceConfig = {
      mode: 'contextual',
      environment: 'claude-code'
    };
    this.intelligenceService = new TaskIntelligenceService(intelligenceConfig || defaultIntelligenceConfig);
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
            status: {
              name: this.config.getStatusLabel(newStatus)
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
   * Process workflow template with status mappings
   */
  private processWorkflowTemplate(content: string): string {
    const statusMappings = this.config.getStatusMappings();
    let processed = content;
    
    for (const [key, label] of Object.entries(statusMappings)) {
      const placeholder = `{{status_${key}}}`;
      processed = processed.replace(new RegExp(placeholder, 'g'), label);
    }
    
    return processed;
  }

  /**
   * Get workflow guidance for a specific action
   */
  getWorkflowGuidance(action: 'creation' | 'update' | 'execution'): string {
    const rawContent = this.config.loadWorkflow(action);
    return this.processWorkflowTemplate(rawContent);
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
    return config.transitions[state.currentStatus] || [];
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
      const statusLabel = (page as any).properties?.Status?.status?.name;
      if (statusLabel) {
        return this.config.getStatusKey(statusLabel);
      }
      return this.config.getDefaultStatus();
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
    title: string, 
    taskType: string, 
    content: string,
    projectContext?: ProjectContext
  ): Promise<string> {
    
    try {
      // Validate task type
      if (!this.config.getValidTaskTypes().includes(taskType)) {
        throw new Error(`Invalid task type: ${taskType}`);
      }

      const defaultStatusKey = this.config.getDefaultStatus();
      const defaultStatus = this.config.getStatusLabel(defaultStatusKey);

      // Create the page in Notion
      const response = await this.notion.pages.create({
        parent: {
          database_id: this.databaseId
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
            status: {
              name: defaultStatus
            }
          },
          Type: {
            select: {
              name: taskType
            }
          }
        },
        children: this.parseContentToBlocks(
          this.contextualizeTaskContent(taskType, content, projectContext)
        )
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
          children: this.parseContentToBlocks(updates.content)
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
   * Contextualize task content using intelligence service
   */
  private contextualizeTaskContent(taskType: string, content: string, projectContext?: ProjectContext): string {
    // If content already looks like a full template (has sections), don't contextualize
    if (content.includes('## Acceptance Criteria') || content.includes('## Implementation Steps')) {
      return content;
    }
    
    // Get workflow guidance to use as template
    const guidance = this.getWorkflowGuidance('creation');
    
    // Extract template for this task type
    const regex = new RegExp(`#### ${taskType}\\s*\`\`\`([\\s\\S]*?)\`\`\``, 'i');
    const match = guidance.match(regex);
    
    if (match && match[1]) {
      const template = match[1].trim();
      
      // Use intelligence service to prepare contextual instruction
      const instruction = this.intelligenceService.prepareContextualInstruction(
        taskType,
        content, // This is the description
        template,
        projectContext
      );
      
      // If in simple mode, just return basic template
      if (instruction.mode === 'simple') {
        return instruction.context.template;
      }
      
      // For contextual mode, apply basic contextualization based on the instruction
      return this.applyContextualIntelligence(instruction);
    }
    
    // Fallback to original content if no template found
    return content;
  }

  /**
   * Apply contextual intelligence based on instruction and project context
   */
  private applyContextualIntelligence(instruction: ContextualInstruction): string {
    // Just return the enhanced content from TaskIntelligenceService
    return instruction.enhancedContent;
  }

  /**
   * Parse markdown content into Notion blocks
   */
  private parseContentToBlocks(content: string): any[] {
    const lines = content.split('\n');
    const blocks: any[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (!trimmed) {
        // Skip empty lines
        continue;
      } else if (trimmed.startsWith('## ')) {
        // Heading 2
        blocks.push({
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{
              type: 'text',
              text: { content: trimmed.substring(3) }
            }]
          }
        });
      } else if (trimmed.startsWith('- [ ] ')) {
        // Todo item
        blocks.push({
          object: 'block',
          type: 'to_do',
          to_do: {
            rich_text: [{
              type: 'text',
              text: { content: trimmed.substring(6) }
            }],
            checked: false
          }
        });
      } else if (trimmed.startsWith('- ')) {
        // Bullet point
        blocks.push({
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [{
              type: 'text',
              text: { content: trimmed.substring(2) }
            }]
          }
        });
      } else if (/^\d+\.\s/.test(trimmed)) {
        // Numbered list
        blocks.push({
          object: 'block',
          type: 'numbered_list_item',
          numbered_list_item: {
            rich_text: [{
              type: 'text',
              text: { content: trimmed.replace(/^\d+\.\s/, '') }
            }]
          }
        });
      } else {
        // Regular paragraph
        blocks.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{
              type: 'text',
              text: { content: trimmed }
            }]
          }
        });
      }
    }
    
    return blocks;
  }

  /**
   * Load configuration (public method for other classes)
   */
  loadConfig(): any {
    return this.config.loadConfig();
  }

  /**
   * Reload configuration (no longer needed with direct config)
   */
  reloadConfig(): void {
    // Configuration is now passed directly, no reload needed
  }
}