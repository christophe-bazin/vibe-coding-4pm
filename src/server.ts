/**
 * MCP Server - Pure router (< 100 lines)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

import { NotionAPIAdapter } from './adapters/NotionAPIAdapter.js';
import { TaskService } from './services/TaskService.js';
import { TodoService } from './services/TodoService.js';
import { ExecutionService } from './services/ExecutionService.js';
import { WorkflowService } from './services/WorkflowService.js';
import { ResponseFormatter } from './services/ResponseFormatter.js';
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

    // Initialize Notion API adapter
    const taskProvider = new NotionAPIAdapter(apiKey, databaseId);
    
    // Initialize services with TaskProvider
    const todo = new TodoService(taskProvider);
    const workflow = new WorkflowService(workflowConfig);
    const task = new TaskService(taskProvider, todo, workflowConfig, workflow);
    const execution = new ExecutionService(task, todo, workflow);
    const formatter = new ResponseFormatter();

    return { task, todo, execution, workflow, formatter };
  }

  private setupRoutes() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        { name: 'execute_task', description: 'Execute task (auto/step/batch)', inputSchema: { type: 'object', properties: { taskId: { type: 'string' }, mode: { type: 'string', enum: ['auto', 'step', 'batch'] } }, required: ['taskId', 'mode'] } },
        { name: 'create_task', description: 'Create new task', inputSchema: { type: 'object', properties: { title: { type: 'string' }, taskType: { type: 'string' }, description: { type: 'string' } }, required: ['title', 'taskType', 'description'] } },
        { name: 'get_task', description: 'Get task info', inputSchema: { type: 'object', properties: { taskId: { type: 'string' } }, required: ['taskId'] } },
        { name: 'update_task', description: 'Update task content', inputSchema: { type: 'object', properties: { taskId: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' }, taskType: { type: 'string' } }, required: ['taskId'] } },
        { name: 'get_workflow_guidance', description: 'Get workflow guidance', inputSchema: { type: 'object', properties: { type: { type: 'string', enum: ['creation', 'update', 'execution'] } }, required: ['type'] } },
        { name: 'analyze_todos', description: 'Analyze todos', inputSchema: { type: 'object', properties: { taskId: { type: 'string' }, includeHierarchy: { type: 'boolean' } }, required: ['taskId'] } },
        { name: 'update_task_status', description: 'Update task status', inputSchema: { type: 'object', properties: { taskId: { type: 'string' }, newStatus: { type: 'string' } }, required: ['taskId', 'newStatus'] } },
        { name: 'update_todos', description: 'Batch update todos', inputSchema: { type: 'object', properties: { taskId: { type: 'string' }, updates: { type: 'array' } }, required: ['taskId', 'updates'] } },
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
    const { task, todo, execution, workflow, formatter } = this.services;

    switch (name) {
      case 'execute_task':
        const mode: ExecutionMode = { type: args.mode, showProgress: true, autoUpdateStatus: true };
        const result = await execution.executeTask(args.taskId, mode);
        return formatter.formatExecutionResult(result);

      case 'create_task':
        const newTask = await task.createTask(args.title, args.taskType, args.description);
        return formatter.formatTaskCreated(newTask);

      case 'get_task':
        const metadata = await task.getTaskMetadata(args.taskId);
        return formatter.formatTaskInfo(metadata);

      case 'update_task':
        await task.updateTask(args.taskId, args);
        return formatter.formatTaskUpdated(args.taskId, args);

      case 'get_workflow_guidance':
        return await workflow.getWorkflowGuidance(args.type, args.context);

      case 'analyze_todos':
        const analysis = await todo.analyzeTodos(args.taskId, args.includeHierarchy);
        return formatter.formatTodoAnalysis(analysis);

      case 'update_task_status':
        await task.updateTaskStatus(args.taskId, args.newStatus);
        return formatter.formatStatusUpdated(args.taskId, args.newStatus);

      case 'update_todos':
        const updateResult = await todo.updateTodos(args.taskId, args.updates);
        return formatter.formatTodosUpdated(args.taskId, updateResult);

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