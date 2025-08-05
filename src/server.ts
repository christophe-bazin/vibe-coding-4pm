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

  constructor() {
    this.server = new Server({ name: 'notion-vibe-coding', version: '2.0.0' }, { capabilities: { tools: {} } });
    this.services = this.initServices();
    this.setupRoutes();
  }

  private initServices() {
    const apiKey = process.env.NOTION_API_KEY!;
    const databaseId = process.env.NOTION_DATABASE_ID!;
    const workflowConfig: WorkflowConfig = JSON.parse(process.env.WORKFLOW_CONFIG!);

    const taskProvider = new NotionAPIAdapter(apiKey, databaseId);
    
    const status = new StatusService(workflowConfig);
    const validation = new ValidationService(workflowConfig, status);
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
        { name: 'create_task', description: 'Create new task with workflow adaptation', inputSchema: { type: 'object', properties: { title: { type: 'string' }, taskType: { type: 'string' }, description: { type: 'string' }, adaptedWorkflow: { type: 'string' } }, required: ['title', 'taskType', 'description', 'adaptedWorkflow'] } },
        { name: 'get_task', description: 'Get task info', inputSchema: { type: 'object', properties: { taskId: { type: 'string' } }, required: ['taskId'] } },
        { name: 'update_task', description: 'Update task title, type and/or status', inputSchema: { type: 'object', properties: { taskId: { type: 'string' }, title: { type: 'string' }, taskType: { type: 'string' }, status: { type: 'string' } }, required: ['taskId'] } },
        { name: 'get_task_template', description: 'Get raw task template. IMPORTANT: You must adapt the template to your specific context by replacing bracketed placeholders, contextualizing todos/steps/criteria, using specific terminology, and passing the adapted result in adaptedWorkflow when calling create_task.', inputSchema: { type: 'object', properties: { taskType: { type: 'string' } }, required: ['taskType'] } },
        { name: 'analyze_todos', description: 'Analyze todos', inputSchema: { type: 'object', properties: { taskId: { type: 'string' }, includeHierarchy: { type: 'boolean' } }, required: ['taskId'] } },
        { name: 'update_todos', description: 'Batch update todos. Format: {"taskId":"xxx","updates":[{"todoText":"todo text","completed":true}]}', inputSchema: { type: 'object', properties: { taskId: { type: 'string' }, updates: { type: 'array' } }, required: ['taskId', 'updates'] } },
        { name: 'generate_dev_summary', description: 'Generate development summary with testing todos', inputSchema: { type: 'object', properties: { taskId: { type: 'string' } }, required: ['taskId'] } },
        { name: 'get_dev_summary_template', description: 'Get raw template for AI adaptation', inputSchema: { type: 'object', properties: { taskId: { type: 'string' } }, required: ['taskId'] } },
        { name: 'append_dev_summary', description: 'Append AI-adapted dev summary to Notion task', inputSchema: { type: 'object', properties: { taskId: { type: 'string' }, adaptedSummary: { type: 'string' } }, required: ['taskId', 'adaptedSummary'] } },
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
        const newTask = await creation.createTask(args.title, args.taskType, args.adaptedWorkflow);
        return formatter.formatTaskCreated(newTask);

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

      case 'generate_dev_summary':
        return await update.generateDevSummary(args.taskId);

      case 'get_dev_summary_template':
        return await update.getDevSummaryTemplate(args.taskId);

      case 'append_dev_summary':
        await update.appendDevSummary(args.taskId, args.adaptedSummary);
        return 'Development summary appended to Notion task successfully.';


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