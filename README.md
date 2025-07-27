# notion-workflow-mcp

A Model Context Protocol (MCP) server that provides AI-guided development workflows for Notion tasks. This server uses configuration-driven workflows to help AI assistants create, update, and execute development tasks with proper status management.

## Features

- **Config-Driven Workflows**: Simple JSON configuration for board setup and task types
- **AI-Guided Task Creation**: Structured templates for Feature/Bug/Refactoring tasks
- **Content Updates**: Modify task content without changing status
- **Execution Management**: Complete task implementation with automatic status progression
- **Test Preparation**: AI generates summary and test plans before moving to testing
- **Human Validation**: AI cannot close tasks directly - requires human validation
- **English Workflows**: All guidance and templates in English

## Architecture

This MCP server provides a simplified, configuration-based approach to Notion workflow management:

- Load board configuration from `config.json`
- Use markdown workflow files as AI prompts
- Simple status transitions with validation
- Separate workflows for creation, updates, and execution

## Installation

1. Clone this repository:
```bash
git clone <repository-url>
cd notion-workflow-mcp
```

2. Copy configuration files:
```bash
cp config.sample.json config.json
cp .env.sample .env
```

3. Install dependencies:
```bash
npm install
```

4. Configure your environment:
   - Edit `config.json` with your board configuration
   - Edit `.env` with your Notion API key

5. Build the project:
```bash
npm run build
```

## Configuration

### Board Configuration (`config.json`)

```json
{
  "board": {
    "name": "Development Tasks",
    "statuses": ["Not Started", "In Progress", "Test", "Done"],
    "transitions": {
      "Not Started": ["In Progress"],
      "In Progress": ["Test"],
      "Test": ["Done", "In Progress"],
      "Done": ["Test"]
    },
    "autoProgressionEnabled": true,
    "requiresValidation": ["Done"]
  },
  "taskTypes": ["Feature", "Bug", "Refactoring"],
  "defaultStatus": "Not Started"
}
```

### Workflow Files (`workflows/`)

- `task-creation.md`: Guide for creating new tasks
- `task-update.md`: Guide for updating task content  
- `task-execution.md`: Guide for implementing tasks

### Environment Variables

Copy `.env.sample` to `.env` and configure:

```bash
# Required
NOTION_API_KEY=secret_your_notion_integration_token_here

# Optional
DEBUG=false
CONFIG_PATH=./config.json
```

### Notion Setup

1. Create a Notion integration at https://www.notion.so/my-integrations
2. Copy the internal integration token
3. Share your Notion pages/databases with the integration
4. Ensure your task pages have a "Status" property with these options:
   - "Not Started", "In Progress", "Test", "Done"
5. Add a "Type" property with options: "Feature", "Bug", "Refactoring"

## Usage

### Running the Server

```bash
npm start
```

The server runs on stdio and is designed to be used with MCP-compatible clients.

## Available MCP Tools

### `create_task`

Create a new task in Notion database with workflow template.

**Parameters:**
- `databaseId` (string, required): The Notion database ID where to create the task
- `title` (string, required): The task title
- `taskType` (string, required): Type of task ("Feature", "Bug", or "Refactoring")
- `description` (string, required): Task description and content

**Example:**
```json
{
  "databaseId": "your-database-id-here",
  "title": "Implement user authentication",
  "taskType": "Feature",
  "description": "Add JWT-based authentication system with login/logout functionality"
}
```

**Response:**
```json
{
  "success": true,
  "taskId": "abc123...",
  "title": "Implement user authentication",
  "taskType": "Feature",
  "status": "Not Started",
  "message": "Task created successfully: Implement user authentication",
  "url": "https://notion.so/abc123..."
}
```

### `update_task`

Update task content (title, description, type) without changing status.

**Parameters:**
- `taskId` (string, required): The Notion task/page ID
- `title` (string, optional): New task title
- `content` (string, optional): New task content/description
- `taskType` (string, optional): New task type ("Feature", "Bug", or "Refactoring")

**Example:**
```json
{
  "taskId": "abc123...",
  "title": "Enhanced user authentication",
  "content": "Add JWT-based authentication with OAuth2 support",
  "taskType": "Feature"
}
```

**Response:**
```json
{
  "success": true,
  "taskId": "abc123...",
  "updates": ["title", "content", "taskType"],
  "message": "Task updated successfully",
  "guidance": "# Workflow: Content Update..."
}
```

### `start_task_workflow`

Initialize a workflow for a Notion task and get workflow guidance.

**Parameters:**
- `taskUrl` (string, required): The Notion task URL
- `workflowType` (string, required): Type of workflow ("feature", "bug", or "refactor")

**Example:**
```json
{
  "taskUrl": "https://www.notion.so/your-page-id-here",
  "workflowType": "feature"
}
```

**Response:**
```json
{
  "success": true,
  "taskId": "abc123...",
  "workflowType": "feature",
  "currentStatus": "Not Started",
  "availableStatuses": ["Not Started", "In Progress", "Test", "Done"],
  "nextStatuses": ["In Progress"],
  "guidance": "# Workflow: Development Task Creation...",
  "message": "Workflow initialized for feature task. Current status: Not Started"
}
```

### `get_workflow_guidance`

Get workflow guidance for task creation, update, or execution.

**Parameters:**
- `action` (string, required): Type of guidance needed ("creation", "update", or "execution")

**Example:**
```json
{
  "action": "creation"
}
```

**Response:**
Returns the complete markdown content of the requested workflow file.

### `update_task_status`

Update task status according to workflow rules.

**Parameters:**
- `taskId` (string, required): The Notion task/page ID
- `newStatus` (string, required): New status to set
- `force` (boolean, optional): Force update bypassing validation (default: false)

**Example:**
```json
{
  "taskId": "abc123...",
  "newStatus": "In Progress"
}
```

**Response:**
```json
{
  "success": true,
  "taskId": "abc123...",
  "newStatus": "In Progress",
  "nextStatuses": ["Test"],
  "message": "Status updated to: In Progress"
}
```

### `get_task_info`

Get current task status and available transitions.

**Parameters:**
- `taskId` (string, required): The Notion task/page ID

**Example:**
```json
{
  "taskId": "abc123..."
}
```

**Response:**
```json
{
  "success": true,
  "taskId": "abc123...",
  "currentStatus": "In Progress",
  "taskType": "feature",
  "nextStatuses": ["Test"],
  "allStatuses": ["Not Started", "In Progress", "Test", "Done"],
  "taskTypes": ["Feature", "Bug", "Refactoring"],
  "message": "Task info retrieved for abc123..."
}
```

## Workflow Logic

### Status Transitions

The AI follows these rules defined in `config.json`:

1. **New Tasks**: Start in "Not Started" (default status)
2. **In Progress**: AI can move from "Not Started" to "In Progress"
3. **Testing Phase**: AI must move to "Test" (cannot skip to "Done")
4. **Completion**: Only humans can move tasks to "Done"

### AI Restrictions

- **Cannot close tasks**: AI must move tasks to "Test", not "Done"
- **Must provide summary**: AI adds execution summary before status change
- **Must provide test plan**: AI generates test checklist for validation
- **Content vs Execution**: Clear separation between updating content and executing tasks

### Workflow Types

#### Task Creation (`creation`)
- Analyze user needs and create structured tasks
- Use appropriate templates (Feature/Bug/Refactoring)
- Set initial status to "Not Started"

#### Content Updates (`update`)
- Modify task descriptions, criteria, or notes
- Status remains unchanged
- Use for clarifications and scope adjustments

#### Task Execution (`execution`)
- Implement tasks from start to finish
- Handle new tasks, resumption, or modified tasks
- Generate summary and test plans
- Move to "Test" for human validation

## Usage Examples

### Creating a New Task

1. **Create Task:**
```json
{
  "databaseId": "your-database-id",
  "title": "Implement user authentication",
  "taskType": "Feature",
  "description": "Add JWT-based authentication system"
}
```

2. **Get Creation Guidance (optional):**
```json
{
  "action": "creation"
}
```

### Updating Task Content

1. **Update Task:**
```json
{
  "taskId": "abc123...",
  "title": "Enhanced user authentication",
  "content": "Add JWT-based authentication with OAuth2 support"
}
```

2. **Get Update Guidance (optional):**
```json
{
  "action": "update"
}
```

### Working with Existing Tasks

1. **Initialize Workflow for Existing Task:**
```json
{
  "taskUrl": "https://notion.so/implement-user-auth",
  "workflowType": "feature"
}
```

2. **Get Task Information:**
```json
{
  "taskId": "abc123..."
}
```

### Executing a Task

1. **Get Execution Guidance:**
```json
{
  "action": "execution"
}
```

2. **Update Status to In Progress:**
```json
{
  "taskId": "abc123...",
  "newStatus": "In Progress"
}
```

3. **Complete Implementation and Move to Test:**
```json
{
  "taskId": "abc123...",
  "newStatus": "Test"
}
```

## Development

### Project Structure

```
notion-workflow-mcp/
├── config.json                 # Board configuration
├── workflows/                  # Workflow guidance files
│   ├── task-creation.md
│   ├── task-update.md
│   └── task-execution.md
├── src/
│   ├── server.ts               # Main MCP server
│   ├── simple-progress-tracker.ts # Status management
│   ├── config-loader.ts        # Configuration loader
│   ├── utils.ts               # URL parsing utilities
│   └── types.ts               # TypeScript definitions
├── package.json
└── README.md
```

### Building

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

## Customization

### Adding New Task Types

1. Update `taskTypes` in `config.json`
2. Add templates in `workflows/task-creation.md`
3. Update MCP tool enum values if needed

### Changing Status Names

1. Update `statuses` and `transitions` in `config.json`
2. Update Notion board to match
3. Test all transitions work correctly

### Custom Workflows

1. Modify markdown files in `workflows/`
2. Server automatically loads changes
3. Test with `get_workflow_guidance` tool

## Error Handling

The server includes comprehensive error handling for:

- Invalid Notion URLs
- Missing configuration files
- Invalid status transitions
- Notion API errors
- Configuration validation errors

All errors are returned as structured MCP responses with descriptive messages.

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with your Notion setup
5. Submit a pull request

## Support

For issues and questions, please open an issue on the GitHub repository.