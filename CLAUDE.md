# Workflow MCP Server - Claude Instructions

MCP server providing AI-guided development workflows for task management with configuration-driven approach. Available via MCP protocol.

## Project Overview

This is a Model Context Protocol (MCP) server that enables AI assistants to manage development tasks through structured workflows. The system uses MCP configuration with camelCase conventions and workflow files to guide AI behavior.

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

**Via MCP Protocol:**
- The server runs as an MCP server 
- All 10 MCP tools available through natural language interface
- Uses `.claude/mcp-config.json` configuration

**Via Claude Code CLI (Development/Testing):**
- Use `node mcp.js <tool> '<json_args>'` to call MCP tools directly
- Example: `node mcp.js create_task '{"title":"test","taskType":"Bug","description":"desc","adaptedWorkflow":"..."}'`
- The wrapper handles server startup and MCP protocol automatically

## Codebase Structure

Service-oriented architecture with clean separation:
- **Core services**: CreationService, UpdateService, ExecutionService  
- **Shared utilities**: StatusService, ValidationService, ResponseFormatter
- **Provider pattern**: NotionAPIAdapter with TaskProvider interface
- **Template system**: Intelligent adaptation in `templates/` directory

**→ Complete architecture details in [.ai/project/mcp-architecture.md](.ai/project/mcp-architecture.md)**

## Configuration System

Configuration via `.claude/mcp-config.json` with:
- statusMapping (camelCase), transitions, taskTypes
- Environment variables: NOTION_API_KEY, NOTION_DATABASE_ID, WORKFLOW_CONFIG

**→ Complete configuration reference in [docs/configuration.md](docs/configuration.md)**

## MCP Tools Available

**10 tools for task management:**
- Task management: `create_task`, `get_task`, `update_task`, `execute_task`
- Templates: `get_task_template` (Feature/Bug/Refactoring templates)
- Todos: `analyze_todos`, `update_todos` 
- Summaries: `generate_summary`, `get_summary_template`, `append_summary`

**→ Complete tool reference in [docs/advanced-usage.md](docs/advanced-usage.md)**

## Key Implementation Notes

- **Template adaptation**: AI calls `get_task_template` then adapts contextually
- **create_task**: Requires `adaptedWorkflow` parameter with contextualized template  
- **Auto-continuation**: UpdateService triggers ExecutionService after todo updates
- **Environment**: SCREAMING_CASE variables, camelCase config
- **Status transitions**: Flexible by default, configurable constraints
- **Never mention AI assistance in commits**

**→ Complete development workflow in [.ai/project/development-workflow.md](.ai/project/development-workflow.md)**

## Documentation Structure

**IMPORTANT: Two distinct documentation systems with different roles:**

### User Documentation (README.md + docs/)
- **Purpose**: For external users who want to use/install the MCP server  
- **Audience**: Developers installing and configuring the system
- **Content**: Installation, configuration, usage examples, API reference
- **Files**: README.md, docs/configuration.md, docs/development.md, docs/advanced-usage.md

### Development Guidelines (CLAUDE.md + .ai/)
- **Purpose**: For AI assistant development and project contributions
- **Audience**: Claude and contributors working on the codebase
- **Content**: Architecture, coding standards, development workflow, commit conventions
- **Files**: CLAUDE.md, .ai/development/, .ai/project/

**When updating documentation:**
- User-facing changes → Update README.md and docs/ 
- Development/architecture changes → Update CLAUDE.md and .ai/
- Never mix user documentation with development guidelines

**Detailed technical information belongs in .ai/project/:**
- Complete architecture details → .ai/project/mcp-architecture.md
- Development workflow specifics → .ai/project/development-workflow.md  
- Notion integration technical details → .ai/project/notion-integration.md
- Keep user docs/ simple and focused on usage, not implementation

## Documentation Update Strategy

**For each type of change, update the appropriate documentation layer:**

### User-Facing Changes
- New MCP tools → README.md (tool list) + docs/advanced-usage.md (examples)
- Configuration options → docs/configuration.md (user reference)
- Installation steps → README.md (quick start) + docs/development.md (contribution guide)

### Technical/Architecture Changes  
- Service architecture → .ai/project/mcp-architecture.md (complete technical details)
- Development patterns → .ai/development/coding-standards.md
- Integration details → .ai/project/notion-integration.md
- Internal workflows → .ai/project/development-workflow.md

### Avoid Duplication
- Technical implementation details belong ONLY in .ai/project/
- User documentation should reference .ai/ for technical details if needed
- Keep README.md and docs/ focused on practical usage, not internal architecture

## Security and Best Practices

- API keys configured via MCP environment variables
- Input validation on all MCP tools
- Error handling with clear messages
- No logging of sensitive information
- Configuration isolated per project