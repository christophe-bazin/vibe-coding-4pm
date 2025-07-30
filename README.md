# Notion Vibe Coding

Intelligent MCP server that transforms Claude into a project manager, creating structured development tasks with workflow intelligence and template-driven content generation.

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
→ Creates task in Notion
→ Implements feature step by step
→ Updates progress automatically
→ Moves to "Test" when complete

You: Review and mark as "Done" when satisfied
```

#### Option B: Claude Code CLI (Wrapper)
```bash
# Create tasks directly with JSON arguments
node mcp.js create_task '{"title":"Add user authentication","taskType":"Feature","description":"Implement OAuth login"}'
node mcp.js get_task '{"taskId":"<task-id>"}'
node mcp.js update_task_status '{"taskId":"<task-id>","newStatus":"In progress"}'
node mcp.js update_todos '{"taskId":"<task-id>","updates":[{"todoText":"Setup OAuth provider","completed":true}]}'
node mcp.js analyze_todos '{"taskId":"<task-id>"}'
```

## What You Get

✅ **Automatic Task Tracking** - Claude creates and updates Notion tasks as you work  
✅ **CLI Integration** - Direct command-line access to all MCP functions  
✅ **Progress Visualization** - Real-time status updates in your Notion workspace  
✅ **Quality Gates** - Built-in testing phase prevents rushing to production  
✅ **Team Collaboration** - Shared visibility across your development team  
✅ **Multi-Project Support** - Use across different codebases with separate configs  

## Available Tools

The MCP server provides 9 tools available both via Claude Desktop (MCP) and CLI wrapper:

### Task Management
- `create_task` - Create tasks with AI-adapted content
- `get_task` - Retrieve task information and metadata
- `update_task` - Modify task content (title, type, description)
- `update_task_status` - Change status with workflow validation
- `execute_task` - Smart execution with step/auto/batch modes

### Template & Workflow
- `get_task_template` - Get task template for AI adaptation
- `get_workflow_guidance` - Get structured guidance for task workflows

### Todo Management  
- `analyze_todos` - Extract and analyze all todos with statistics
- `update_todos` - Batch update multiple todos efficiently

## How It Works

1. **Intelligent Templates**: AI adapts task templates based on user context and requirements
2. **Provider Integration**: Direct API integration with dynamic property resolution
3. **Workflow Intelligence**: Status transitions and todo analysis drive smart execution
4. **Extensible Architecture**: TaskProvider pattern ready for additional providers (Linear, GitHub, Jira)

## Documentation

- **[Advanced Usage Guide](docs/advanced-usage.md)** - Detailed tool documentation and workflows
- **[Development Setup](docs/development.md)** - Contributing and customization
- **[Configuration Reference](docs/configuration.md)** - Complete configuration options

## Support

For issues and questions, please open an issue on the [GitHub repository](https://github.com/christophe-bazin/notion-vibe-coding).
