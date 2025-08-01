# MCP Architecture

## Overview

The Notion Workflow MCP Server is built as a lightweight, configuration-driven system that provides AI assistants with structured workflows for Notion task management.

## Core Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   MCP Client    │    │   MCP Server     │    │   Notion API    │
│   (Claude)      │◄──►│   (This App)     │◄──►│   (Tasks)       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │  Configuration   │
                       │  Files           │
                       │  • config.json   │
                       │  • workflows/*.md│
                       └──────────────────┘
```

## Component Breakdown

### MCP Server (`src/server.ts`)
**Responsibility**: Handle MCP protocol and expose tools to AI clients

- Implements MCP protocol specification
- Provides 8 main tools for AI interaction
- Handles tool parameter validation
- Manages error responses and formatting
- Routes requests to appropriate handlers

**Key Tools**:
- `create_task`: Create new tasks with AI-adapted content
- `get_task`: Get task information with todo statistics
- `update_task`: Update task title, type and/or status with validation
- `execute_task`: Execute task workflow in various modes
- `get_task_template`: Get task template for AI adaptation
- `get_workflow_guidance`: Return markdown guidance for AI
- `analyze_todos`: Extract and analyze all todos
- `update_todos`: Batch update multiple todos

### Service Layer Architecture

**TaskService** (`src/services/TaskService.ts`)
**Responsibility**: High-level task operations

- Task creation, updates, and status management
- Task type validation against configuration
- Status transition validation and recommendations
- Integration with workflow configuration

**TodoService** (`src/services/TodoService.ts`)
**Responsibility**: Todo analysis and updates

- Extracts todos from Notion task content
- Provides completion statistics and insights
- Batch todo update operations
- Progress tracking and recommendations

**ExecutionService** (`src/services/ExecutionService.ts`)
**Responsibility**: Task execution workflows

- Auto, step-by-step, and batch execution modes
- Progress tracking and status updates
- Workflow state management
- Integration with AI guidance

**WorkflowService** (`src/services/WorkflowService.ts`)
**Responsibility**: Workflow guidance management

- Loads workflow markdown templates
- Provides structured guidance for AI
- Template processing and context injection
- Workflow file caching

**ResponseFormatter** (`src/services/ResponseFormatter.ts`)
**Responsibility**: Standardized response formatting

- Consistent response structures for MCP tools
- Error message formatting
- Success confirmation formatting
- Status and metadata display

### Provider Pattern

**TaskProvider Interface** (`src/interfaces/TaskProvider.ts`)
**Responsibility**: Abstract task management backend

- Pluggable backend implementations
- Standardized task operations
- Provider-agnostic API surface

**NotionAPIAdapter** (`src/adapters/NotionAPIAdapter.ts`)
**Responsibility**: Notion API integration

- Direct Notion API communication
- Dynamic title property resolution
- Markdown to Notion blocks conversion
- API error handling and retry logic

### Type Definitions

**Models** (`src/models/`)
**Responsibility**: Core data structures

- Task.ts: Task entities and metadata
- Todo.ts: Todo items and analysis results
- Workflow.ts: Workflow configuration and execution modes

## Data Flow

### 1. Workflow Initialization
```
MCP Client → start_task_workflow → URL Parser → Notion API → State Init
```

1. AI provides Notion URL and workflow type
2. Server parses URL to extract page ID
3. Fetches current status from Notion
4. Initializes workflow state in memory
5. Returns guidance and current state

### 2. Task Updates
```
MCP Client → update_task → Validation → Notion Update → State Sync
```

1. AI requests task changes (title, type, status)
2. Server validates transitions and types against config
3. Updates task in Notion if allowed
4. Syncs local state with Notion response
5. Returns success confirmation

### 3. Workflow Guidance
```
MCP Client → get_workflow_guidance → Config Loader → Markdown Return
```

1. AI requests guidance for specific action
2. Server loads appropriate markdown file
3. Returns full workflow content as text
4. AI uses content as structured prompt

## Configuration-Driven Design

### Benefits
- **No Code Changes**: Modify behavior through config files
- **Easy Customization**: Adapt to different team workflows
- **Clear Separation**: Logic separate from configuration
- **Version Control**: Config changes tracked in Git
- **Hot Reload**: Update workflows without restart (dev mode)

### Configuration Files

**`config.json`**: Core system behavior
- Board status definitions
- Allowed status transitions
- Task types and defaults
- Workflow file locations

**`workflows/*.md`**: AI guidance content
- Structured prompts for AI behavior
- Templates and examples
- Rules and restrictions
- Best practices

## Status Transition Engine

### Validation Logic
```typescript
isTransitionAllowed(current: string, target: string): boolean {
  const allowed = this.config.board.transitions[current] || [];
  return allowed.includes(target);
}
```

### Override Mechanism
```typescript
async forceStatusUpdate(taskId: string, status: string, reason: string) {
  console.warn(`Forcing transition: ${reason}`);
  await this.updateWithoutValidation(taskId, status);
}
```

### AI Restrictions
Built into configuration to prevent AI from:
- Closing tasks directly (transitions to final status restricted)
- Skipping required validation phases
- Making unauthorized status changes

## Error Handling Strategy

### Graceful Degradation
- Invalid URLs → Clear error message with format examples
- Missing config → Descriptive error with required fields
- API failures → Retry logic with exponential backoff
- Invalid transitions → Show allowed options

### Error Response Format
```json
{
  "success": false,
  "error": "Invalid transition from 'En cours' to 'Terminé'",
  "allowedTransitions": ["A tester"],
  "currentStatus": "En cours"
}
```

## Security Considerations

### Input Validation
- All URLs validated before processing
- Status names validated against configuration
- Task IDs checked for proper format
- Parameter types enforced by TypeScript

### API Security
- Environment variables for sensitive data
- No logging of API keys or tokens
- Proper error handling to avoid information leakage
- Rate limiting consideration for API calls

### Configuration Security
- Validation of config file format
- Sanitization of workflow content
- Protection against malicious markdown injection

## Performance Characteristics

### Memory Usage
- Configuration cached on startup
- Workflow state maintained in-memory for active tasks
- Markdown files cached to avoid repeated disk reads
- Automatic cleanup of stale workflow states

### API Efficiency
- Batched operations where possible
- Minimal API calls through state caching
- Intelligent sync only when needed
- Connection reuse for Notion API

## Scalability Considerations

### Current Limitations
- In-memory state (lost on restart)
- Single process design
- No persistence layer
- Limited concurrent task handling

### Future Improvements
- Persistent state storage (Redis/SQLite)
- Multi-process support
- Background task processing
- Enhanced caching strategies

## Extension Points

### Adding New Tools
1. Define tool schema in server.ts
2. Implement handler method
3. Add routing in request handler
4. Update documentation and types

### Custom Status Types
1. Update config.json with new statuses
2. Define transitions in configuration
3. Update workflow markdown files
4. Test with Notion board setup

### New Workflow Types
1. Add to taskTypes in config.json
2. Create templates in task-creation.md
3. Add specific guidance if needed
4. Update documentation

This architecture provides a solid foundation for AI-guided task management while remaining simple, configurable, and extensible.