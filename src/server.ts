/**
 * MCP Server - Pure router (< 100 lines)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

import { NotionAPIAdapter } from './adapters/NotionAPIAdapter.js';
import { CreationService } from './services/core/CreationService.js';
import { UpdateService } from './services/core/UpdateService.js';
import { ExecutionService } from './services/core/ExecutionService.js';
import { StatusService } from './services/shared/StatusService.js';
import { ValidationService } from './services/shared/ValidationService.js';
import { ResponseFormatter } from './services/shared/ResponseFormatter.js';
import { WorkflowConfig, ExecutionMode } from './models/Workflow.js';


class MCPServer {
  private server: Server;
  private services: any;
  private workflowConfig: WorkflowConfig;

  constructor() {
    this.server = new Server({ name: 'vibe-coding-4pm', version: '2.0.0' }, { capabilities: { tools: {} } });
    this.workflowConfig = JSON.parse(process.env.WORKFLOW_CONFIG!);
    this.services = this.initServices();
    this.setupRoutes();
  }

  private initServices() {
    const apiKey = process.env.NOTION_API_KEY!;
    const databaseId = process.env.NOTION_DATABASE_ID!;

    const taskProvider = new NotionAPIAdapter(apiKey, databaseId);
    
    const status = new StatusService(this.workflowConfig);
    const validation = new ValidationService(this.workflowConfig, status);
    const creation = new CreationService(taskProvider, validation);
    const update = new UpdateService(taskProvider, status, validation);
    const execution = new ExecutionService(update, status);
    const formatter = new ResponseFormatter();

    return { creation, update, execution, formatter };
  }

  private setupRoutes() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        { name: 'execute_task', description: 'Execute task', inputSchema: { type: 'object', properties: { taskId: { type: 'string' } }, required: ['taskId'] } },
        { name: 'create_task', description: 'Create new task using appropriate workflow template', inputSchema: { type: 'object', properties: { title: { type: 'string' }, taskType: { type: 'string' }, description: { type: 'string' }, adaptedWorkflow: { type: 'string', description: 'Optional: custom workflow template' } }, required: ['title', 'taskType', 'description'] } },
        { name: 'get_task', description: 'Get task info', inputSchema: { type: 'object', properties: { taskId: { type: 'string' } }, required: ['taskId'] } },
        { name: 'update_task', description: 'Update task title, type and/or status', inputSchema: { type: 'object', properties: { taskId: { type: 'string' }, title: { type: 'string' }, taskType: { type: 'string' }, status: { type: 'string' } }, required: ['taskId'] } },
        { name: 'get_task_template', description: 'Get task template for adaptation', inputSchema: { type: 'object', properties: { taskType: { type: 'string' } }, required: ['taskType'] } },
        { name: 'analyze_todos', description: 'Analyze todos', inputSchema: { type: 'object', properties: { taskId: { type: 'string' }, includeHierarchy: { type: 'boolean' } }, required: ['taskId'] } },
        { name: 'update_todos', description: 'Batch update todos.', inputSchema: { type: 'object', properties: { taskId: { type: 'string' }, updates: { type: 'array' } }, required: ['taskId', 'updates'] } },
        { name: 'generate_summary', description: 'Generate summary', inputSchema: { type: 'object', properties: { taskId: { type: 'string' } }, required: ['taskId'] } },
        { name: 'get_summary_template', description: 'Get summary template', inputSchema: { type: 'object', properties: { taskId: { type: 'string' } }, required: ['taskId'] } },
        { name: 'append_summary', description: 'Append AI-adapted summary to Notion task.', inputSchema: { type: 'object', properties: { taskId: { type: 'string' }, adaptedSummary: { type: 'string' } }, required: ['taskId', 'adaptedSummary'] } },
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      try {
        const result = await this.routeCall(name, args);
        return { content: [{ type: 'text', text: result }] };
      } catch (error) {
        throw new McpError(ErrorCode.InternalError, `${error}`);
      }
    });
  }

  private async routeCall(name: string, args: any): Promise<string> {
    const { creation, update, execution, formatter } = this.services;

    switch (name) {
      case 'execute_task':
        const mode: ExecutionMode = { showProgress: true, autoUpdateStatus: true };
        const result = await execution.executeTask(args.taskId, mode);
        return formatter.formatExecutionResult(result);

      case 'create_task':
        const taskResult = await creation.createTask(args.title, args.taskType, args.description, args.adaptedWorkflow);
        if (typeof taskResult === 'string') {
          // Return template adaptation instructions
          return taskResult;
        } else {
          // Format the created task
          return formatter.formatTaskCreated(taskResult);
        }

      case 'get_task':
        const metadata = await update.getTaskMetadata(args.taskId);
        return formatter.formatTaskInfo(metadata);

      case 'update_task':
        await update.updateTask(args.taskId, args);
        return formatter.formatTaskUpdated(args.taskId, args);


      case 'get_task_template':
        return await creation.getTaskTemplate(args.taskType);

      case 'analyze_todos':
        const analysis = await update.analyzeTodos(args.taskId, args.includeHierarchy);
        return formatter.formatTodoAnalysis(analysis);

      case 'update_todos':
        const updateResult = await update.updateTodos(args.taskId, args.updates);
        return formatter.formatTodosUpdated(args.taskId, updateResult);

      case 'generate_summary':
        return await update.generateSummary(args.taskId);

      case 'get_summary_template':
        return await update.getSummaryTemplate(args.taskId);

      case 'append_summary':
        if (!args.adaptedSummary) {
          throw new Error('Missing required parameter: adaptedSummary. Use "adaptedSummary", not "summary".');
        }
        await update.appendSummary(args.taskId, args.adaptedSummary);
        return 'Summary appended to Notion task successfully.';


      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }


  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('🚀 MCP Server running');
  }
}

new MCPServer().run().catch(console.error);