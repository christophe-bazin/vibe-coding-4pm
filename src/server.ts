/**
 * Simple Notion Workflow MCP Server
 * 
 * This MCP server provides workflow guidance for development tasks
 * using config-based workflows and simple status management.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import { Client } from '@notionhq/client';

import { SimpleProgressTracker } from './simple-progress-tracker.js';
import { parseNotionUrl } from './utils.js';
import { TodoManager } from './todo-manager.js';
import { ProgressCalculator } from './progress-calculator.js';
import { WorkflowConfig } from './config-loader.js';

class NotionWorkflowServer {
  private server: Server;
  private notion: Client;
  private tracker: SimpleProgressTracker;
  private todoManager: TodoManager;
  private progressCalculator: ProgressCalculator;
  private config: WorkflowConfig;

  constructor() {
    this.server = new Server(
      {
        name: 'notion-vibe-coding',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Get configuration from environment variables
    const apiKey = process.env.NOTION_API_KEY;
    const databaseId = process.env.NOTION_DATABASE_ID;
    
    if (!apiKey) {
      throw new Error('NOTION_API_KEY environment variable is required');
    }
    if (!databaseId) {
      throw new Error('NOTION_DATABASE_ID environment variable is required');
    }

    // Parse configuration from environment
    this.config = this.parseConfigFromEnv();

    this.notion = new Client({ auth: apiKey });
    this.tracker = new SimpleProgressTracker(this.notion, this.config, databaseId);
    this.todoManager = new TodoManager(this.notion);
    
    // Initialize progress calculator with config
    this.progressCalculator = new ProgressCalculator(
      {
        todoProgressionEnabled: true,
        autoProgressionThresholds: { inProgress: 1, test: 100 }
      },
      Object.keys(this.config.statusMapping),
      this.config.transitions
    );

    this.setupToolHandlers();
  }

  private parseConfigFromEnv(): WorkflowConfig {
    const configJson = process.env.WORKFLOW_CONFIG;
    
    if (!configJson) {
      throw new Error('WORKFLOW_CONFIG environment variable is required');
    }

    try {
      let config: any;
      
      // Gère les deux formats : string JSON et objet direct
      if (typeof configJson === 'string') {
        config = JSON.parse(configJson);
      } else if (typeof configJson === 'object' && configJson !== null) {
        config = configJson;
      } else {
        throw new Error('WORKFLOW_CONFIG must be a JSON string or object');
      }
      
      // VALIDATION CRITIQUE: Vérifie la structure
      this.validateWorkflowConfig(config);
      
      return config as WorkflowConfig;
    } catch (error) {
      console.error('Failed to parse WORKFLOW_CONFIG:', error);
      throw new Error(`Failed to parse WORKFLOW_CONFIG: ${error}`);
    }
  }

  private validateWorkflowConfig(config: any): void {
    const requiredFields = ['statusMapping', 'transitions', 'taskTypes', 'defaultStatus', 'requiresValidation', 'workflowFiles'];
    
    for (const field of requiredFields) {
      if (!config[field]) {
        throw new Error(`Missing required field in WORKFLOW_CONFIG: ${field}`);
      }
    }
    
    // Vérifie statusMapping
    const requiredStatuses = ['notStarted', 'inProgress', 'test', 'done'];
    for (const status of requiredStatuses) {
      if (!config.statusMapping[status]) {
        throw new Error(`Missing status mapping: ${status}`);
      }
    }
    
    // Vérifie que defaultStatus existe dans statusMapping
    if (!config.statusMapping[config.defaultStatus]) {
      throw new Error(`Default status "${config.defaultStatus}" not found in statusMapping`);
    }
    
    console.error('✅ WORKFLOW_CONFIG validation passed');
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'start_task_workflow',
          description: 'Initialize a workflow for a Notion task and get workflow guidance',
          inputSchema: {
            type: 'object',
            properties: {
              taskUrl: {
                type: 'string',
                description: 'The Notion task URL',
              },
              workflowType: {
                type: 'string',
                enum: this.config.taskTypes.map(t => t.toLowerCase()),
                description: 'Type of workflow to initialize',
              },
            },
            required: ['taskUrl', 'workflowType'],
          },
        },
        {
          name: 'get_workflow_guidance',
          description: 'Get workflow guidance for task creation, update, or execution',
          inputSchema: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                enum: ['creation', 'update', 'execution'],
                description: 'Type of workflow guidance needed',
              },
            },
            required: ['action'],
          },
        },
        {
          name: 'update_task_status',
          description: 'Update task status according to workflow rules',
          inputSchema: {
            type: 'object',
            properties: {
              taskId: {
                type: 'string',
                description: 'The Notion task/page ID',
              },
              newStatus: {
                type: 'string',
                description: 'New status to set',
              },
              force: {
                type: 'boolean',
                description: 'Force update bypassing validation',
                default: false,
              },
            },
            required: ['taskId', 'newStatus'],
          },
        },
        {
          name: 'get_task_info',
          description: 'Get current task status and available transitions',
          inputSchema: {
            type: 'object',
            properties: {
              taskId: {
                type: 'string',
                description: 'The Notion task/page ID',
              },
            },
            required: ['taskId'],
          },
        },
        {
          name: 'create_task',
          description: 'Create a new task in Notion database with workflow template',
          inputSchema: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'The task title',
              },
              taskType: {
                type: 'string',
                enum: this.config.taskTypes,
                description: 'Type of task to create',
              },
              description: {
                type: 'string',
                description: 'Task description and content',
              },
              processedContent: {
                type: 'string',
                description: 'Pre-processed task content (when provided, skips AI instruction step)',
              },
            },
            required: ['title', 'taskType', 'description'],
          },
        },
        {
          name: 'update_task',
          description: 'Update task content (title, description, type) without changing status',
          inputSchema: {
            type: 'object',
            properties: {
              taskId: {
                type: 'string',
                description: 'The Notion task/page ID',
              },
              title: {
                type: 'string',
                description: 'New task title (optional)',
              },
              content: {
                type: 'string',
                description: 'New task content/description (optional)',
              },
              taskType: {
                type: 'string',
                enum: this.config.taskTypes,
                description: 'New task type (optional)',
              },
            },
            required: ['taskId'],
          },
        },
        {
          name: 'progress_todo',
          description: 'Mark a specific todo as completed and auto-update task status based on progress',
          inputSchema: {
            type: 'object',
            properties: {
              taskId: {
                type: 'string',
                description: 'Notion page ID',
              },
              todoText: {
                type: 'string',
                description: 'Exact text of the todo to update',
              },
              completed: {
                type: 'boolean',
                description: 'Mark as completed (true) or uncompleted (false)',
              },
              autoProgress: {
                type: 'boolean',
                description: 'Automatically update task status based on completion percentage',
                default: true,
              },
            },
            required: ['taskId', 'todoText', 'completed'],
          },
        },
        {
          name: 'analyze_task_todos',
          description: 'Extract and analyze all todos from a task with completion statistics',
          inputSchema: {
            type: 'object',
            properties: {
              taskId: {
                type: 'string',
                description: 'Notion page ID',
              },
              includeHierarchy: {
                type: 'boolean',
                description: 'Include hierarchical structure analysis (nested todos)',
                default: false,
              },
            },
            required: ['taskId'],
          },
        },
        {
          name: 'batch_progress_todos',
          description: 'Update multiple todos at once for efficient progress tracking',
          inputSchema: {
            type: 'object',
            properties: {
              taskId: {
                type: 'string',
                description: 'Notion page ID',
              },
              updates: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    todoText: { type: 'string' },
                    completed: { type: 'boolean' },
                  },
                  required: ['todoText', 'completed'],
                },
                description: 'Array of todo updates to apply',
              },
              autoProgress: {
                type: 'boolean',
                description: 'Auto-update task status after batch update',
                default: true,
              },
            },
            required: ['taskId', 'updates'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'start_task_workflow':
            return await this.handleStartTaskWorkflow(args as {
              taskUrl: string;
              workflowType: string;
            });

          case 'get_workflow_guidance':
            return await this.handleGetWorkflowGuidance(args as {
              action: 'creation' | 'update' | 'execution';
            });

          case 'update_task_status':
            return await this.handleUpdateTaskStatus(args as {
              taskId: string;
              newStatus: string;
              force?: boolean;
            });

          case 'get_task_info':
            return await this.handleGetTaskInfo(args as {
              taskId: string;
            });

          case 'create_task':
            return await this.handleCreateTask(args as {
              title: string;
              taskType: string;
              description: string;
              processedContent?: string;
            });

          case 'update_task':
            return await this.handleUpdateTask(args as {
              taskId: string;
              title?: string;
              content?: string;
              taskType?: string;
            });

          case 'progress_todo':
            return await this.handleProgressTodo(args as {
              taskId: string;
              todoText: string;
              completed: boolean;
              autoProgress?: boolean;
            });

          case 'analyze_task_todos':
            return await this.handleAnalyzeTaskTodos(args as {
              taskId: string;
              includeHierarchy?: boolean;
            });

          case 'batch_progress_todos':
            return await this.handleBatchProgressTodos(args as {
              taskId: string;
              updates: Array<{ todoText: string; completed: boolean }>;
              autoProgress?: boolean;
            });

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new McpError(ErrorCode.InternalError, errorMessage);
      }
    });
  }

  private async handleStartTaskWorkflow(args: {
    taskUrl: string;
    workflowType: string;
  }) {
    const { taskUrl, workflowType } = args;

    // Parse Notion URL to get page ID
    const urlInfo = parseNotionUrl(taskUrl);
    if (!urlInfo.isValid) {
      throw new Error(`Invalid Notion URL: ${taskUrl}`);
    }

    const pageId = urlInfo.pageId;

    try {
      // Sync with Notion and get current status
      const state = await this.tracker.syncWithNotion(pageId, workflowType);
      
      // Get workflow guidance
      const guidance = this.tracker.getWorkflowGuidance('creation');

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              taskId: pageId,
              workflowType,
              currentStatus: state.currentStatus,
              availableStatuses: this.tracker.getAvailableStatuses(),
              nextStatuses: this.tracker.getNextStatuses(pageId),
              guidance: guidance.substring(0, 500) + '...',
              message: `Workflow initialized for ${workflowType} task. Current status: ${state.currentStatus}`
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to start task workflow: ${error}`);
    }
  }

  private async handleGetWorkflowGuidance(args: {
    action: 'creation' | 'update' | 'execution';
  }) {
    const { action } = args;

    try {
      const guidance = this.tracker.getWorkflowGuidance(action);

      return {
        content: [
          {
            type: 'text',
            text: guidance
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to get workflow guidance: ${error}`);
    }
  }

  private async handleUpdateTaskStatus(args: {
    taskId: string;
    newStatus: string;
    force?: boolean;
  }) {
    const { taskId, newStatus, force = false } = args;

    try {
      if (force) {
        await this.tracker.forceStatusUpdate(taskId, newStatus, 'Manual override');
      } else {
        await this.tracker.updateTaskStatus(taskId, newStatus);
      }

      const nextStatuses = this.tracker.getNextStatuses(taskId);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              taskId,
              newStatus,
              nextStatuses,
              message: `Status updated to: ${newStatus}`
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to update task status: ${error}`);
    }
  }

  private async handleGetTaskInfo(args: { taskId: string }) {
    const { taskId } = args;

    try {
      const state = this.tracker.getWorkflowState(taskId);
      const nextStatuses = this.tracker.getNextStatuses(taskId);
      const allStatuses = this.tracker.getAvailableStatuses();
      const taskTypes = this.tracker.getAvailableTaskTypes();

      // Get todo statistics
      let todoStats = null;
      let progressRecommendation = null;
      try {
        const todoAnalysis = await this.todoManager.extractTodosFromTask(taskId, false);
        todoStats = todoAnalysis.stats;
        
        const currentStatus = state?.currentStatus || await this.tracker.readCurrentStatus(taskId);
        progressRecommendation = this.progressCalculator.calculateRecommendedStatus(
          currentStatus,
          todoStats
        );
      } catch (todoError) {
        // Todo analysis is optional - don't fail if it doesn't work
        console.warn(`Could not analyze todos for task ${taskId}: ${todoError}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              taskId,
              currentStatus: state?.currentStatus || 'Unknown',
              taskType: state?.taskType || 'Unknown',
              nextStatuses,
              allStatuses,
              taskTypes,
              todoStats: todoStats ? {
                total: todoStats.total,
                completed: todoStats.completed,
                percentage: todoStats.percentage,
                nextTodos: todoStats.nextTodos
              } : null,
              progressRecommendation: progressRecommendation ? {
                recommendedStatus: progressRecommendation.recommendedStatus,
                shouldAutoProgress: progressRecommendation.shouldAutoProgress,
                reason: progressRecommendation.reason
              } : null,
              message: `Task info retrieved for ${taskId}`
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to get task info: ${error}`);
    }
  }

  private async handleCreateTask(args: {
    title: string;
    taskType: string;
    description: string;
    processedContent?: string;
  }) {
    const { title, taskType, description, processedContent } = args;

    try {
      // Step 2: If processedContent is provided, create the task directly
      if (processedContent) {
        const taskId = await this.tracker.createTask(title, taskType, processedContent);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                taskId,
                title,
                taskType,
                status: this.tracker.getAvailableStatuses()[0],
                message: `Task created successfully: ${title}`,
                url: `https://notion.so/${taskId}`
              }, null, 2)
            }
          ]
        };
      }

      // Step 1: Return instruction for Claude to process
      const guidance = this.tracker.getWorkflowGuidance('creation');
      const contextualInstruction = this.generateContextualInstruction(taskType, description, guidance);

      return {
        content: [
          {
            type: 'text',
            text: `**CONTEXTUALIZATION NEEDED**: Please analyze the task and create appropriate content based on the template below, then call create_task again with the processed content.

**Task**: ${title}
**Type**: ${taskType}  
**Description**: ${description}

**Instructions**: ${contextualInstruction.instruction}

**Template to contextualize**:
${contextualInstruction.template}

**When ready**, call create_task again with:
- Same title, taskType, description
- Add processedContent parameter with your contextualized version`
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to create task: ${error}`);
    }
  }

  private generateContextualInstruction(taskType: string, description: string, guidance: string): {
    instruction: string;
    template: string;
  } {
    // Extract template for this task type from guidance
    const regex = new RegExp(`#### ${taskType}\\s*\`\`\`([\\s\\S]*?)\`\`\``, 'i');
    const match = guidance.match(regex);
    
    if (!match || !match[1]) {
      throw new Error(`No template found for task type: ${taskType}`);
    }
    
    const template = match[1].trim();
    
    const instruction = `Based on the task "${description}", follow the template structure below and replace generic content with specific, actionable items. 
    
Key guidelines:
- Adapt the number of items based on task complexity (not fixed counts)
- Create meaningful sections if the task requires them
- Replace placeholders with concrete, project-specific content
- Ensure acceptance criteria are measurable and testable
- Break implementation into logical, sequential steps
- Focus on what's actually needed for this specific task`;

    return { instruction, template };
  }

  private async handleUpdateTask(args: {
    taskId: string;
    title?: string;
    content?: string;
    taskType?: string;
  }) {
    const { taskId, title, content, taskType } = args;

    try {
      // Get workflow guidance for updates
      const guidance = this.tracker.getWorkflowGuidance('update');
      
      // Prepare updates object
      const updates: any = {};
      if (title) updates.title = title;
      if (content) updates.content = content;
      if (taskType) updates.taskType = taskType;

      // Update the task
      await this.tracker.updateTaskContent(taskId, updates);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              taskId,
              updates: Object.keys(updates),
              message: `Task updated successfully`,
              guidance: guidance.substring(0, 300) + '...'
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to update task: ${error}`);
    }
  }

  private formatTaskContent(taskType: string, description: string, guidance: string): string {
    // Extract template from workflow guidance
    const regex = new RegExp(`#### ${taskType}\\s*\`\`\`([\\s\\S]*?)\`\`\``, 'i');
    const match = guidance.match(regex);
    
    if (match && match[1]) {
      // Use template from guidance and replace placeholders
      let template = match[1].trim();
      
      // Replace specific placeholders based on task type
      if (taskType === 'Feature') {
        template = template.replace(/\[Description of the feature\]/g, description);
      } else if (taskType === 'Bug') {
        template = template.replace(/\[Description of the bug\]/g, description);
      } else if (taskType === 'Refactoring') {
        template = template.replace(/\[Why this refactoring is necessary\]/g, description);
      }
      
      return template;
    }
    
    // No template found - this is a configuration error
    throw new Error(`Template not found for task type "${taskType}" in workflow guidance. Check your workflow configuration.`);
  }

  private async handleProgressTodo(args: {
    taskId: string;
    todoText: string;
    completed: boolean;
    autoProgress?: boolean;
  }) {
    const { taskId, todoText, completed, autoProgress = true } = args;

    try {
      // Update the todo
      const result = await this.todoManager.updateTodo(taskId, todoText, completed);
      
      // Calculate progress recommendation
      const currentStatus = await this.tracker.readCurrentStatus(taskId);
      const recommendation = this.progressCalculator.calculateRecommendedStatus(
        currentStatus,
        result.stats
      );

      // Auto-progress if enabled and recommended
      if (autoProgress && recommendation.shouldAutoProgress) {
        await this.tracker.updateTaskStatus(taskId, recommendation.recommendedStatus);
      }

      // Generate progress summary
      const summary = this.progressCalculator.generateProgressSummary(
        recommendation.shouldAutoProgress ? recommendation.recommendedStatus : currentStatus,
        result.stats,
        recommendation
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              taskId,
              todoText,
              completed,
              autoProgressed: autoProgress && recommendation.shouldAutoProgress,
              newStatus: recommendation.shouldAutoProgress ? recommendation.recommendedStatus : currentStatus,
              stats: result.stats,
              summary,
              message: `Todo "${todoText}" marked as ${completed ? 'completed' : 'incomplete'}`
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to progress todo: ${error}`);
    }
  }

  private async handleAnalyzeTaskTodos(args: {
    taskId: string;
    includeHierarchy?: boolean;
  }) {
    const { taskId, includeHierarchy = false } = args;

    try {
      // Extract and analyze todos
      const analysis = await this.todoManager.extractTodosFromTask(taskId, includeHierarchy);
      
      // Get current status for recommendation
      const currentStatus = await this.tracker.readCurrentStatus(taskId);
      const recommendation = this.progressCalculator.calculateRecommendedStatus(
        currentStatus,
        analysis.stats
      );

      // Get additional insights
      const insights = this.progressCalculator.analyzeProgressDistribution(analysis.stats);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              taskId,
              todos: analysis.todos,
              stats: analysis.stats,
              currentStatus,
              recommendedStatus: recommendation.recommendedStatus,
              shouldAutoProgress: recommendation.shouldAutoProgress,
              insights: insights.insights,
              recommendations: insights.recommendations,
              blockers: insights.blockers,
              message: `Found ${analysis.stats.total} todos (${analysis.stats.completed} completed)`
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to analyze task todos: ${error}`);
    }
  }

  private async handleBatchProgressTodos(args: {
    taskId: string;
    updates: Array<{ todoText: string; completed: boolean }>;
    autoProgress?: boolean;
  }) {
    const { taskId, updates, autoProgress = true } = args;

    try {
      // Batch update todos
      const result = await this.todoManager.batchUpdateTodos(taskId, updates);
      
      // Calculate progress recommendation
      const currentStatus = await this.tracker.readCurrentStatus(taskId);
      const recommendation = this.progressCalculator.calculateRecommendedStatus(
        currentStatus,
        result.stats
      );

      // Auto-progress if enabled and recommended
      if (autoProgress && recommendation.shouldAutoProgress) {
        await this.tracker.updateTaskStatus(taskId, recommendation.recommendedStatus);
      }

      // Generate progress summary
      const summary = this.progressCalculator.generateProgressSummary(
        recommendation.shouldAutoProgress ? recommendation.recommendedStatus : currentStatus,
        result.stats,
        recommendation
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              taskId,
              updatesApplied: updates.length,
              autoProgressed: autoProgress && recommendation.shouldAutoProgress,
              newStatus: recommendation.shouldAutoProgress ? recommendation.recommendedStatus : currentStatus,
              stats: result.stats,
              summary,
              message: `Batch updated ${updates.length} todos`
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to batch progress todos: ${error}`);
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Notion Vibe Coding MCP server running on stdio');
  }
}

// Start the server
const server = new NotionWorkflowServer();
server.run().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});