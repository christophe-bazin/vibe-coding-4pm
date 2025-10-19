#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

import { ProviderManager } from './providers/ProviderManager.js';
import { ProvidersConfig } from './models/Provider.js';
import { CreationService } from './services/core/CreationService.js';
import { UpdateService } from './services/core/UpdateService.js';
import { ExecutionService } from './services/core/ExecutionService.js';
import { StatusService } from './services/shared/StatusService.js';
import { ValidationService } from './services/shared/ValidationService.js';
import { ResponseFormatter } from './services/shared/ResponseFormatter.js';
import { WorkflowConfig, ExecutionMode } from './models/Workflow.js';

interface ProjectConfig {
  workflow: WorkflowConfig;
  providers: ProvidersConfig;
}

function loadProjectConfig(): ProjectConfig {
  const configPath = resolve(process.cwd(), '.vc4pm', 'config.json');
  if (!existsSync(configPath)) {
    throw new Error(`Project configuration not found: ${configPath}`);
  }
  try {
    const configContent = readFileSync(configPath, 'utf-8');
    return JSON.parse(configContent);
  } catch (error: any) {
    throw new Error(`Failed to parse project configuration: ${error.message}`);
  }
}

function initServices(projectConfig: ProjectConfig) {
  const providersConfig = projectConfig.providers;
  const credentials = extractCredentials(providersConfig);
  const providerManager = new ProviderManager(providersConfig, credentials);
  
  const status = new StatusService(projectConfig.workflow);
  const validation = new ValidationService(projectConfig.workflow, status);
  const creation = new CreationService(providerManager, validation, projectConfig.workflow);
  const update = new UpdateService(providerManager, status, validation, projectConfig.workflow);
  const execution = new ExecutionService(update, status);
  const formatter = new ResponseFormatter();

  return { creation, update, execution, formatter, providerManager };
}

function extractCredentials(providersConfig: ProvidersConfig): Record<string, string | undefined> {
  const credentials = { ...process.env };
  for (const [providerName, providerConfig] of Object.entries(providersConfig.available)) {
    if (providerConfig.config) {
      if (providerName === 'notion' && providerConfig.config.apiKey) {
        credentials.NOTION_API_KEY = providerConfig.config.apiKey;
        credentials.NOTION_DATABASE_ID = providerConfig.config.databaseId;
      }
    }
  }
  return credentials;
}

async function routeCall(name: string, args: any, services: any): Promise<string> {
  const { creation, update, execution, formatter } = services;
  switch (name) {
    case 'execute_task':
      const mode: ExecutionMode = { showProgress: true, autoUpdateStatus: true };
      const result = await execution.executeTask(args.taskId, mode);
      return formatter.formatExecutionResult(result);
    case 'create_task':
      const taskResult = await creation.createTask(args.title, args.taskType, args.description, args.adaptedWorkflow, args.provider);
      return typeof taskResult === 'string' ? taskResult : formatter.formatTaskCreated(taskResult);
    case 'get_task':
      const metadata = await update.getTaskMetadata(args.taskId, args.provider);
      return formatter.formatTaskInfo(metadata);
    case 'update_task':
      await update.updateTask(args.taskId, args, args.provider);
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
      if (!args.adaptedSummary) throw new Error('Missing required parameter: adaptedSummary.');
      await update.appendSummary(args.taskId, args.adaptedSummary);
      return 'Summary appended to task successfully.';
    case 'read_notion_page':
      const pageContent = await update.readNotionPage(args.pageId, args.includeLinkedPages, args.provider);
      return formatter.formatPageContent(pageContent);
    case 'create_notion_page':
      const createdPage = await update.createNotionPage(args.databaseId, args.title, args.content, args.properties, args.provider);
      return formatter.formatPageContent(createdPage);
    case 'update_notion_page':
      await update.updateNotionPage(args.pageId, args.title, args.content, args.properties, args.mode, args.insertAfter, args.provider);
      return `Notion page ${args.pageId} updated successfully.`;
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function main() {
  try {
    const projectConfig = loadProjectConfig();
    const services = initServices(projectConfig);
    const mcpServer = new Server({ name: 'vc4pm-mcp-server', version: '3.0.0' }, { capabilities: { tools: {} } });

    const tools = [
        { name: 'execute_task', description: 'Execute task', inputSchema: { type: 'object', properties: { taskId: { type: 'string' } }, required: ['taskId'] } },
        { name: 'create_task', description: 'Create new task using appropriate workflow template', inputSchema: { type: 'object', properties: { title: { type: 'string' }, taskType: { type: 'string' }, description: { type: 'string' }, adaptedWorkflow: { type: 'string', description: 'Optional: custom workflow template' }, provider: { type: 'string', description: 'Optional: provider to use (notion, linear, github)' } }, required: ['title', 'taskType', 'description'] } },
        { name: 'get_task', description: 'Get task info', inputSchema: { type: 'object', properties: { taskId: { type: 'string' }, provider: { type: 'string', description: 'Optional: provider to use' } }, required: ['taskId'] } },
        { name: 'update_task', description: 'Update task title, type and/or status', inputSchema: { type: 'object', properties: { taskId: { type: 'string' }, title: { type: 'string' }, taskType: { type: 'string' }, status: { type: 'string' }, provider: { type: 'string', description: 'Optional: provider to use' } }, required: ['taskId'] } },
        { name: 'get_task_template', description: 'Get task template for adaptation', inputSchema: { type: 'object', properties: { taskType: { type: 'string' } }, required: ['taskType'] } },
        { name: 'analyze_todos', description: 'Analyze todos', inputSchema: { type: 'object', properties: { taskId: { type: 'string' }, includeHierarchy: { type: 'boolean' } }, required: ['taskId'] } },
        { name: 'update_todos', description: 'Batch update todos.', inputSchema: { type: 'object', properties: { taskId: { type: 'string' }, updates: { type: 'array' } }, required: ['taskId', 'updates'] } },
        { name: 'generate_summary', description: 'Generate summary', inputSchema: { type: 'object', properties: { taskId: { type: 'string' } }, required: ['taskId'] } },
        { name: 'get_summary_template', description: 'Get summary template', inputSchema: { type: 'object', properties: { taskId: { type: 'string' } }, required: ['taskId'] } },
        { name: 'append_summary', description: 'Append AI-adapted summary to task.', inputSchema: { type: 'object', properties: { taskId: { type: 'string' }, adaptedSummary: { type: 'string' } }, required: ['taskId', 'adaptedSummary'] } },
        { name: 'read_notion_page', description: 'Read a Notion page and its directly linked pages', inputSchema: { type: 'object', properties: { pageId: { type: 'string' }, includeLinkedPages: { type: 'boolean', default: true }, provider: { type: 'string', description: 'Optional: provider to use' } }, required: ['pageId'] } },
        { name: 'create_notion_page', description: 'Create a new page in a Notion database', inputSchema: { type: 'object', properties: { databaseId: { type: 'string', description: 'Database ID or full Notion URL' }, title: { type: 'string', description: 'Page title' }, content: { type: 'string', description: 'Optional: markdown content to add to the page' }, properties: { type: 'object', description: 'Optional: additional properties to set' }, provider: { type: 'string', description: 'Optional: provider to use' } }, required: ['databaseId', 'title'] } },
        { name: 'update_notion_page', description: 'Update an existing Notion page', inputSchema: { type: 'object', properties: { pageId: { type: 'string', description: 'Page ID or full Notion URL' }, title: { type: 'string', description: 'Optional: new page title' }, content: { type: 'string', description: 'Optional: markdown content to add or replace' }, properties: { type: 'object', description: 'Optional: properties to update' }, mode: { type: 'string', enum: ['append', 'replace', 'insert'], default: 'append', description: 'Optional: append (default), replace, or insert with insertAfter' }, insertAfter: { type: 'string', description: 'Optional: text to search for; inserts content after matching block (requires mode: insert)' }, provider: { type: 'string', description: 'Optional: provider to use' } }, required: ['pageId'] } },
    ];

    mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

    mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      try {
        const result = await routeCall(name, args, services);
        return { content: [{ type: 'text', text: result }] };
      } catch (error: any) {
        throw new McpError(ErrorCode.InternalError, error.message);
      }
    });

    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
    console.error('✅ VC4PM MCP Server running on stdio');

  } catch (error: any) {
    console.error(`❌ Failed to start server: ${error.message}`);
    process.exit(1);
  }
}

main();
