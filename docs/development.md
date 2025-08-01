# Development Guide

Guide for contributing to and customizing the Notion Vibe Coding MCP server.

## Project Structure

```
notion-vibe-coding/
├── src/
│   ├── server.ts                     # Main MCP server entry point
│   ├── interfaces/
│   │   └── TaskProvider.ts           # Provider abstraction interface
│   ├── adapters/
│   │   └── NotionAPIAdapter.ts       # Notion API implementation
│   ├── services/
│   │   ├── TaskService.ts            # High-level task operations
│   │   ├── TodoService.ts            # Todo management and analysis  
│   │   ├── ExecutionService.ts       # Task execution workflows
│   │   ├── WorkflowService.ts        # Template and guidance management
│   │   └── ResponseFormatter.ts      # Standardized output formatting
│   ├── models/
│   │   ├── Task.ts                   # Task type definitions
│   │   ├── Todo.ts                   # Todo type definitions
│   │   └── Workflow.ts               # Workflow type definitions
├── workflows/
│   ├── task-creation.md              # Task type templates and AI guidance
│   ├── task-update.md                # Update guidance
│   └── task-execution.md             # Execution guidance
├── docs/                             # Documentation
├── mcp.js                            # CLI wrapper for testing
├── mcp-config.example.json           # Example MCP configuration
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

### Service Layer

#### `TaskService.ts`
- High-level task operations
- Task creation, updates, and status management
- Validation against workflow configuration
- Status transition recommendations

#### `TodoService.ts`
- Todo extraction from Notion content
- Completion statistics and progress analysis
- Batch todo update operations
- Progress insights and recommendations

#### `ExecutionService.ts`
- Task execution workflows
- Auto, step-by-step, and batch execution modes
- Progress tracking and status updates
- Workflow state management

#### `WorkflowService.ts`
- Workflow template management
- Markdown guidance loading and processing
- Template variable substitution
- File caching for performance

#### `ResponseFormatter.ts`
- Standardized response formatting for MCP tools
- Consistent error and success message formatting
- Status and metadata display formatting

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

1. **MCP Request** → `server.ts` handles tool request
2. **Service Layer** → Appropriate service processes request
3. **Provider** → `NotionAPIAdapter` handles Notion API calls
4. **Response** → `ResponseFormatter` creates standardized output

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