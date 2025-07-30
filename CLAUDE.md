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

- **Provider Pattern**: TaskProvider interface enables pluggable task management backends
- **Current Implementation**: Direct Notion API integration via @notionhq/client
- **Workflow Intelligence**: Template-driven task creation with type-specific structures  
- **MCP Protocol**: 8 tools for comprehensive task and todo management
- **Extensible Design**: Ready for Linear, GitHub, Jira providers in future versions

See detailed architecture in [docs/development.md](docs/development.md)

## Essential Commands

Build the server:

```bash
npm run build
```

### Usage Options

**Via Claude Desktop (MCP Protocol):**
- The server runs as an MCP server via Claude's configuration
- All 8 MCP tools available through natural language interface
- Uses `.claude/mcp-config.json` automatically

**Via Claude Code CLI (Development/Testing):**
- Use `node mcp.js <tool> '<json_args>'` to call MCP tools directly
- Example: `node mcp.js create_task '{"title":"test","taskType":"Bug","description":"desc"}'`
- The wrapper handles server startup and MCP protocol automatically


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

- TaskProvider abstraction enables pluggable backend implementations
- Current Notion implementation uses direct API integration for stability
- Workflow templates intelligently merge user content with structured formats
- Provider-specific formatting (Notion blocks, Linear markdown, etc.)
- Status transitions and workflows configured per provider
- Template system supports dynamic content replacement

## Security and Best Practices

- API keys configured via MCP environment variables
- Input validation on all MCP tools
- Error handling with clear messages
- No logging of sensitive information
- Configuration isolated per project