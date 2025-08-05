# Notion Workflow MCP Server - Claude Instructions

MCP server providing AI-guided development workflows for Notion tasks with configuration-driven approach. Available via MCP protocol for Claude Desktop integration.

## Project Overview

This is a Model Context Protocol (MCP) server that enables AI assistants to manage Notion development tasks through structured workflows. The system uses MCP configuration with camelCase conventions and workflow files to guide AI behavior.

## Development Guidelines

- Follow established coding standards in [.ai/development/coding-standards.md](.ai/development/coding-standards.md)
- Adhere to commit conventions in [.ai/development/commit-conventions.md](.ai/development/commit-conventions.md)
- Maintain clear documentation style per [.ai/development/documentation-style.md](.ai/development/documentation-style.md)
- Follow the release process defined in [.ai/development/release-process.md](.ai/development/release-process.md)

## Project Architecture

- **Configuration-driven**: All behavior defined in MCP configuration and `templates/*.md`
- **Service-oriented**: Clean separation between core services and shared utilities
- **Workflow adaptation**: AI adapts templates contextually using `adaptedWorkflow` parameter
- **Auto-continuation**: System automatically proceeds to next todos after completion
- **Provider-aware**: Optimized for different AI providers (Claude, Cursor, Copilot) by leveraging their individual strengths
- **Provider pattern**: Ready for Linear, GitHub, Jira integration via TaskProvider interface
- **camelCase convention**: Consistent naming for internal configuration

See detailed architecture in [.ai/project/mcp-architecture.md](.ai/project/mcp-architecture.md)

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
- All 10 MCP tools available through natural language interface

**Via Claude Code CLI (Development/Testing):**
- Use `node mcp.js <tool> '<json_args>'` to call MCP tools directly
- Example: `node mcp.js create_task '{"title":"test","taskType":"Bug","description":"desc","adaptedWorkflow":"..."}'`
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
│   └── ResponseFormatter.ts     # MCP response formatting
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
- `create_task`: Create tasks with workflow adaptation (requires adaptedWorkflow parameter)
- `get_task`: Get task information with todo statistics and flexible status info
- `update_task`: Update task title, type and/or status with flexible validation
- `execute_task`: Execute with auto-continuation workflow (guides AI step-by-step)

### Template & Workflow
- `get_task_template`: Get raw templates for AI adaptation (Feature/Bug/Refactoring)

### Todo Management  
- `analyze_todos`: Extract and analyze todos with completion statistics
- `update_todos`: Batch update with automatic execution continuation
- `generate_dev_summary`: Generate development summary instructions
- `get_dev_summary_template`: Get raw template for AI adaptation
- `append_dev_summary`: Append AI-adapted dev summary to Notion task

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
5. Templates: Feature/Bug/Refactoring templates in `./templates/task/`
6. Auto-execution: System handles todo progression automatically

## Security and Best Practices

- API keys configured via MCP environment variables
- Input validation on all MCP tools
- Error handling with clear messages
- No logging of sensitive information
- Configuration isolated per project