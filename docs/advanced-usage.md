# Advanced Usage Guide

Detailed MCP tool usage, architecture overview, multi-project setup, and advanced workflows for the VC4PM MCP server v3.0.

## Multi-Provider Support

The system supports multiple task management platforms:

- **Notion** (core): Default provider, fully supported
- **Linear** (premium): Available but disabled by default  
- **GitHub Projects** (enterprise): Available but disabled by default

Most MCP tools accept an optional `provider` parameter to specify which platform to use. If not specified, the default provider from configuration is used.

## Architecture Overview

### Core Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   AI IDE        │    │ @vc4pm/mcp-server│    │   Task Provider │
│ (Claude Code)   │◄──►│  (MCP Protocol)  │◄──►│ (Notion/Linear) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌────────────────────────┐
                    │    Project Config      │
                    │  .vc4pm/config.json    │
                    │  • workflow settings   │
                    │  • provider configs    │  
                    │  • credentials         │
                    └────────────────────────┘
```

### MCP Native Design Benefits
- **Direct Integration**: Native MCP protocol, no wrapper overhead
- **Project Awareness**: Each project has isolated config and credentials
- **IDE Optimized**: Built for file system access and terminal capabilities
- **Template Fallback**: Package templates used when local templates missing

### Server Lifecycle
```
1. Claude Code starts MCP server (dist/server.js)
2. Server reads .vc4pm/config.json from CWD
3. Initializes provider (Notion/Linear) with project credentials
4. Exposes 11 MCP tools to AI assistant
5. AI uses tools through natural language
6. Server maintains project context throughout session
```

## MCP Integration

The server integrates natively with MCP clients through the standardized protocol.

### Project Configuration

Each project needs a `.vc4pm/config.json` file in its root directory:

```json
{
  "workflow": {
    "statusMapping": {
      "notStarted": "Not Started",
      "inProgress": "In Progress", 
      "test": "Test",
      "done": "Done"
    },
    "taskTypes": ["Feature", "Bug", "Refactoring"],
    "transitions": {
      "notStarted": ["inProgress"],
      "inProgress": ["test"],
      "test": ["done", "inProgress"],
      "done": ["test"]
    },
    "defaultStatus": "notStarted"
  },
  "providers": {
    "default": "notion",
    "available": {
      "notion": {
        "enabled": true,
        "config": {
          "apiKey": "your_notion_api_key",
          "databaseId": "your_database_id"
        }
      }
    }
  }
}
```

### Development Environment Integration

The VC4PM MCP server integrates with various AI-powered editors that support the Model Context Protocol (MCP). The setup process (`vc4pm-setup`) provides interactive configuration for supported editors.

#### **Claude Code**
Claude Code has excellent MCP support with automatic project detection.

**Setup:**
```bash
# After running vc4pm-setup in your project
claude mcp add vc4pm "vc4pm-server"
```

**Features:**
- **Project awareness**: Automatically uses `.vc4pm/config.json` from current project directory
- **Management**: Use `claude mcp list`, `claude mcp remove vc4pm`, etc.
- **Working directory**: Automatically set to project root

#### **Cursor**
Cursor supports MCP through extensions and configuration.

**Setup:**
1. Install the MCP extension for Cursor
2. Add to your Cursor MCP configuration:
```json
{
  "mcpServers": {
    "vc4pm": {
      "command": "vc4pm-server"
    }
  }
}
```

**Important:** Ensure Cursor runs from your project directory containing `.vc4pm/config.json`.

#### **Visual Studio Code (with MCP extensions)**
Some VS Code extensions support MCP protocol.

**Configuration example:**
```json
{
  "mcp.servers": {
    "vc4pm": {
      "command": "vc4pm-server",
      "cwd": "${workspaceFolder}"
    }
  }
}
```

#### **Zed (with MCP support)**
Zed editor has experimental MCP support.

**Configuration example:**
```json
{
  "assistant": {
    "mcp_servers": {
      "vc4pm": {
        "command": "vc4pm-server"
      }
    }
  }
}
```

#### **Continue.dev**
The Continue VS Code extension supports MCP.

**Configuration in `continue_config.json`:**
```json
{
  "mcpServers": {
    "vc4pm": {
      "command": "vc4pm-server"
    }
  }
}
```

#### **Other MCP-Compatible Editors**
For any editor with MCP support:

**Basic configuration requirements:**
- **Command**: `vc4pm-server` (assumes global installation via npm)
- **Working directory**: Must be project root containing `.vc4pm/config.json`
- **Node.js**: Requires Node.js 18+ to run the server

**Alternative command formats:**
```bash
# If vc4pm-server is not in PATH
node /path/to/node_modules/@vc4pm/mcp-server/dist/server.js

# For local project installation
npx @vc4pm/mcp-server
```

#### **Manual MCP Server Testing**
Test the MCP server independently:

```bash
# Navigate to your project
cd your-project

# Ensure config exists
ls .vc4pm/config.json

# Test server startup
vc4pm-server
# Should start without errors and show MCP server ready message
```

## Technical Architecture

### Service Architecture

The server uses a clean service-oriented architecture:

#### Core Services (`src/services/core/`)

**CreationService** (`src/services/core/CreationService.ts`)
- Task creation with template fallback system (fixed in v3.0)
- AI-driven template adaptation via `adaptedWorkflow` parameter
- Template resolution: Local overrides → Package templates
- Multi-provider support with optional provider parameter

**UpdateService** (`src/services/core/UpdateService.ts`)
- Task metadata updates with workflow validation
- Batch todo updates with auto-execution triggering
- Summary generation and management
- Notion page reading with linked pages support

**ExecutionService** (`src/services/core/ExecutionService.ts`)
- Provider-aware batch execution workflow
- Rich context formatting with task hierarchy
- Automatic status transitions based on workflow configuration
- Integration with todo completion tracking

#### Shared Services (`src/services/shared/`)

**StatusService** - Workflow state management with configurable transitions
**ValidationService** - Input validation and constraint checking
**ResponseFormatter** - Standardized MCP response formatting

### Provider Architecture

```
src/providers/
├── ProviderManager.ts          # Provider orchestration
├── ProviderFactory.ts          # Provider instantiation 
├── notion/
│   └── NotionProvider.ts      # Full Notion implementation
├── linear/
│   └── LinearProvider.ts      # Linear stub (future)
└── github/
    └── GitHubProvider.ts      # GitHub Projects stub (future)
```

**NotionProvider** (`src/providers/notion/NotionProvider.ts`)
- Complete TaskProvider interface implementation
- Notion API integration (@notionhq/client v2.2.15)
- Rich text parsing and markdown conversion
- Page reading with linked pages and child pages
- Content management with todos, headings, lists, code blocks

### Configuration System

The MCP server loads configuration from the current working directory:

```typescript
private loadProjectConfig(): ProjectConfig {
  const configPath = resolve(process.cwd(), '.vc4pm', 'config.json');
  if (!existsSync(configPath)) {
    throw new Error(`Project configuration not found: ${configPath}`);
  }
  return JSON.parse(readFileSync(configPath, 'utf-8'));
}
```

**Key Design Principles:**
- **Project Isolation**: Each project has its own config and credentials
- **Security**: API keys stored locally per project
- **Template Fallback**: Package templates used when local templates missing
- **Provider Pattern**: Extensible for Linear, GitHub, Jira integration

## MCP Tool Reference (11 Total)

AI assistants use these tools through natural language. Here are the underlying tool calls:

### Complete Tool List

**Task Management:**
- `create_task` - Create tasks with workflow adaptation (requires adaptedWorkflow)
- `get_task` - Get task information with todo statistics and status info
- `update_task` - Update task title, type and/or status with validation
- `execute_task` - Execute task with automated workflow progression

**Template System:**
- `get_task_template` - Get raw templates for AI adaptation (Feature/Bug/Refactoring)

**Todo Management:**
- `analyze_todos` - Extract and analyze todos with completion statistics
- `update_todos` - Batch update with automatic execution continuation

**Development Summary:**
- `generate_summary` - Generate summary instructions for AI
- `get_summary_template` - Get raw template for AI adaptation
- `append_summary` - Append AI-adapted summary to task

**Content Management:**
- `read_notion_page` - Read Notion page and its linked/child pages
- `create_notion_page` - Create a new page in a Notion database
- `update_notion_page` - Update an existing Notion page

### Task Management Tools

#### create_task
Create tasks with intelligent template adaptation.

**Parameters:**
- `title` (string): Task title
- `taskType` (string): "Feature", "Bug", or "Refactoring"
- `description` (string): Task description
- `adaptedWorkflow` (string): AI-adapted template content
- `provider` (optional): Provider to use

#### get_task  
Get task information with todo statistics.

**Parameters:**
- `taskId` (string): Task/page ID
- `provider` (optional): Provider to use

#### update_task
Update task properties with validation.

**Parameters:**
- `taskId` (string): Task ID
- `title` (optional): New title
- `taskType` (optional): New type
- `status` (optional): New status
- `provider` (optional): Provider to use

#### execute_task
Execute task with automated workflow progression.

**Parameters:**
- `taskId` (string): Task ID to execute

### Content Management Tools

#### read_notion_page
Read Notion page content with linked pages.

**Parameters:**
- `pageId` (string): Notion page ID or full URL
- `includeLinkedPages` (boolean, default: true): Include child/linked pages
- `provider` (optional): Provider to use

**Returns:**
- Page title, content, URL, and linked pages

#### create_notion_page
Create a new page in a Notion database.

**Parameters:**
- `databaseId` (string, required): Database ID or full Notion URL (e.g., `https://www.notion.so/2910da7a7a078095a53bc90f3026b212?v=...`)
- `title` (string, required): Page title
- `content` (string, optional): Markdown content to add to the page
- `properties` (object, optional): Additional properties to set (status, type, etc.)
- `provider` (optional): Provider to use

**Returns:**
- Created page content with ID, title, URL, and content

**Example:**
```
AI: "Create a page in database https://www.notion.so/2910da7a7a078095a53bc90f3026b212 with title 'Project Notes'"
```

#### update_notion_page
Update an existing Notion page's title, content, or properties.

**Parameters:**
- `pageId` (string, required): Page ID or full Notion URL
- `title` (string, optional): New page title
- `content` (string, optional): Markdown content to add or replace
- `properties` (object, optional): Properties to update
- `mode` (string, optional): `append` (default), `replace`, or `insert` with `insertAfter`
- `insertAfter` (string, optional): Text to search for; inserts content after matching block (requires `mode: 'insert'`)
- `provider` (optional): Provider to use

**Returns:**
- Success message

**Example:**
```
AI: "Update page <pageId> and append this content: ## New Section\n- Item 1\n- Item 2"
AI: "Update page <pageId> with new title 'Updated Title' and replace all content"
AI: "Update page <pageId> insert '- Fourth item' after 'Troisième élément' using mode insert"
```

**Supported Markdown:**
- Headings (`# H1`, `## H2`, `### H3`)
- Paragraphs
- Bullet lists (`- item`)
- Numbered lists (`1. item`)
- Todos (`- [ ]` and `- [x]`)
- Code blocks (` ```language ` )
- Quotes (`> text`)

**Update Modes:**
- `append` (default): Add content at end of page
- `replace`: Replace all page content
- `insert`: Insert content after a specific block (requires `insertAfter` parameter)

### Todo Management Tools

#### analyze_todos
Extract and analyze todos with statistics.

**Parameters:**
- `taskId` (string): Task ID
- `includeHierarchy` (boolean, optional): Include nested structure

#### update_todos  
Batch update todos with automatic execution continuation.

**Parameters:**
- `taskId` (string): Task ID
- `updates` (array): Array of `{todoText, completed}` objects

### Template and Summary Tools

#### get_task_template
Get raw templates for AI adaptation.

**Parameters:**
- `taskType` (string): "Feature", "Bug", or "Refactoring"

#### generate_summary, get_summary_template, append_summary
Development summary workflow tools for task completion documentation.

## Usage Examples

### AI-Driven Development Workflow

```
You: "Add user authentication to this React app"

AI Assistant:
1. Uses create_task with adapted Feature template
2. Uses execute_task to get full context and todos
3. Implements authentication step by step
4. Uses update_todos to mark progress
5. Automatically transitions to "Test" when complete
6. Uses append_summary for final documentation

You: Review implementation and mark as "Done"
```

### Multi-Project Setup

```
project-a/
├── .vc4pm/config.json  # Notion Database A + API Key A
└── src/

project-b/  
├── .vc4pm/config.json  # Notion Database B + API Key B  
└── src/

project-c/
├── .vc4pm/config.json  # Linear + GitHub Projects
└── src/
```

Each project maintains separate task management configuration and credentials.

### Content Management

```
AI Assistant uses:
- read_notion_page to understand existing documentation
- read_notion_page to analyze project documentation and linked pages
- Supports rich markdown formatting and todo lists
- Can update multiple related pages simultaneously
```

## Benefits for Development Teams

✅ **IDE Native** - Direct integration with Claude Code, Cursor, and other AI coding assistants  
✅ **Per-Project Config** - Isolated credentials and workflows per project  
✅ **Team Flexibility** - Different teams can use different providers  
✅ **Security** - API keys stay local to each project  
✅ **File System Access** - Full integration with project files and build tools  
✅ **Automatic Documentation** - Implementation details saved automatically  
✅ **Progress Tracking** - Real-time status updates for team visibility  
✅ **Quality Gates** - Mandatory testing phase prevents rushed releases  

## Troubleshooting

### Configuration Issues
- Verify `.vc4pm/config.json` exists in project root
- Check JSON syntax is valid  
- Ensure provider credentials are correct
- Confirm database/project has required properties

### MCP Integration Issues
- Restart MCP client after configuration changes
- Check MCP server logs for configuration errors
- Verify node.js can access the server script
- Ensure working directory contains `.vc4pm/config.json`

### Provider Access Issues  
- Verify API keys have correct permissions
- Check database/project is shared with integration
- Ensure required status and type properties exist
- Test connection with basic read operations first