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
- `create_task`: Create tasks with intelligent template adaptation
- `get_task`: Get task information with todo statistics
- `update_task`: Update task title, type and/or status with flexible validation
- `execute_task`: Execute task with auto-continuation workflow
- `get_task_template`: Get specialized templates for each task type
- `get_workflow_guidance`: Return creation workflow guidance
- `analyze_todos`: Extract and analyze todos with completion statistics
- `update_todos`: Batch update todos (triggers auto-continuation)
- `generate_dev_summary`: Generate development summary with git changes

### Clean Service Architecture

#### Core Services (`src/services/core/`)

**CreationService** (`src/services/core/CreationService.ts`)
**Responsibility**: Task creation with intelligent template adaptation

- Task creation with specialized templates (feature.md, bug.md, refactoring.md)
- AI-driven template customization based on user description patterns
- Template placeholder processing and context adaptation
- Integration with workflow configuration

**UpdateService** (`src/services/core/UpdateService.ts`)
**Responsibility**: Task and todo updates with callback system

- Task and todo updates with validation
- Callback system for auto-execution triggering
- Git-based development summary generation
- Metadata retrieval and progress tracking

**ExecutionService** (`src/services/core/ExecutionService.ts`)
**Responsibility**: Task execution orchestration with auto-continuation

- Todo-by-todo AI guidance system with auto-continuation
- Auto-status updates based on progress
- Integration with UpdateService callback system
- Development summary generation after execution

#### Shared Services (`src/services/shared/`)

**StatusService** (`src/services/shared/StatusService.ts`)
**Responsibility**: Flexible status transitions and workflow management

- Flexible status transitions (all moves allowed for corrections)
- Status recommendations based on progress
- Workflow configuration interpretation
- Status key mapping and validation

**ValidationService** (`src/services/shared/ValidationService.ts`)
**Responsibility**: Input validation and data integrity

- Input validation for all operations
- Task type and status constraint checking
- Error handling with clear messaging
- No hardcoded fallbacks (strict configuration enforcement)

**ResponseFormatter** (`src/services/shared/ResponseFormatter.ts`)
**Responsibility**: Standardized MCP response formatting

- Consistent response structures for MCP tools
- Progress visualization and statistics
- Error and success message formatting
- CLI output styling

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

### 1. Auto-Continuation Workflow
```
AI implements todo → update_todos → UpdateService callback → ExecutionService → next todo
```

1. AI implements a todo using development tools
2. AI calls update_todos to mark completion
3. UpdateService triggers callback to ExecutionService
4. ExecutionService auto-launches next execution round
5. System guides AI to next uncompleted todo

### 2. Template Intelligence
```
MCP Client → create_task → CreationService → Template Loading → Context Adaptation
```

1. AI requests task creation with description
2. CreationService loads appropriate template (feature.md, bug.md, refactoring.md)
3. Analyzes description for patterns (files, APIs, etc.)
4. Generates specific todos based on detected requirements
5. Returns task with intelligently adapted content

### 3. Task Updates with Flexible Validation
```
MCP Client → update_task → ValidationService → StatusService → Notion Update
```

1. AI requests task changes (title, type, status)
2. ValidationService checks basic constraints
3. StatusService allows all transitions for corrections
4. Updates task in Notion if valid
5. Returns success confirmation

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