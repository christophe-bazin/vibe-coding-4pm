#!/usr/bin/env node

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

class NotionWorkflowServer {
  private server: Server;
  private notion: Client;
  private tracker: SimpleProgressTracker;

  constructor() {
    this.server = new Server(
      {
        name: 'notion-workflow-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize Notion client
    const apiKey = process.env.NOTION_API_KEY;
    if (!apiKey) {
      throw new Error('NOTION_API_KEY environment variable is required');
    }

    this.notion = new Client({ auth: apiKey });
    this.tracker = new SimpleProgressTracker(this.notion, './config.json');

    this.setupToolHandlers();
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
                enum: ['feature', 'bug', 'refactor'],
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
              databaseId: {
                type: 'string',
                description: 'The Notion database ID where to create the task',
              },
              title: {
                type: 'string',
                description: 'The task title',
              },
              taskType: {
                type: 'string',
                enum: ['Feature', 'Bug', 'Refactoring'],
                description: 'Type of task to create',
              },
              description: {
                type: 'string',
                description: 'Task description and content',
              },
            },
            required: ['databaseId', 'title', 'taskType', 'description'],
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
                enum: ['Feature', 'Bug', 'Refactoring'],
                description: 'New task type (optional)',
              },
            },
            required: ['taskId'],
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
              databaseId: string;
              title: string;
              taskType: string;
              description: string;
            });

          case 'update_task':
            return await this.handleUpdateTask(args as {
              taskId: string;
              title?: string;
              content?: string;
              taskType?: string;
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
    databaseId: string;
    title: string;
    taskType: string;
    description: string;
  }) {
    const { databaseId, title, taskType, description } = args;

    try {
      // Get workflow guidance for creation
      const guidance = this.tracker.getWorkflowGuidance('creation');
      
      // Create formatted content using the workflow template
      const formattedContent = this.formatTaskContent(taskType, description, guidance);

      // Create the task
      const taskId = await this.tracker.createTask(databaseId, title, taskType, formattedContent);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              taskId,
              title,
              taskType,
              status: this.tracker.getAvailableStatuses()[0], // Default status
              message: `Task created successfully: ${title}`,
              url: `https://notion.so/${taskId}`
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to create task: ${error}`);
    }
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
    // Extract template from guidance based on task type
    let template = '';
    
    if (taskType === 'Feature') {
      template = `## Description
${description}

## Acceptance Criteria
- [ ] Feature implemented
- [ ] Unit tests added
- [ ] Documentation updated

## Implementation Steps
- [ ] Initial setup
- [ ] Core implementation
- [ ] Testing  
- [ ] Review

## Technical Notes
${description}`;
    } else if (taskType === 'Bug') {
      template = `## Problem Description
${description}

## Reproduction
1. [Steps to reproduce]
2. [Expected vs actual result]

## Correction Criteria
- [ ] Bug fixed
- [ ] Non-regression tests added
- [ ] Verification in test environment

## Investigation
- [ ] Identify root cause
- [ ] Analyze impact
- [ ] Propose solution

## Notes
${description}`;
    } else if (taskType === 'Refactoring') {
      template = `## Refactoring Objective
${description}

## Scope
[Files/modules concerned]

## Acceptance Criteria
- [ ] Code refactored
- [ ] Existing tests still pass
- [ ] Performance maintained or improved
- [ ] Documentation updated

## Action Plan
- [ ] Analyze existing code
- [ ] Define new structure
- [ ] Refactor in steps
- [ ] Validate tests

## Risks
[Identified risks and mitigation]`;
    }

    return template;
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Simple Notion Workflow MCP server running on stdio');
  }
}

// Start the server
const server = new NotionWorkflowServer();
server.run().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});