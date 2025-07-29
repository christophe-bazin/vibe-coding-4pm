# Notion Vibe Coding

Transform Claude Code into an intelligent project manager that tracks your development tasks in Notion automatically. Use it directly from Claude Desktop (MCP) or from Claude Code CLI (wrapper).

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

**For Claude Desktop:**
```bash
cp mcp-config-claude-desktop.example.json your-project/.claude/mcp-config.json
```

**For Claude Code:**  
```bash
cp mcp-config-claude-code.example.json your-project/.claude/mcp-config.json  
```

Then edit `.claude/mcp-config.json` and replace:
- `your_notion_integration_token_here` with your Notion API key
- `your_notion_database_id_here` with your database ID  
- `path/to/notion-vibe-coding` with actual paths

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
# Install global CLI
ln -sf $(pwd)/mcp ~/.local/bin/mcp
export PATH="$HOME/.local/bin:$PATH"

# Create tasks directly
mcp create-task "Add user authentication" "Feature" "Implement OAuth login"
mcp get-task-info <task-id>
mcp update-status <task-id> inProgress
mcp progress-todo <task-id> "Setup OAuth provider" true
mcp analyze-todos <task-id>
```

## What You Get

✅ **Automatic Task Tracking** - Claude creates and updates Notion tasks as you work  
✅ **CLI Integration** - Direct command-line access to all MCP functions  
✅ **Progress Visualization** - Real-time status updates in your Notion workspace  
✅ **Quality Gates** - Built-in testing phase prevents rushing to production  
✅ **Team Collaboration** - Shared visibility across your development team  
✅ **Multi-Project Support** - Use across different codebases with separate configs  

## Available Tools

The MCP server provides 8 tools available both via Claude Desktop (MCP) and CLI wrapper:

### Task Management
- `create_task` / `mcp create-task` - Create new tasks with structured templates
- `update_task` / `mcp update-task` - Modify task content without changing status
- `start_task_workflow` - Initialize workflow for existing tasks (MCP only)
- `get_task_info` / `mcp get-task-info` - Get current status and progress statistics
- `update_task_status` / `mcp update-status` - Change task status with validation

### Todo Management  
- `progress_todo` / `mcp progress-todo` - Mark individual todos complete with auto-progression
- `analyze_task_todos` / `mcp analyze-todos` - Extract all todos with completion statistics
- `batch_progress_todos` - Update multiple todos efficiently (MCP only)

### Workflow Guidance
- `get_workflow_guidance` / `mcp get-guidance` - Get AI guidance for creation/update/execution workflows

### CLI-Only Features
- `mcp help` - Show all available commands and usage examples

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
