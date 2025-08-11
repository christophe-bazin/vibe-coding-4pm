# Advanced Usage Guide

Detailed MCP tool usage, multi-project setup, and advanced workflows for the VC4PM MCP server.

## Multi-Provider Support

The system supports multiple task management platforms:

- **Notion** (core): Default provider, fully supported
- **Linear** (premium): Available but disabled by default  
- **GitHub Projects** (enterprise): Available but disabled by default

Most MCP tools accept an optional `provider` parameter to specify which platform to use. If not specified, the default provider from configuration is used.

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

### IDE Integration

#### **Claude Code** (Recommended)
- **Setup**: `claude mcp add vc4pm "node" "@vc4pm/mcp-server/dist/server.js"`
- **Project awareness**: Automatically uses `.vc4pm/config.json` from current project directory
- **Management**: Use `claude mcp list`, `claude mcp remove vc4pm`, etc.

#### **Cursor**
Add to your Cursor MCP configuration:
```json
{
  "mcpServers": {
    "vc4pm": {
      "command": "node",
      "args": ["@vc4pm/mcp-server/dist/server.js"]
    }
  }
}
```
Ensure Cursor runs from project directory containing `.vc4pm/config.json`.

#### **Other MCP IDEs**
Configure similarly, ensuring the working directory contains the project configuration.

## MCP Tool Reference

AI assistants use these tools through natural language. Here are the underlying tool calls:

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
- `pageId` (string): Notion page ID
- `includeLinkedPages` (boolean, default: true): Include child/linked pages
- `provider` (optional): Provider to use

- Quotes (`> text`)

**Update Modes:**
- `replace`: Replace all page content
- `append`: Add content at end
- `prepend`: Add content at beginning

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