# Notion Vibe Coding

Provider-aware MCP server that transforms AI assistants (Claude, Cursor, Copilot) into intelligent project managers, optimizing for each AI's strengths with batch execution and rich context.

**Current Provider:** Notion (extensible architecture supports future Linear, GitHub, Jira integration)

## Quick Start

### 1. Install

```bash
git clone https://github.com/christophe-bazin/notion-vibe-coding.git
cd notion-vibe-coding
npm install && npm run build
```

### 2. Setup Your Task Provider

**For Notion:**
1. Create a [Notion integration](https://www.notion.so/my-integrations)
2. Copy your integration token
3. Create a database with these properties:
   - **Status** (Select): `Not Started`, `In Progress`, `Test`, `Done`
   - **Type** (Select): `Feature`, `Bug`, `Refactoring`
4. Share your database with the integration

### 3. Configure Your Project

```bash
cp mcp-config.example.json your-project/.claude/mcp-config.json  
```

Then edit `.claude/mcp-config.json` and replace:
- `your_notion_integration_token_here` with your Notion API key
- `your_notion_database_id_here` with your database ID

### 4. Start Using

#### Option A: Claude Desktop (MCP)
```
You: "Add user authentication to this React app"

Claude: 
→ Creates task with adapted template in Notion
→ Gets full task context with execute_task
→ Implements entire feature using rich context
→ Marks all todos complete in batch
→ Automatically moves to "Test" status

You: Review and mark as "Done" when satisfied
```

#### Option B: Claude Code CLI (Wrapper)
```bash
# Create tasks directly with JSON arguments
node mcp.js create_task '{"title":"Add user authentication","taskType":"Feature","description":"Implement OAuth login"}'
node mcp.js get_task '{"taskId":"<task-id>"}'
node mcp.js update_task '{"taskId":"<task-id>","status":"In Progress"}'
node mcp.js update_todos '{"taskId":"<task-id>","updates":[{"todoText":"Setup OAuth provider","completed":true}]}'
node mcp.js analyze_todos '{"taskId":"<task-id>"}'
node mcp.js generate_dev_summary '{"taskId":"<task-id>"}'
```

## What You Get

✅ **Automatic Task Tracking** - Claude creates and updates Notion tasks as you work  
✅ **CLI Integration** - Direct command-line access to all MCP functions  
✅ **Progress Visualization** - Real-time status updates in your Notion workspace  
✅ **Quality Gates** - Built-in testing phase prevents rushing to production  
✅ **Team Collaboration** - Shared visibility across your development team  
✅ **Multi-Project Support** - Use across different codebases with separate configs  

## Available Tools

The MCP server provides 10 tools available via Claude Desktop (MCP) and CLI wrapper:

- `create_task` - Create tasks with workflow adaptation (requires adaptedWorkflow)
- `get_task` - Get task information with todo statistics and status info
- `update_task` - Update task title, type and/or status with validation
- `execute_task` - Execute with provider-aware batch workflow
- `get_task_template` - Get raw templates for AI adaptation
- `analyze_todos` - Extract and analyze todos with completion statistics
- `update_todos` - Batch update with automatic execution continuation
- `generate_dev_summary` - Generate development summary with testing todos
- `get_dev_summary_template` - Get template for intelligent dev summary
- `append_dev_summary` - Append completed dev summary to Notion task

## How It Works

### 🔄 **Provider-Aware Batch Execution**
1. **AI calls** `execute_task` to get rich task context
2. **AI receives** full context with headings, todos, and task hierarchy
3. **AI implements** entire task using development tools
4. **AI calls** `update_todos` to mark all completed todos at once
5. **System automatically** updates status and generates dev summary

### 🎯 **Provider-Aware Features**
- **AI Provider Optimization**: Leverages strengths of Claude, Cursor, Copilot individually
- **Batch Processing**: Reduces API calls from 50+ to 2 per task execution
- **Rich Context**: Hierarchical todos with headings and related context
- **Template Adaptation**: AI adapts raw templates with specific project context
- **Intelligent Summaries**: Direct summary generation with relevant testing todos
- **Flexible Status Flow**: Automatic transitions through Not Started → In Progress → Test → Done

## Documentation

- **[Advanced Usage Guide](docs/advanced-usage.md)** - Detailed tool documentation and workflows
- **[Development Setup](docs/development.md)** - Contributing and customization
- **[Configuration Reference](docs/configuration.md)** - Complete configuration options

## Support

For issues and questions, please open an issue on the [GitHub repository](https://github.com/christophe-bazin/notion-vibe-coding).
