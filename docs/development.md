# Development Guide

Guide for contributing to and customizing the provider-aware Notion Vibe Coding MCP server.

## Project Structure

```
notion-vibe-coding/
├── src/
│   ├── server.ts                    # Pure MCP router (< 100 lines)
│   ├── interfaces/
│   │   └── TaskProvider.ts          # Provider abstraction interface
│   ├── adapters/
│   │   └── NotionAPIAdapter.ts      # Notion API implementation
│   ├── services/core/               # Main business logic
│   │   ├── CreationService.ts       # Task creation + intelligent templates
│   │   ├── UpdateService.ts         # Updates + todos with callback system
│   │   └── ExecutionService.ts      # Orchestration + auto-continuation
│   ├── services/shared/             # Shared utilities
│   │   ├── StatusService.ts         # Status management + flexible transitions
│   │   ├── ValidationService.ts     # Input validation + error handling
│   │   └── ResponseFormatter.ts     # MCP response formatting
│   ├── models/
│   │   ├── Task.ts                  # Task type definitions
│   │   ├── Todo.ts                  # Todo type definitions
│   │   └── Workflow.ts              # Execution + configuration types
│   └── types/
│       └── Errors.ts                # Custom error types
├── workflows/                       # Template files
│   ├── feature.md                   # Feature task template
│   ├── bug.md                       # Bug task template
│   └── refactoring.md               # Refactoring task template
├── docs/                            # Documentation
├── mcp.js                           # CLI wrapper for testing
├── mcp-config.example.json          # Example MCP configuration
└── README.md
```

## Development Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- TypeScript knowledge
- Notion API familiarity

### Installation

1. Clone the repository:
```bash
git clone https://github.com/christophe-bazin/notion-vibe-coding.git
cd notion-vibe-coding
```

2. Install dependencies:
```bash
npm install
```

3. Set up configuration:
```bash
cp mcp-config.example.json .claude/mcp-config.json
# Edit with your Notion credentials
```

### Building

```bash
# Build for production
npm run build

# Build and watch for changes
npm run dev
```

### Testing

#### MCP Server Testing
```bash
# Test MCP tools manually via CLI wrapper
node mcp.js create_task '{"title":"Test","taskType":"Feature","description":"Test task"}'
node mcp.js get_task '{"taskId":"<task-id>"}'
```

#### Development Workflow
1. Make changes to TypeScript source
2. Run `npm run build` to compile
3. Test via CLI wrapper
4. Test via Claude Desktop MCP integration
5. Update documentation if needed

## Architecture Overview

### 🏗️ **Clean Service Architecture**

#### Core Services (`services/core/`)

**`CreationService.ts`**
- Task creation with intelligent template adaptation
- Loads specialized templates (feature.md, bug.md, refactoring.md)
- AI-driven template customization based on user description
- Template placeholder processing and context adaptation

**`UpdateService.ts`**
- Task and todo updates with validation
- Automatic status updates on todo completion
- Direct development summary generation with testing todos
- Metadata retrieval and progress tracking

**`ExecutionService.ts`**
- Provider-aware task execution orchestration
- Batch execution with rich context (leverages AI provider strengths)
- Automatic status transitions based on workflow configuration
- Single execution call with full task context instead of sequential todos

#### Shared Services (`services/shared/`)

**`StatusService.ts`**
- Flexible status transitions (all moves allowed)
- Status recommendations based on progress
- Workflow configuration interpretation
- Status key mapping and validation

**`ValidationService.ts`**
- Input validation for all operations
- Task type and status constraint checking
- Error handling with clear messaging
- Data integrity enforcement

**`ResponseFormatter.ts`**
- Standardized MCP response formatting
- Consistent CLI output styling
- Progress visualization and statistics
- Error and success message formatting

### 🔄 **Provider-Aware Batch Execution**

1. **execute_task provides** full task context with hierarchical todos
2. **AI receives** rich context (headings, related todos, task metadata)
3. **AI implements** entire task using development tools
4. **AI calls update_todos** to mark all completed todos at once
5. **System automatically** updates status and generates dev summary

### 🎯 **Template Intelligence**

- **Separate templates**: feature.md, bug.md, refactoring.md
- **Context adaptation**: Analyzes description for patterns (files, APIs, etc.)
- **Dynamic todos**: Generates specific todos based on detected requirements
- **Structure preservation**: Maintains template sections while customizing content

### Provider Pattern

#### `TaskProvider.ts`
- Abstract interface for task management backends
- Enables pluggable provider implementations
- Standardized API surface for different services

#### `NotionAPIAdapter.ts`
- Direct Notion API integration
- Dynamic title property resolution
- Markdown to Notion blocks conversion
- API error handling and retry logic

### Data Flow

1. **MCP Request** → `server.ts` routes to appropriate service
2. **Core Service** → Business logic execution (Creation/Update/Execution)
3. **Shared Services** → Status management, validation, formatting
4. **Provider** → `NotionAPIAdapter` handles API calls
5. **Auto-Continuation** → Callback system triggers next execution
6. **Response** → Formatted output returned to client

## Adding New Features

### Adding a New MCP Tool

1. **Define the tool schema** in `server.ts`:
```typescript
{
  name: 'my_new_tool',
  description: 'Description of what the tool does',
  inputSchema: {
    type: 'object',
    properties: {
      param1: { type: 'string', description: 'Parameter description' },
    },
    required: ['param1']
  }
}
```

2. **Add request handler**:
```typescript
case 'my_new_tool':
  return await this.handleMyNewTool(args.param1);
```

3. **Implement handler method**:
```typescript
private async handleMyNewTool(param: string): Promise<string> {
  const result = await this.services.task.myNewFeature(param);
  return this.services.formatter.formatResult(result);
}
```

4. **Add business logic** to appropriate service:
```typescript
// In TaskService.ts, TodoService.ts, etc.
async myNewFeature(param: string): Promise<any> {
  // Implementation
}
```

### Adding New Task Types

1. **Update workflow configuration**:
```json
{
  "taskTypes": ["Feature", "Bug", "Refactoring", "Documentation"]
}
```

2. **Add template** in `workflows/task-creation.md`:
```markdown
#### Documentation
\`\`\`
## Documentation Objective
[What needs to be documented]

## Scope
[Specific areas to cover]

## Acceptance Criteria
- [ ] Documentation written
- [ ] Examples provided
- [ ] Review completed
\`\`\`
```

### Adding New Providers

1. **Implement TaskProvider interface**:
```typescript
export class LinearAdapter implements TaskProvider {
  getProviderName(): string { return 'Linear'; }
  getProviderType(): string { return 'linear'; }
  
  async createTask(title: string, taskType: string, description: string): Promise<Task> {
    // Linear API implementation
  }
  
  // Implement other required methods
}
```

2. **Add provider initialization** in `server.ts`:
```typescript
const provider = process.env.PROVIDER_TYPE === 'linear' 
  ? new LinearAdapter(apiKey, teamId)
  : new NotionAPIAdapter(apiKey, databaseId);
```

## Testing

### Manual Testing

1. **Create test workspace** in your provider (Notion database, Linear team, etc.)
2. **Test each tool** systematically:
```bash
# Test task creation
node mcp.js create_task '{"title":"Test Task","taskType":"Feature","description":"Test"}'

# Test task retrieval
node mcp.js get_task '{"taskId":"test_id"}'

# Test status updates
node mcp.js update_task '{"taskId":"test_id","status":"In Progress"}'
```

### Integration Testing

1. **Test with real workspace**
2. **Verify status transitions work correctly**
3. **Test error handling with invalid inputs**
4. **Check template processing**

## Code Standards

### TypeScript

- Use strict type checking
- Define interfaces for all data structures
- Use async/await for promises
- Handle errors explicitly

### Error Handling

```typescript
try {
  const result = await this.taskProvider.getTask(taskId);
  return result;
} catch (error) {
  if (error.code === 'object_not_found') {
    throw new Error(`Task not found: ${taskId}`);
  }
  throw new Error(`Failed to retrieve task: ${error.message}`);
}
```

### Service Design

- Keep services focused on single responsibilities
- Use dependency injection for testability
- Maintain clear interfaces between layers
- Handle provider-specific logic in adapters

## Contributing

### Pull Request Process

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/my-new-feature`
3. **Make changes** following code standards
4. **Test thoroughly** with your setup
5. **Update documentation** if needed
6. **Submit pull request** with clear description

### Commit Messages

Follow conventional commit format:
- `feat: add new MCP tool for task archiving`
- `fix: resolve todo matching case sensitivity issue`
- `docs: update configuration reference`
- `refactor: simplify status transition logic`

### Code Review Guidelines

- Review for TypeScript type safety
- Check error handling completeness  
- Verify provider API usage is correct
- Ensure backward compatibility
- Test with different configurations

## Troubleshooting Development Issues

### Common Problems

**TypeScript compilation errors:**
- Check import paths use `.js` extension
- Verify all types are properly defined
- Ensure async functions return Promise types

**MCP registration issues:**
- Verify tool schemas are valid JSON Schema
- Check parameter names match between schema and handler
- Ensure all required parameters are marked in schema

**Provider API errors:**
- Verify integration permissions
- Check provider schema matches expectations
- Test API calls with manual requests

**Configuration problems:**
- Validate JSON syntax in config files
- Check file paths are relative to correct directory
- Ensure all required configuration fields are present

### Debugging Tips

1. **Add logging** to trace execution flow
2. **Use TypeScript strict mode** to catch type errors early  
3. **Test configuration** with minimal setup first
4. **Check provider integration** permissions in workspace
5. **Verify file paths** are correct for workflow files