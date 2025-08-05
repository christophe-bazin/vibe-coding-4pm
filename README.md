# AI Project Manager

**Transform your AI assistant into an autonomous development project manager.**

Say *"Add user authentication to this React app"* and watch your AI:

## 🚀 **Key Features & Workflow**

- **🎯 Autonomous Project Management**: AI creates structured tasks, implements features, and tracks progress automatically
- **📋 Intelligent Task Creation**: Smart templates adapt to your requirements - fully customizable or use defaults (Feature, Bug, Refactoring)  
- **⚡ Complete Development Automation**: From task creation → implementation → testing checklist → status management
- **🔄 Multi-AI Support**: Works with Claude, Cursor, Copilot through natural language interface
- **🏗️ Multi-Provider Ready**: Currently supports task management systems (Notion first, Linear/GitHub/Jira coming)

## Quick Start

### 1. Install

```bash
git clone https://github.com/christophe-bazin/notion-vibe-coding.git
cd notion-vibe-coding
npm install && npm run build
```

### 2. Setup Your Task Management System

**Currently Supported: Notion** (Linear, GitHub, Jira coming soon)

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

- `your_notion_integration_token_here` with your task provider API key
- `your_notion_database_id_here` with your task board/database ID

### 4. Start Using

```
You: "Add user authentication to this React app"

AI Assistant: 
→ Creates task with adapted template in your task board
→ Gets full task context with execute_task
→ Implements entire feature using rich context
→ Marks all todos complete in batch
→ Automatically moves to "Test" status

You: Review and mark as "Done" when satisfied
```

The MCP server provides 10 tools that your AI assistant can use seamlessly through natural language or direct CLI access.

## What You Get

✅ **AI Project Management** - Your AI assistant becomes an autonomous project manager handling task creation, implementation, and tracking  
✅ **Automatic Workflow** - From "implement feature X" to completed task with testing checklist - fully automated  
✅ **Intelligent Task Creation** - Smart templates adapt to your specific requirements and project context  
✅ **Progress Visualization** - Real-time status updates in your task management workspace for team visibility  
✅ **Quality Gates** - Built-in testing phase prevents rushing to production  
✅ **Multi-Project Support** - Use across different codebases with separate configurations  

## Available Tools

The MCP server provides 10 tools available to MCP clients:

- `create_task` - Create tasks with workflow adaptation (requires adaptedWorkflow)
- `get_task` - Get task information with todo statistics and status info
- `update_task` - Update task title, type and/or status with validation
- `execute_task` - Execute task with automated workflow
- `get_task_template` - Get raw templates for AI adaptation
- `analyze_todos` - Extract and analyze todos with completion statistics
- `update_todos` - Batch update with automatic execution continuation
- `generate_summary` - Generate summary instructions
- `get_summary_template` - Get raw template for AI adaptation
- `append_summary` - Append AI-adapted summary to Notion task

## How It Works

### 🔄 **Automated Task Execution**
1. **AI calls** `execute_task` to start working on a task
2. **AI receives** complete task context with all requirements
3. **AI implements** the task using development tools
4. **AI updates** todos to track progress
5. **System automatically** updates task status and creates summary


## Documentation

- **[Advanced Usage Guide](docs/advanced-usage.md)** - Detailed tool documentation and workflows
- **[Development Setup](docs/development.md)** - Contributing and customization
- **[Configuration Reference](docs/configuration.md)** - Complete configuration options

## Support

For issues and questions, please open an issue on the [GitHub repository](https://github.com/christophe-bazin/notion-vibe-coding).
