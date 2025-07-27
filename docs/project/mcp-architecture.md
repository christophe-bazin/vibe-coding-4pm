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
- Provides 4 main tools for AI interaction
- Handles tool parameter validation
- Manages error responses and formatting
- Routes requests to appropriate handlers

**Key Methods**:
- `start_task_workflow`: Initialize workflow with URL parsing
- `get_workflow_guidance`: Return markdown guidance for AI
- `update_task_status`: Change status with validation
- `get_task_info`: Retrieve current state and options

### Configuration Loader (`src/config-loader.ts`)
**Responsibility**: Load and validate configuration files

- Loads `config.json` with board setup and rules
- Caches workflow markdown files in memory
- Validates configuration format on startup
- Provides status transition validation
- Supports configuration reload for development

**Configuration Structure**:
```json
{
  "board": {
    "statuses": ["status1", "status2", "..."],
    "transitions": { "status1": ["status2"] }
  },
  "taskTypes": ["type1", "type2", "..."],
  "workflowFiles": {
    "creation": "workflows/task-creation.md"
  }
}
```

See `config.json` for actual values used.

### Progress Tracker (`src/simple-progress-tracker.ts`)
**Responsibility**: Manage task state and status transitions

- Maintains in-memory workflow state for active tasks
- Enforces status transition rules from configuration
- Communicates with Notion API for updates
- Provides override mechanisms when needed
- Tracks task metadata and progression

**State Management**:
- Initializes workflow state from Notion
- Validates transitions against config rules
- Supports forced updates with logging
- Syncs changes back to Notion

### Utilities (`src/utils.ts`)
**Responsibility**: Helper functions for common operations

- Notion URL parsing and validation
- Page ID extraction from various URL formats
- URL format normalization
- Error handling helpers

### Types (`src/types.ts`)
**Responsibility**: TypeScript type definitions

- Core data structures for tasks and todos
- Configuration interfaces
- Notion API response types
- MCP tool parameter types

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

### 2. Status Updates
```
MCP Client → update_task_status → Validation → Notion Update → State Sync
```

1. AI requests status change
2. Server validates transition against config
3. Updates status in Notion if allowed
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