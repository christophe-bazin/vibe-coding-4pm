# VC4PM MCP Server - Development Instructions

Native MCP server (@vc4pm/mcp-server) providing AI-guided development workflows for task management. v3.0 architecture with per-project configuration and template fallback system.

## Project Overview

This is a Model Context Protocol (MCP) server that enables AI assistants to manage development tasks through structured workflows. The system uses MCP configuration with camelCase conventions and workflow files to guide AI behavior.

## Development Guidelines

- Follow established coding standards in [.ai/coding-standards.md](.ai/coding-standards.md)
- Adhere to commit conventions in [.ai/commit-conventions.md](.ai/commit-conventions.md)
- Maintain clear documentation style per [.ai/documentation-style.md](.ai/documentation-style.md)
- Follow the release process defined in [.ai/release-process.md](.ai/release-process.md)

## Project Architecture

- **Configuration-driven**: All behavior defined in MCP configuration and `templates/*.md`
- **Service-oriented**: Clean separation between core services and shared utilities
- **Workflow adaptation**: AI adapts templates contextually using `adaptedWorkflow` parameter
- **Auto-continuation**: System automatically proceeds to next todos after completion
- **Provider-aware**: Optimized for different AI providers (Claude, Cursor, Copilot) by leveraging their individual strengths
- **Provider pattern**: Ready for Linear, GitHub, Jira integration via TaskProvider interface
- **camelCase convention**: Consistent naming for internal configuration

See detailed architecture in [docs/advanced-usage.md](docs/advanced-usage.md#technical-architecture)

## Essential Commands

Build and test the MCP server:

```bash
npm run build
npm link                # Test global installation locally  

# Test MCP server startup
cd test-project && node ../dist/server.js

# Add to Claude Code for development
claude mcp add vc4pm-dev "node" "/path/to/repo/dist/server.js"
```

### Development Testing

```bash
# Via Claude Code (recommended)
# Open project with .vc4pm/config.json
# Use natural language: "Create a task for testing"

# Direct server testing  
cd test-project
node /path/to/repo/dist/server.js
```

**MCP Integration:**
- All 12 MCP tools available through natural language interface
- Per-project config: `.vc4pm/config.json` loaded from working directory
- Template fallback system: local overrides → package templates
- Content management: read and update Notion pages with markdown
- Optimized for Claude Code and Cursor IDE integration

## Codebase Structure

Service-oriented architecture with clean separation:
- **Core services**: CreationService, UpdateService, ExecutionService  
- **Shared utilities**: StatusService, ValidationService, ResponseFormatter
- **Provider pattern**: NotionAPIAdapter with TaskProvider interface
- **Template system**: Intelligent adaptation in `templates/` directory

**→ Complete architecture details in [docs/advanced-usage.md](docs/advanced-usage.md#technical-architecture)**

## Configuration System

**Single config file:** `.vc4pm/config.json` with:
- Direct JSON configuration (no environment variables)
- statusMapping (camelCase), transitions, taskTypes  
- Provider system: Configurable providers (notion, linear, github) with enable/disable
- Clean validation and helpful error messages

**→ Complete configuration reference in [docs/configuration.md](docs/configuration.md)**

## MCP Tools Available

**11 tools for task management:**
- Task management: `create_task`, `get_task`, `update_task`, `execute_task` (all support optional `provider` parameter)
- Templates: `get_task_template` (Feature/Bug/Refactoring templates)
- Todos: `analyze_todos`, `update_todos` 
- Summaries: `generate_summary`, `get_summary_template`, `append_summary`
- Content: `read_notion_page` (read any Notion page with linked pages)

**→ Complete tool reference in [docs/advanced-usage.md](docs/advanced-usage.md)**

## Key Implementation Notes

- **Template adaptation**: AI calls `get_task_template` then adapts contextually
- **create_task**: Requires `adaptedWorkflow` parameter with contextualized template  
- **Auto-continuation**: UpdateService triggers ExecutionService after todo updates
- **Environment**: SCREAMING_CASE variables, camelCase config
- **Status transitions**: Flexible by default, configurable constraints
- **Never mention AI assistance in commits** (handled automatically by MCP tools)
- **IMPORTANT**: When adding or modifying a tool in `src/server.ts`, you must also update the `tools` array in the `createManifestFile` function within `bin/setup.js` to keep the API manifest synchronized.

**→ Complete development workflow in [docs/development.md](docs/development.md#testing-strategy)**

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
- **Content**: Development guidelines, coding standards, commit conventions, release process
- **Files**: CLAUDE.md, .ai/coding-standards.md, .ai/commit-conventions.md, .ai/documentation-style.md, .ai/release-process.md

**When updating documentation:**
- User-facing changes → Update README.md and docs/ 
- Development/architecture changes → Update CLAUDE.md and .ai/
- Never mix user documentation with development guidelines

**Technical information now organized clearly:**
- **User and technical docs** → docs/ directory (accessible to all users and contributors)
- **Development guidelines** → .ai/ directory (for AI assistants and contributors)
- **Architecture details** → docs/advanced-usage.md#technical-architecture
- **Development workflow** → docs/development.md#testing-strategy
- Keep separation between user docs and development guidelines

## Documentation Update Strategy

**For each type of change, update the appropriate documentation layer:**

### User-Facing Changes
- New MCP tools → README.md (tool list) + docs/advanced-usage.md (complete reference)
- Configuration options → docs/configuration.md (per-project reference)
- Installation steps → README.md (quick start) + docs/development.md (contributor setup)
- Architecture details → docs/advanced-usage.md#technical-architecture

### Technical/Architecture Changes  
- MCP v3.0 service architecture → docs/advanced-usage.md#technical-architecture
- Development patterns → .ai/coding-standards.md
- Template system and fallback → docs/advanced-usage.md#configuration-system
- Development and testing workflows → docs/development.md

### Clear Separation
- **Technical details accessible to all** → docs/ directory (architecture, workflows, configuration)
- **Development guidelines for contributors** → .ai/ directory (coding standards, conventions)
- **README.md** → Quick start and overview
- **docs/** → Complete technical and usage documentation

## Security and Best Practices

- API keys stored in project-local `.vc4pm/config.json` files
- Input validation on all MCP tools
- Error handling with clear, actionable messages
- No logging of sensitive information
- Complete project isolation - no shared state
- Template fallback system for reliable operation