# Notion Vibe Coding

Transform Claude Code into an intelligent project manager that tracks your development tasks in Notion automatically.

## Quick Start

### 1. Install

```bash
git clone https://github.com/christophe-bazin/notion-vibe-coding.git
cd notion-vibe-coding
npm install && npm run build
```

### 2. Setup Notion

1. Create a [Notion integration](https://www.notion.so/my-integrations)
2. Copy your integration token
3. Create a database with these properties:
   - **Status** (Select): `Not Started`, `In Progress`, `Test`, `Done`
   - **Type** (Select): `Feature`, `Bug`, `Refactoring`
4. Share your database with the integration

### 3. Configure Your Project

Copy the example config to your project:

```bash
cp mcp-config.example.json your-project/.claude/mcp-config.json
```

Edit `.claude/mcp-config.json`:

```json
{
  "mcpServers": {
    "notion-vibe-coding": {
      "command": "node",
      "args": ["./notion-vibe-coding/dist/server.js"],
      "env": {
        "NOTION_API_KEY": "your_notion_integration_token_here",
        "NOTION_DATABASE_ID": "your_notion_database_id_here",
        "WORKFLOW_CONFIG": {
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
          "defaultStatus": "notStarted",
          "requiresValidation": ["done"],
          "workflowFiles": {
            "creation": "./notion-vibe-coding/workflows/task-creation.md",
            "update": "./notion-vibe-coding/workflows/task-update.md",
            "execution": "./notion-vibe-coding/workflows/task-execution.md"
          }
        }
      }
    }
  }
}
```

### 4. Start Using

```
You: "Add user authentication to this React app"

Claude: 
→ Creates task in Notion
→ Implements feature step by step
→ Updates progress automatically
→ Moves to "Test" when complete

You: Review and mark as "Done" when satisfied
```

## What You Get

✅ **Automatic Task Tracking** - Claude creates and updates Notion tasks as you work  
✅ **Progress Visualization** - Real-time status updates in your Notion workspace  
✅ **Quality Gates** - Built-in testing phase prevents rushing to production  
✅ **Team Collaboration** - Shared visibility across your development team  
✅ **Multi-Project Support** - Use across different codebases with separate configs  

## Available Tools

The MCP server provides 8 tools for task management:

### Task Management
- `create_task` - Create new tasks with structured templates
- `update_task` - Modify task content without changing status
- `start_task_workflow` - Initialize workflow for existing tasks
- `get_task_info` - Get current status and progress statistics
- `update_task_status` - Change task status with validation

### Todo Management  
- `progress_todo` - Mark individual todos complete with auto-progression
- `analyze_task_todos` - Extract all todos with completion statistics
- `batch_progress_todos` - Update multiple todos efficiently

### Workflow Guidance
- `get_workflow_guidance` - Get AI guidance for creation/update/execution workflows

## How It Works

1. **Task Creation**: Claude analyzes your request and creates structured Notion tasks
2. **Implementation**: As Claude works, it marks todos complete and updates progress
3. **Auto-Progression**: Status automatically changes based on completion percentage:
   - `Not Started` → `In Progress` (first todo completed)
   - `In Progress` → `Test` (all todos completed)
4. **Human Validation**: Only you can mark tasks as `Done` after testing

## Documentation

- **[Advanced Usage Guide](docs/advanced-usage.md)** - Detailed tool documentation and workflows
- **[Development Setup](docs/development.md)** - Contributing and customization
- **[Configuration Reference](docs/configuration.md)** - Complete configuration options

## Support

For issues and questions, please open an issue on the [GitHub repository](https://github.com/christophe-bazin/notion-vibe-coding).
