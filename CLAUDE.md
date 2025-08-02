# Notion Workflow MCP Server - Claude Instructions

MCP server providing AI-guided development workflows for Notion tasks with configuration-driven approach. Available via MCP protocol for Claude Desktop integration.

## Project Overview

This is a Model Context Protocol (MCP) server that enables AI assistants to manage Notion development tasks through structured workflows. The system uses MCP configuration with camelCase conventions and workflow files to guide AI behavior.

## Development Guidelines

- Follow established coding standards (see [docs/development.md](docs/development.md))
- Use semantic commit messages with conventional format
- Maintain clear documentation style with examples
- Test all MCP functions via Claude Desktop MCP integration

## Project Architecture

### 🏗️ **Clean Service Architecture**
```
src/
├── services/core/           # Main business logic
│   ├── CreationService.ts   # Task creation + intelligent templates
│   ├── UpdateService.ts     # Updates + todos with callback system
│   └── ExecutionService.ts  # Orchestration + auto-continuation
├── services/shared/         # Shared utilities
│   ├── StatusService.ts     # Status management + flexible transitions
│   ├── ValidationService.ts # Input validation + error handling
│   └── ResponseFormatter.ts # MCP response formatting
├── adapters/               # External system integrations
│   └── NotionAPIAdapter.ts # Notion API implementation
├── models/                 # Type definitions
└── interfaces/             # Contracts and abstractions
```

### 🔄 **Auto-Continuation System**
- **UpdateService**: Callback system triggers ExecutionService after todo updates
- **ExecutionService**: Auto-detects remaining todos and continues execution
- **Seamless Flow**: AI implements → updates todos → system continues automatically

### 🎯 **Key Features**
- **Template Intelligence**: Adapts Feature/Bug/Refactoring templates based on context
- **Flexible Transitions**: All status changes allowed for maximum flexibility
- **Provider Pattern**: Ready for Linear, GitHub, Jira integration
- **Git Integration**: Development summaries with testing todos

## Essential Commands

Build the server:

```bash
npm run build
```

### Usage Options

**Via Claude Desktop (MCP Protocol):**
- The server runs as an MCP server via Claude's configuration
- All 9 MCP tools available through natural language interface
- Uses `.claude/mcp-config.json` automatically

**Via Claude Code CLI (Development/Testing):**
- Use `node mcp.js <tool> '<json_args>'` to call MCP tools directly
- Example: `node mcp.js create_task '{"title":"test","taskType":"Bug","description":"desc"}'`
- The wrapper handles server startup and MCP protocol automatically


## Codebase Structure

```
src/
├── server.ts                    # Pure MCP router (< 100 lines)
├── adapters/
│   └── NotionAPIAdapter.ts      # Notion API integration
├── interfaces/
│   └── TaskProvider.ts          # Provider abstraction
├── models/
│   ├── Task.ts                  # Task type definitions
│   ├── Todo.ts                  # Todo type definitions
│   └── Workflow.ts              # Execution + configuration types
├── services/core/               # Core business services
│   ├── CreationService.ts       # Task creation + templates
│   ├── UpdateService.ts         # Updates + auto-callback system
│   └── ExecutionService.ts      # Orchestration + continuation
├── services/shared/             # Shared utilities
│   ├── StatusService.ts         # Status management
│   ├── ValidationService.ts     # Input validation
│   └── ResponseFormatter.ts     # MCP formatting
└── types/
    └── Errors.ts                # Custom error types
```

## Configuration System

All configuration is centralized in your project's `.claude/mcp-config.json`:
- **Board configuration**: statusMapping (camelCase), transitions, taskTypes
- **Workflow guidance**: AI guidance in separate .md files with template processing
- **Notion integration**: API key and database ID via environment variables
- **Workflow files**: Referenced by path, kept in MCP server directory
- **camelCase convention**: notStarted, inProgress, test, done

## MCP Tools Available

### Task Management
- `create_task`: Create tasks with intelligent template adaptation (Feature/Bug/Refactoring)
- `get_task`: Get task information with todo statistics and flexible status info
- `update_task`: Update task title, type and/or status with flexible validation
- `execute_task`: Execute with auto-continuation workflow (guides AI step-by-step)

### Template & Workflow
- `get_task_template`: Get specialized templates for each task type
- `get_workflow_guidance`: Get creation workflow guidance (update/execution deprecated)

### Todo Management  
- `analyze_todos`: Extract and analyze todos with completion statistics
- `update_todos`: Batch update with automatic execution continuation
- `generate_dev_summary`: Generate development summary with git changes + testing todos

## Development Workflow

1. Always work on feature branches
2. Update relevant documentation when making changes
3. Test configuration changes against real Notion boards
4. Ensure AI restrictions remain in place
5. **Never mention AI assistance in commits**

## Integration Strategy

1. Clone and build: `git clone && npm install && npm run build`
2. Configure: Copy `mcp-config.example.json` to `.claude/mcp-config.json`
3. Setup Notion: Add API key and database ID to config
4. Customize: Adjust statusMapping, transitions, taskTypes as needed
5. Workflows: Feature/Bug/Refactoring templates in `./workflows/`
6. Auto-execution: System handles todo progression automatically

## Key Implementation Notes

### 🔧 **Service Responsibilities**
- **CreationService**: Template loading, AI adaptation, task creation
- **UpdateService**: Todo/task updates, callback triggering, git summaries
- **ExecutionService**: Auto-continuation, todo-by-todo guidance, orchestration
- **StatusService**: Flexible transitions, status recommendations
- **ValidationService**: Input validation, constraint checking

### ⚡ **Auto-Continuation Flow**
1. AI implements todo using development tools
2. AI calls `update_todos` to mark completion
3. UpdateService triggers callback to ExecutionService
4. ExecutionService auto-launches next execution round
5. System identifies next uncompleted todo and guides AI

### 🎯 **Template Intelligence**
- Separate workflow files: `feature.md`, `bug.md`, `refactoring.md`
- AI adapts template sections based on user description context
- Dynamic todo generation based on detected patterns (files, APIs, etc.)
- Maintains template structure while customizing content

## Security and Best Practices

- API keys configured via MCP environment variables
- Input validation on all MCP tools
- Error handling with clear messages
- No logging of sensitive information
- Configuration isolated per project