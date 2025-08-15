# VC4PM MCP Server

**AI Task Management for Development IDEs via MCP Protocol**

Transform your AI-powered IDE into an autonomous development project manager. Designed specifically for **Claude Code**, **Cursor**, and other AI coding assistants that have file system access and project context.

## 🚀 **Key Features**

- **💻 IDE-First Design**: Built for AI coding assistants with file system access
- **📁 Per-Project Configuration**: Each project has its own task management setup
- **📋 Intelligent Task Creation**: Smart templates adapt to your requirements
- **🎨 Custom Templates**: Override global templates with project-specific ones  
- **⚡ Complete Development Automation**: From task creation → implementation → testing → done
- **🏗️ Multi-Provider Support**: Supports Notion (Linear/GitHub coming soon)

> **⚠️ Important**: This MCP server is designed for AI coding assistants that can read/write files and execute commands (Claude Code, Cursor, etc.). Most features require IDE context and won't work with chat-only AI assistants.

## Quick Start

### 1. Install and Setup

```bash
# Install globally
npm install -g @vc4pm/mcp-server

# Initialize your project
cd your-project
vc4pm-setup
```

The interactive setup will:
- Create `.vc4pm/config.json` with your provider configuration
- Copy templates to `.vc4pm/templates/` for local customization
- Guide you through IDE and provider setup
- Show IDE-specific configuration instructions

### 2. Setup Your Task Management Provider

**Currently Supported: Notion** (Linear, GitHub, Jira coming soon)

**For Notion:**
1. Create a [Notion integration](https://www.notion.so/my-integrations)
2. Copy your integration token
3. Create a database with these properties:
   - **Status** (Select): `Not Started`, `In Progress`, `Test`, `Done`
   - **Type** (Select): `Feature`, `Bug`, `Refactoring`
4. Share your database with the integration
5. Update your `.vc4pm/config.json` with the API key and database ID

### 3. Configuration Structure

Your `.vc4pm/config.json` will have this structure:

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
    "defaultStatus": "notStarted",
    "templates": {
      "override": false,
      "taskPath": ".vc4pm/templates/task/",
      "summaryPath": ".vc4pm/templates/summary/"
    }
  },
  "providers": {
    "default": "notion",
    "available": {
      "notion": {
        "enabled": true,
        "config": {
          "apiKey": "your_notion_integration_token_here",
          "databaseId": "your_notion_database_id_here"
        }
      }
    }
  }
}
```

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

> **💡 Note**: The setup process (`vc4pm-setup`) includes configuration for Claude Code, Cursor, VS Code, Zed, and Continue.dev. For advanced MCP configuration or other editors, see the [manual setup instructions](docs/advanced-usage.md#development-environment-integration).

The MCP server provides tools that your AI assistant uses seamlessly through natural language.

## What You Get

✅ **AI Project Management** - Your AI assistant becomes an autonomous project manager handling task creation, implementation, and tracking  
✅ **Automatic Workflow** - From "implement feature X" to completed task with testing checklist - fully automated  
✅ **Intelligent Task Creation** - Smart templates adapt to your specific requirements and project context  
✅ **Progress Visualization** - Real-time status updates in your task management workspace for team visibility  
✅ **Quality Gates** - Built-in testing phase prevents rushing to production  
✅ **Multi-Project Support** - Use across different codebases with separate configurations  

## Available MCP Tools

The server provides these tools to AI coding assistants:

- **Task Management**: `create_task`, `get_task`, `update_task`, `execute_task` 
- **Template System**: `get_task_template` for AI adaptation
- **Todo Management**: `analyze_todos`, `update_todos` with batch operations
- **Development Summary**: `generate_summary`, `get_summary_template`, `append_summary`  
- **Content Management**: `read_notion_page` for page operations

### 🔧 **Development Environment Requirements**

These tools work best when the AI assistant has access to:
- **File System**: Read/write project files and configurations
- **Terminal Access**: Execute build commands, run tests, commit changes
- **Project Context**: Understand codebase structure and dependencies
- **Working Directory**: Access to `.vc4pm/config.json` in project root

## Per-Project Configuration Benefits

✅ **Project Isolation** - Each project uses its own task board and credentials  
✅ **Team Flexibility** - Different teams can use different providers (Notion, Linear, etc.)  
✅ **Security** - API keys stay local to each project  
✅ **Customization** - Different workflows and templates per project type

## ⚠️ **Requirements & Limitations**

### **✅ Compatible Environments**
- **Claude Code** - Full integration with auto-setup via `vc4pm-setup`
- **Cursor (and others)** - Via MCP configuration and setup utility
- **AI-powered editors** with file system access and terminal capabilities
- **Development workflows** requiring task creation, code implementation, and testing

### **❌ Not Compatible With**
- **Claude Desktop** - No file system access, limited functionality
- **Chat-only AI assistants** - Cannot access project files or execute commands
- **Web-based interfaces** - Require local file system and working directory access

### **🔧 Required Capabilities**
Your AI assistant must be able to:
- Read/write files in your project directory
- Execute terminal commands (npm, git, testing tools)
- Access `.vc4pm/config.json` from project root
- Maintain working directory context during sessions

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

For issues and questions, please open an issue on the [GitHub repository](https://github.com/christophe-bazin/vibe-coding-4pm).
