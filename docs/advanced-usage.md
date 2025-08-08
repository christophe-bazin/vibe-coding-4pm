# Advanced Usage Guide

Detailed tool usage, multi-project setup, CLI wrapper, and advanced workflows for the provider-aware Notion Vibe Coding MCP server.

## Multi-Provider Support

The system supports multiple task management platforms:

- **Notion** (core): Default provider, fully supported
- **Linear** (premium): Available but disabled by default  
- **GitHub Projects** (enterprise): Available but disabled by default

Most MCP tools accept an optional `provider` parameter to specify which platform to use. If not specified, the default provider from configuration is used.

## CLI Wrapper Usage

The global `vc4pm` command provides direct command-line access to all MCP functions.

### Usage

```bash
# Available globally after: npm install -g @vc4pm/server
vc4pm <tool> '<json_arguments>'

# Or locally in development
node mcp.js <tool> '<json_arguments>'
```

### Command Reference

#### Task Management
```bash
# Create tasks with intelligent template adaptation
vc4pm create_task '{"title":"Fix login bug","taskType":"Bug","description":"Users cannot authenticate with OAuth"}'

# Get task information with todo statistics
vc4pm get_task '{"taskId":"23e0da7a-7a07-8145-9611-e394062d8a55"}'

# Update tasks with flexible validation
vc4pm update_task '{"taskId":"<task-id>","status":"In Progress"}'
vc4pm update_task '{"taskId":"<task-id>","title":"New Title","taskType":"Feature"}'

# Execute tasks with provider-aware batch workflow
vc4pm execute_task '{"taskId":"<task-id>"}'

# Get templates for AI adaptation
vc4pm get_task_template '{"taskType":"Feature"}'

# Generate development summary workflow
vc4pm generate_summary '{"taskId":"<task-id>"}'
vc4pm get_summary_template '{"taskId":"<task-id>"}'
vc4pm append_summary '{"taskId":"<task-id>","adaptedSummary":"# Development Summary\n\nCompleted the task..."}'
```

#### Todo Management
```bash
# Batch update todos with automatic execution continuation
vc4pm update_todos '{"taskId":"<task-id>","updates":[{"todoText":"Setup OAuth provider","completed":true}]}'

# Analyze all todos with completion statistics
vc4pm analyze_todos '{"taskId":"<task-id>"}'

# Generate development summary with testing todos
vc4pm generate_summary '{"taskId":"<task-id>"}'
```

#### Templates & Workflow
```bash
# Get specialized templates for each task type
node mcp.js get_task_template '{"taskType":"Feature"}'
node mcp.js get_task_template '{"taskType":"Bug"}'
node mcp.js get_task_template '{"taskType":"Refactoring"}'

# Get workflow guidance for creation
node mcp.js get_workflow_guidance '{"type":"creation"}'
```

### Integration with Claude Code

Use the CLI directly in your Claude Code conversations:

```bash
# Create a task for the current development session
node mcp.js create_task '{"title":"Refactor authentication module","taskType":"Refactoring","description":"Improve code structure and add tests"}'

# Track progress as you work
node mcp.js progress_todo '{"taskId":"<task-id>","todoText":"Extract auth service","completed":true}'
node mcp.js progress_todo '{"taskId":"<task-id>","todoText":"Add unit tests","completed":true}'
node mcp.js progress_todo '{"taskId":"<task-id>","todoText":"Update documentation","completed":true}'

# Check final status
node mcp.js get_task_info '{"taskId":"<task-id>"}'
```

## Multi-Project Setup

Use the same MCP installation across different projects for maximum efficiency.

### Global Installation (Recommended)

Install once, use everywhere:

```bash
# Install globally
cd ~/tools  # or any global location
git clone https://github.com/christophe-bazin/vibe-coding-4pm.git
cd vibe-coding-4pm
npm install && npm run build

# Optional: create global alias
echo 'alias mcp="node ~/tools/vibe-coding-4pm/mcp.js"' >> ~/.bashrc
source ~/.bashrc
```

### Per-Project Configuration

Each project gets its own configuration:

```json
// your-project/.claude/mcp-config.json
{
  "mcpServers": {
    "vibe-coding-4pm": {
      "command": "node",
      "args": ["/path/to/vibe-coding-4pm/dist/server.js"],
      "env": {
        "NOTION_API_KEY": "your_notion_integration_token_here",
        "NOTION_DATABASE_ID": "your_database_id_here",
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
          "requiresValidation": ["done"]
        }
      }
    }
  }
}
```

### Project Templates

Add project-specific AI guidance:

```markdown
<!-- your-project/.claude/instructions.md -->
# Development Workflow

## Notion Database
Database ID: `your-database-id-here`

## Task Management Rules
- Always create tasks before implementing features
- Use workflow types: Feature/Bug/Refactoring  
- Follow progression: Not Started → In Progress → Test → Done
- Only humans can mark tasks as "Done"

## Development Flow
1. Ask Claude to create a task for new features
2. Provide the Notion URL to start implementation
3. Claude will manage status progression automatically
4. Review and validate when task reaches "Test" status
```

## Development Examples

### Feature Implementation

```
You: "I need to add user authentication with JWT to this React app"

Claude: 
→ Uses create_task() 
→ "Task created: https://notion.so/implement-jwt-auth-abc123"

You: "Perfect, implement this feature"

Claude:
→ Uses start_task_workflow() with the URL
→ Sets status to "In Progress"  
→ Implements authentication step by step
→ Updates task with progress notes
→ Moves to "Test" with summary and test plan

You: Review, test, and manually mark as "Done"
```

### Bug Fix Workflow

```
You: "Fix this login issue: https://notion.so/fix-login-bug-xyz789"

Claude:
→ start_task_workflow({ workflowType: "bug" })
→ Analyzes existing task content
→ Implements fix with detailed notes
→ Moves to "Test" for validation
```

### Task Updates

```
You: "Update the auth task to include OAuth2 support"

Claude:
→ Uses update_task()
→ Preserves current status
→ Adds new requirements to description
```

## Complete Tool Reference

### Todo Management Tools

#### `progress_todo`

Mark a specific todo as completed and auto-update task status based on progress.

**Parameters:**
- `taskId` (string, required): Notion page ID
- `todoText` (string, required): Exact text of the todo to update
- `completed` (boolean, required): Mark as completed (true) or uncompleted (false)
- `autoProgress` (boolean, optional): Automatically update task status (default: true)

**Example:**
```json
{
  "taskId": "abc123...",
  "todoText": "Setup database schema",
  "completed": true,
  "autoProgress": true
}
```

**Response:**
```json
{
  "success": true,
  "taskId": "abc123...",
  "todoText": "Setup database schema",
  "completed": true,
  "autoProgressed": true,
  "newStatus": "In Progress",
  "stats": {
    "total": 5,
    "completed": 2,
    "percentage": 40,
    "nextTodos": ["Create user model", "Add validation"]
  },
  "summary": "📊 **Task Status:** In Progress\n✅ **Progress:** 2/5 todos (40%)",
  "message": "Todo \"Setup database schema\" marked as completed"
}
```

#### `analyze_task_todos`

Extract and analyze all todos from a task with completion statistics.

**Parameters:**
- `taskId` (string, required): Notion page ID
- `includeHierarchy` (boolean, optional): Include nested todo structure (default: false)

**Example:**
```json
{
  "taskId": "abc123...",
  "includeHierarchy": false
}
```

**Response:**
```json
{
  "success": true,
  "taskId": "abc123...",
  "todos": [
    {
      "text": "Setup database schema",
      "completed": true,
      "level": 0,
      "index": 0
    },
    {
      "text": "Create user model",
      "completed": false,
      "level": 1,
      "index": 1
    }
  ],
  "stats": {
    "total": 5,
    "completed": 2,
    "percentage": 40,
    "nextTodos": ["Create user model", "Add validation"]
  },
  "currentStatus": "In Progress",
  "recommendedStatus": "In Progress",
  "shouldAutoProgress": false,
  "insights": ["2/5 todos completed (40%)", "Task in early progress"],
  "recommendations": ["Continue with next priority todos"],
  "message": "Found 5 todos (2 completed)"
}
```

#### `batch_progress_todos`

Update multiple todos at once for efficient progress tracking.

**Parameters:**
- `taskId` (string, required): Notion page ID
- `updates` (array, required): Array of todo updates with `todoText` and `completed` properties
- `autoProgress` (boolean, optional): Auto-update task status (default: true)

**Example:**
```json
{
  "taskId": "abc123...",
  "updates": [
    {"todoText": "Setup database", "completed": true},
    {"todoText": "Create models", "completed": true},
    {"todoText": "Add validation", "completed": false}
  ],
  "autoProgress": true
}
```

**Response:**
```json
{
  "success": true,
  "taskId": "abc123...",
  "updatesApplied": 3,
  "autoProgressed": true,
  "newStatus": "In Progress",
  "stats": {
    "total": 5,
    "completed": 3,
    "percentage": 60,
    "nextTodos": ["Add validation", "Testing"]
  },
  "summary": "📊 **Task Status:** In Progress\n✅ **Progress:** 3/5 todos (60%)",
  "message": "Batch updated 3 todos"
}
```

### Task Management Tools

#### `create_task`

Create a new task in Notion database with workflow template.

**Parameters:**
- `title` (string, required): The task title
- `taskType` (string, required): Type of task ("Feature", "Bug", or "Refactoring")
- `description` (string, required): Task description and content
- `provider` (string, optional): Provider to use ("notion", "linear", "github"). Defaults to configured default provider.

**Example:**
```json
{
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

#### `update_task`

Update task title, type and/or status with validation.

**Parameters:**
- `taskId` (string, required): The task/page ID
- `title` (string, optional): New task title
- `taskType` (string, optional): New task type ("Feature", "Bug", or "Refactoring")
- `status` (string, optional): New status with workflow validation
- `provider` (string, optional): Provider to use ("notion", "linear", "github"). Defaults to configured default provider.

**Example:**
```json
{
  "taskId": "abc123...",
  "title": "Enhanced user authentication",
  "taskType": "Feature",
  "status": "In Progress"
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

#### `start_task_workflow`

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

#### `get_workflow_guidance`

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


#### `get_task_info`

Get current task status and available transitions with todo statistics.

**Parameters:**
- `taskId` (string, required): The task/page ID
- `provider` (string, optional): Provider to use ("notion", "linear", "github"). Defaults to configured default provider.

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
  "todoStats": {
    "total": 8,
    "completed": 3,
    "percentage": 37.5,
    "nextTodos": ["Setup API endpoints", "Add error handling"]
  },
  "progressRecommendation": {
    "recommendedStatus": "In Progress",
    "shouldAutoProgress": false,
    "reason": "Progress detected: 37.5% of todos completed"
  },
  "message": "Task info retrieved for abc123..."
}
```

## Workflow Logic

### Status Transitions

The AI follows these rules defined in configuration:

1. **New Tasks**: Start in "Not Started" (default status)
2. **In Progress**: AI can move from "Not Started" to "In Progress"
3. **Testing Phase**: AI must move to "Test" (cannot skip to "Done")
4. **Completion**: Only humans can move tasks to "Done"

### Todo-Based Auto-Progression

The system automatically updates task status based on todo completion:

- **0% completion**: Task remains in "Not Started"
- **>0% and <100%**: Auto-progression to "In Progress"
- **100% completion**: Auto-progression to "Test" (never "Done")

### AI Restrictions

- **Cannot close tasks**: AI must move tasks to "Test", not "Done"
- **Must provide summary**: AI adds execution summary before status change
- **Must provide test plan**: AI generates test checklist for validation
- **Content vs Execution**: Clear separation between updating content and executing tasks
- **Smart todo matching**: Fuzzy search finds todos even with minor text variations

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

### Creating a New Task with Todos

1. **Create Task:**
```json
{
  "title": "Implement user authentication",
  "taskType": "Feature",
  "description": "Add JWT-based authentication system with login/logout functionality"
}
```

2. **Analyze Initial Todos:**
```json
{
  "taskId": "abc123...",
  "includeHierarchy": false
}
```

### Working with Todos

1. **Mark Individual Todo as Complete:**
```json
{
  "taskId": "abc123...",
  "todoText": "Setup database schema",
  "completed": true,
  "autoProgress": true
}
```

2. **Batch Update Multiple Todos:**
```json
{
  "taskId": "abc123...",
  "updates": [
    {"todoText": "Setup database", "completed": true},
    {"todoText": "Create user model", "completed": true},
    {"todoText": "Add password hashing", "completed": false}
  ]
}
```

3. **Get Todo Analysis and Progress:**
```json
{
  "taskId": "abc123...",
  "includeHierarchy": true
}
```

### Traditional Task Management

1. **Update Task Content:**
```json
{
  "taskId": "abc123...",
  "title": "Enhanced user authentication",
  "content": "Add JWT-based authentication with OAuth2 support"
}
```

2. **Manual Status Updates:**
```json
{
  "taskId": "abc123...",
  "newStatus": "In Progress"
}
```

3. **Get Complete Task Information:**
```json
{
  "taskId": "abc123..."
}
```

### Execution Workflow

1. **Initialize Workflow:**
```json
{
  "taskUrl": "https://notion.so/implement-user-auth",
  "workflowType": "feature"
}
```

2. **Progress Through Todos:**
```json
{
  "taskId": "abc123...",
  "todoText": "Complete implementation",
  "completed": true
}
```

3. **Auto-Transition to Test Phase:**
- When all todos are completed, task automatically moves to "Test"
- AI provides summary and test plan as per execution workflow

## Benefits for Development Teams

✅ **Consistent Workflow** - Same process across all projects and team members  
✅ **Automatic Documentation** - Implementation details automatically saved to Notion  
✅ **Progress Tracking** - Real-time status updates visible to entire team  
✅ **Quality Gates** - Mandatory testing phase prevents rushed releases  
✅ **Team Visibility** - Shared Notion workspace for project oversight  
✅ **Context Preservation** - Claude remembers task context throughout implementation  

## Troubleshooting Common Issues

### MCP Not Detected
- Verify `.claude/mcp-config.json` path is correct
- Check Notion API key validity
- Ensure database is shared with your Notion integration

### Status Transition Errors  
- Confirm configuration transitions match your Notion board setup
- Verify status values exactly match Notion select options
- Check that required statuses exist: "Not Started", "In Progress", "Test", "Done"

### Database Access Errors
- Confirm integration has access to the target database
- Verify database ID is correct in project configuration
- Check that database has required properties: Status, Type

### Todo Matching Issues
- Ensure todo text matches exactly (case-sensitive)
- Check for extra spaces or formatting differences
- Use `analyze_task_todos` to see all available todos

### Configuration Problems
- Validate JSON syntax in mcp-config.json
- Ensure all required fields are present
- Check that workflow files exist at specified paths