# Notion Workflow MCP Server - Claude Instructions

MCP server providing AI-guided development workflows for Notion tasks with configuration-driven approach.

## Project Overview

This is a Model Context Protocol (MCP) server that enables AI assistants to manage Notion development tasks through structured workflows. The system uses MCP configuration with camelCase conventions and workflow files to guide AI behavior.

## Development Guidelines

- Follow established coding standards in [.ai/development/coding-standards.md](.ai/development/coding-standards.md)
- Adhere to commit conventions in [.ai/development/commit-conventions.md](.ai/development/commit-conventions.md)
- Maintain clear documentation style per [.ai/development/documentation-style.md](.ai/development/documentation-style.md)
- Follow the release process defined in [.ai/development/release-process.md](.ai/development/release-process.md)

## Project Architecture

- **Configuration-driven**: All behavior defined in MCP configuration and `workflows/*.md`
- **Simple MCP server**: Provides 8 main tools for AI task management
- **Workflow separation**: Clear distinction between creation, updates, and execution
- **AI restrictions**: Built-in safeguards prevent AI from closing tasks directly
- **camelCase convention**: Consistent naming for internal configuration

See detailed architecture in [.ai/project/mcp-architecture.md](.ai/project/mcp-architecture.md)

## Essential Commands

Build the server:

```bash
npm run build
```

The server is designed to run as an MCP server via Claude's configuration.

## Codebase Structure

```
src/
├── server.ts                 # MCP server entry point
├── simple-progress-tracker.ts # Core workflow logic  
├── config-loader.ts          # Configuration management
├── utils.ts                  # Utility functions
└── types.ts                  # Type definitions
```

## Configuration System

All configuration is centralized in your project's `.claude/mcp-config.json`:
- **Board configuration**: statusMapping (camelCase), transitions, taskTypes
- **Workflow guidance**: AI guidance in separate .md files with template processing
- **Notion integration**: API key and database ID via environment variables
- **Workflow files**: Referenced by path, kept in MCP server directory
- **camelCase convention**: notStarted, inProgress, test, done

## MCP Tools Available

### Todo Management
- `progress_todo`: Mark specific todos as completed with auto-progression
- `analyze_task_todos`: Extract and analyze all todos with completion statistics
- `batch_progress_todos`: Update multiple todos efficiently in one operation

### Task Management
- `create_task`: Create new tasks in Notion database with workflow templates
- `update_task`: Update task content (title, description, type) without changing status
- `start_task_workflow`: Initialize workflow for existing Notion task
- `get_workflow_guidance`: Get markdown guidance for specific workflow
- `update_task_status`: Change task status with validation
- `get_task_info`: Get current status, transitions, and todo statistics

## Development Workflow

1. Always work on feature branches
2. Update relevant documentation when making changes
3. Test configuration changes against real Notion boards
4. Ensure AI restrictions remain in place
5. **Never mention AI assistance in commits**

## Integration Strategy

1. Clone MCP server in your project: `git clone https://github.com/christophe-bazin/notion-vibe-coding.git`
2. Build the server: `cd notion-vibe-coding && npm install && npm run build`
3. Copy `mcp-config.example.json` to your project's `.claude/mcp-config.json`
4. Replace API key and database ID with your Notion credentials
5. Customize statusMapping, transitions, taskTypes as needed
6. Workflows remain in `./notion-vibe-coding/workflows/` (V1 approach)

## Key Implementation Notes

- Status transitions enforced by MCP configuration, not code
- Workflow guidance in separate .md files with template processing
- AI behavior defined by workflow content, not hardcoded rules
- Simple, maintainable architecture focused on configuration over code
- Template system supports `{{status_notStarted}}` style placeholders (camelCase)
- Environment variables use SCREAMING_CASE, config uses camelCase

## Security and Best Practices

- API keys configured via MCP environment variables
- Input validation on all MCP tools
- Error handling with clear messages
- No logging of sensitive information
- Configuration isolated per project