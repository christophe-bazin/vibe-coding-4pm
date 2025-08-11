# MCP Architecture v3.0

## Overview

VC4PM MCP Server is a native MCP server providing AI-guided development workflows. Designed specifically for AI coding assistants (Claude Code, Cursor) with per-project configuration and file system access.

## Core Architecture

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

## MCP Native Architecture

### Integration Flow

**Claude Code**:
```bash
# Setup
claude mcp add vc4pm "node" "@vc4pm/mcp-server/dist/server.js"

# Usage - AI uses tools through natural language
# Server automatically reads .vc4pm/config.json from project directory
```

**Server Lifecycle**:
```
1. Claude Code starts MCP server (dist/server.js)
2. Server reads .vc4pm/config.json from CWD
3. Initializes provider (Notion/Linear) with project credentials
4. Exposes 11 MCP tools to AI assistant
5. AI uses tools through natural language
6. Server maintains project context throughout session
```

### Benefits of MCP Native Design
- **Direct Integration**: Native MCP protocol, no wrapper overhead
- **Project Awareness**: Each project has isolated config and credentials
- **IDE Optimized**: Built for file system access and terminal capabilities
- **Zero Configuration**: Auto-detection in compatible IDEs

## MCP Tools (11 Total)

### Task Management
- **`create_task`**: Create tasks with workflow adaptation (requires adaptedWorkflow)
- **`get_task`**: Get task information with todo statistics and status info
- **`update_task`**: Update task title, type and/or status with validation
- **`execute_task`**: Execute task with automated workflow progression

### Template System
- **`get_task_template`**: Get raw templates for AI adaptation (Feature/Bug/Refactoring)

### Todo Management
- **`analyze_todos`**: Extract and analyze todos with completion statistics and hierarchy
- **`update_todos`**: Batch update with automatic execution continuation

### Development Summary
- **`generate_summary`**: Generate summary instructions
- **`get_summary_template`**: Get raw template for AI adaptation
- **`append_summary`**: Append AI-adapted summary to task

### Content Management
- **`read_notion_page`**: Read Notion page and its linked/child pages

## Component Architecture

### MCP Server (`src/server.ts`)
**Responsibility**: Native MCP protocol implementation

- Reads `.vc4pm/config.json` from process.cwd()
- Implements MCP protocol specification  
- Exposes 11 tools to AI clients
- Handles tool parameter validation and routing
- Project-aware configuration loading

**Configuration Loading**:
```typescript
private loadProjectConfig(): ProjectConfig {
  const configPath = resolve(process.cwd(), '.vc4pm', 'config.json');
  if (!existsSync(configPath)) {
    throw new Error(`Project configuration not found: ${configPath}`);
  }
  return JSON.parse(readFileSync(configPath, 'utf-8'));
}
```

### Clean Service Architecture

#### Core Services (`src/services/core/`)

**CreationService** (`src/services/core/CreationService.ts`)
**Responsibility**: Task creation with template fallback system

- Template loading with package fallback (fixed in v3.0)
- AI-driven template adaptation via `adaptedWorkflow` parameter
- Multi-provider support with optional provider parameter
- Template resolution: Local → Package templates

**UpdateService** (`src/services/core/UpdateService.ts`)
**Responsibility**: Task updates, todos, and content management

- Task metadata updates with workflow validation
- Batch todo updates with auto-execution triggering
- Summary generation and management
- **NEW**: Notion page reading with linked pages support
- **NEW**: Notion page updating with markdown content

**ExecutionService** (`src/services/core/ExecutionService.ts`)
**Responsibility**: Task execution orchestration

- Provider-aware batch execution workflow
- Rich context formatting with task hierarchy
- Automatic status transitions based on workflow configuration
- Integration with todo completion tracking

#### Shared Services (`src/services/shared/`)

**StatusService** (`src/services/shared/StatusService.ts`)
**Responsibility**: Workflow state management

- Configurable status transitions from project config
- Status validation and recommendations
- Dynamic status mapping (internal → provider names)

**ValidationService** (`src/services/shared/ValidationService.ts`)
**Responsibility**: Input validation and constraints

- Project configuration validation
- Task type and status constraint checking
- Parameter validation for all MCP tools

**ResponseFormatter** (`src/services/shared/ResponseFormatter.ts`)
**Responsibility**: Standardized MCP responses

- Consistent response formatting for all tools
- Progress visualization and statistics
- Error handling with helpful messages

### Provider Architecture (`src/providers/`)

**Multi-Provider System**: Extensible architecture supporting multiple platforms

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
**Responsibility**: Complete Notion integration

- Full TaskProvider interface implementation
- Notion API integration (@notionhq/client v2.2.15)
- Rich text parsing and markdown conversion
- **NEW**: Page reading with linked pages and child pages
- **NEW**: Page updating with multiple modes (replace/append/prepend)
- **NEW**: Child page bulk updates

**Content Management Features**:
- Read page content with markdown conversion
- Extract linked pages (mentions) and child pages
- Update page content with rich markdown support
- Support for todos, headings, lists, code blocks, quotes
- Bulk update child pages with same content

### Project Configuration System

**Per-Project Configuration** (`.vc4pm/config.json`):
```json
{
  "workflow": {
    "statusMapping": {
      "notStarted": "Not Started",
      "inProgress": "In Progress",
      "test": "Test", 
      "done": "Done"
    },
    "transitions": {
      "notStarted": ["inProgress"],
      "inProgress": ["test"],
      "test": ["done", "inProgress"], 
      "done": ["test"]
    },
    "taskTypes": ["Feature", "Bug", "Refactoring"],
    "defaultStatus": "notStarted"
  },
  "providers": {
    "default": "notion",
    "available": {
      "notion": {
        "enabled": true,
        "config": {
          "apiKey": "ntn_...",
          "databaseId": "..."
        }
      }
    }
  }
}
```

**Key Design Principles**:
- **Project Isolation**: Each project has its own config and credentials
- **Security**: API keys stored locally per project
- **Flexibility**: Different workflows per project type
- **Simplicity**: Single configuration file per project

## Template System

### Template Resolution (Fixed in v3.0)

**Template Loading Priority**:
1. **Project Templates**: `.vc4pm/templates/task/feature.md` (if override enabled)
2. **Package Templates**: `@vc4pm/mcp-server/templates/task/feature.md` (fallback)

**Fixed Bug**: Template fallback now correctly resolves from package directory instead of CWD:

```typescript
// Before (broken)
const filePath = resolve(templateFile); // Resolved from CWD

// After (fixed) 
const packageRoot = resolve(__dirname, '../../..'); 
const filePath = resolve(packageRoot, templateFile); // Resolved from package
```

### Template Types
- **`templates/task/feature.md`**: Feature development template
- **`templates/task/bug.md`**: Bug fixing template  
- **`templates/task/refactoring.md`**: Refactoring template
- **`templates/summary/summary.md`**: Development summary template

## Data Flow Patterns

### 1. AI-Driven Task Creation
```
AI Request → create_task → Template Loading → Provider Creation → Task URL
```

1. AI describes feature: "Add user authentication"
2. MCP tool `create_task` called with adaptedWorkflow
3. CreationService loads appropriate template (feature.md)
4. Provider creates task with structured content
5. Returns task URL for further operations

### 2. Content Management Workflow
```
AI Request → read_notion_page → Content Analysis → Task Updates
```

1. AI reads existing page content and linked pages
2. Analyzes current state and requirements
3. Updates page content with new information
4. Optionally updates child pages with same content

### 3. Task Execution Flow
```
execute_task → Context Loading → AI Implementation → update_todos → Status Update
```

1. `execute_task` provides complete task context
2. AI implements entire feature using IDE tools
3. Batch `update_todos` marks all completed items
4. System auto-transitions task status
5. Summary generation for documentation

## MCP Tool Parameters

**Critical Format Requirements**:


**`read_notion_page`**:
```json
{
  "pageId": "notion-page-uuid", 
  "includeLinkedPages": true,
  "provider": "notion"
}
```

**`append_summary`**:
```json
{
  "taskId": "task-uuid",
  "adaptedSummary": "summary content here"
}
```
⚠️ **Use `adaptedSummary`, NOT `summary`**

**`update_todos`**:
```json
{
  "taskId": "task-uuid",
  "updates": [{"todoText": "exact text", "completed": true}]
}
```
⚠️ **Use `todoText`, NOT `content`**

## IDE Integration Requirements

### Required Capabilities
For optimal functionality, the AI assistant must support:

- **File System Access**: Read/write project files and configurations
- **Terminal Access**: Execute build commands, run tests, git operations
- **Working Directory**: Maintain context of project directory with `.vc4pm/config.json`
- **MCP Protocol**: Native MCP client support

### Compatible IDEs
- **✅ Claude Code**: Native MCP support with auto-detection
- **✅ Cursor**: MCP extension support with configuration
- **❌ Claude Desktop**: No file system access, limited functionality
- **❌ Web Interfaces**: Cannot access local file system

## Performance & Security

### Performance Characteristics
- **Config Caching**: Project configuration cached on server startup
- **Template Caching**: Templates cached to avoid repeated disk reads
- **Connection Reuse**: Persistent connections to Notion API
- **Batch Operations**: Todo updates processed in batches

### Security Model
- **Project Isolation**: API keys isolated per project directory
- **Input Validation**: All parameters validated before processing
- **No Logging**: API keys never logged or stored outside config
- **Rate Limiting**: Notion API rate limits respected

## Future Extensions

### Additional Providers
- **Linear**: Issue tracking integration
- **GitHub Projects**: Native GitHub project management
- **Jira**: Enterprise project management

### Enhanced Features
- **Template Override System**: Per-project template customization
- **Workflow Automation**: Advanced status transition rules
- **Team Collaboration**: Shared configurations and templates
- **Analytics**: Task completion metrics and reporting

This architecture provides a robust foundation for AI-guided development workflows while maintaining simplicity and project isolation.