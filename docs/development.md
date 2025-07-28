# Development Guide

Guide for contributing to and customizing the Notion Vibe Coding MCP server.

## Project Structure

```
notion-vibe-coding/
├── src/
│   ├── server.ts                     # Main MCP server
│   ├── simple-progress-tracker.ts    # Core workflow logic
│   ├── config-loader.ts              # Configuration management
│   ├── todo-manager.ts               # Todo parsing and updates
│   ├── progress-calculator.ts        # Progress and auto-progression logic
│   ├── utils.ts                      # Utility functions
│   └── types.ts                      # TypeScript definitions
├── workflows/
│   ├── task-creation.md              # AI guidance for task creation
│   ├── task-update.md                # AI guidance for task updates
│   └── task-execution.md             # AI guidance for task execution
├── docs/                             # Documentation
├── mcp-config.example.json           # Example MCP configuration
├── package.json
├── tsconfig.json
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

```bash
# Run with your test Notion database
npm start

# Test MCP tools manually via Claude Code
```

## Architecture Overview

### Core Components

#### `server.ts`
- Main MCP server implementation
- Tool registration and request handling  
- Environment variable parsing
- Error handling and response formatting

#### `simple-progress-tracker.ts`
- Core workflow management
- Status transitions and validation
- Notion API interactions
- Workflow guidance retrieval

#### `config-loader.ts`
- Configuration parsing and validation
- Status mapping between internal keys and Notion labels
- Template variable processing
- Workflow file loading

#### `todo-manager.ts`
- Todo extraction from Notion pages
- Todo completion tracking
- Batch updates for efficiency
- Smart text matching

#### `progress-calculator.ts`
- Auto-progression logic based on todo completion
- Progress recommendations
- Status transition calculations

### Data Flow

1. **Tool Request** → `server.ts` handles MCP request
2. **Configuration** → `config-loader.ts` provides settings
3. **Workflow Logic** → `simple-progress-tracker.ts` manages operations
4. **Notion API** → Direct calls to Notion for data persistence
5. **Response** → Structured JSON returned to Claude

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
      // ... other parameters
    },
    required: ['param1']
  }
}
```

2. **Add request handler**:
```typescript
case 'my_new_tool':
  return await this.handleMyNewTool(args as { param1: string });
```

3. **Implement handler method**:
```typescript
private async handleMyNewTool(args: { param1: string }) {
  try {
    // Tool implementation
    const result = await this.tracker.myNewFeature(args.param1);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: result,
          message: 'Tool executed successfully'
        }, null, 2)
      }]
    };
  } catch (error) {
    throw new Error(`Failed to execute tool: ${error}`);
  }
}
```

4. **Add business logic** to appropriate class:
```typescript
// In simple-progress-tracker.ts or create new service class
async myNewFeature(param: string): Promise<any> {
  // Implementation
}
```

### Adding New Task Types

1. **Update default configuration** in `server.ts`:
```typescript
taskTypes: ["Feature", "Bug", "Refactoring", "Documentation"]
```

2. **Add template logic** in `formatTaskContent()`:
```typescript
} else if (taskType === 'Documentation') {
  template = `## Documentation Objective
${description}

## Scope
[What needs to be documented]

## Acceptance Criteria
- [ ] Documentation written
- [ ] Examples provided
- [ ] Review completed

## Content Plan
- [ ] Research existing information
- [ ] Create structure
- [ ] Write content
- [ ] Review and revise`;
}
```

3. **Update workflow guidance** in `workflows/task-creation.md`:
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

### Customizing Workflows

Workflow files are markdown templates with variable substitution:

1. **Edit workflow files** in `workflows/` directory
2. **Use template variables**: `{{status_notStarted}}`, `{{status_inProgress}}`, etc.
3. **Test with** `get_workflow_guidance` tool
4. **Restart server** to reload changes

Example workflow customization:
```markdown
# Custom Workflow: Feature Development

## Phase 1: Planning ({{status_notStarted}})
- Analyze requirements thoroughly
- Create detailed technical design
- Identify potential risks

## Phase 2: Development ({{status_inProgress}})
- Implement in small, testable increments
- Write comprehensive tests
- Document important decisions

## Phase 3: Validation ({{status_test}})
- Complete functional testing
- Performance validation
- Security review
```

## Configuration Customization

### Status Mapping

Internal status keys use camelCase, Notion labels can be customized:

```json
{
  "statusMapping": {
    "notStarted": "Backlog",        // Custom label
    "inProgress": "In Development", // Custom label  
    "test": "Code Review",          // Custom label
    "done": "Completed"            // Custom label
  }
}
```

### Transitions

Define allowed status changes:

```json
{
  "transitions": {
    "notStarted": ["inProgress"],           // Only one path forward
    "inProgress": ["test", "notStarted"],   // Can go back to backlog
    "test": ["done", "inProgress"],         // Can return to development
    "done": []                              // Terminal state
  }
}
```

### Auto-Progression

Control when tasks automatically change status:

```typescript
// In progress-calculator.ts
const autoProgressionThresholds = {
  inProgress: 1,    // 1% completion triggers "In Progress"
  test: 100         // 100% completion triggers "Test"
};
```

## Testing

### Manual Testing

1. **Create test database** in Notion with required properties
2. **Configure test environment**:
```json
{
  "NOTION_DATABASE_ID": "test_database_id_here"
}
```

3. **Test each tool** systematically:
```bash
# Test task creation
create_task({ title: "Test Task", taskType: "Feature", description: "Test" })

# Test workflow initialization  
start_task_workflow({ taskUrl: "notion_url", workflowType: "feature" })

# Test todo progression
progress_todo({ taskId: "test_id", todoText: "Test todo", completed: true })
```

### Integration Testing

1. **Test with real Notion workspace**
2. **Verify status transitions work correctly**
3. **Test error handling with invalid inputs**
4. **Check template variable substitution**

### Error Testing

Test common error scenarios:
- Invalid Notion URLs
- Missing database permissions
- Network connectivity issues
- Malformed configuration

## Code Standards

### TypeScript

- Use strict type checking
- Define interfaces for all data structures
- Use async/await for promises
- Handle errors explicitly

### Error Handling

```typescript
try {
  const result = await this.notion.pages.retrieve({ page_id: taskId });
  return result;
} catch (error) {
  if (error.code === 'object_not_found') {
    throw new Error(`Task not found: ${taskId}`);
  }
  throw new Error(`Failed to retrieve task: ${error.message}`);
}
```

### Logging

Use console.error for errors, console.warn for warnings:
```typescript
console.error('Failed to update task status:', error);
console.warn('Todo not found, skipping:', todoText);
```

### Configuration Validation

Always validate configuration on startup:
```typescript
private validateConfig(config: WorkflowConfig): void {
  if (!config.statusMapping) {
    throw new Error('statusMapping is required');
  }
  
  const requiredStatuses = ['notStarted', 'inProgress', 'test', 'done'];
  for (const status of requiredStatuses) {
    if (!config.statusMapping[status]) {
      throw new Error(`Missing status mapping: ${status}`);
    }
  }
}
```

## Contributing

### Pull Request Process

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/my-new-feature`
3. **Make changes** following code standards
4. **Test thoroughly** with your Notion setup
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
- Verify Notion API usage is correct
- Ensure backward compatibility
- Test with different configurations

## Deployment

### Building for Production

```bash
npm run build
```

### Distribution

The built server (`dist/server.js`) can be:
- Shared as a git repository
- Packaged as npm module
- Distributed as standalone executable

### Version Management

Use semantic versioning:
- Major: Breaking changes to configuration or API
- Minor: New features, backward compatible
- Patch: Bug fixes, no API changes

## Troubleshooting Development Issues

### Common Problems

**TypeScript compilation errors:**
- Check import paths are correct
- Verify all types are properly defined
- Ensure async functions return Promise types

**MCP registration issues:**
- Verify tool schemas are valid JSON Schema
- Check parameter names match between schema and handler
- Ensure all required parameters are marked in schema

**Notion API errors:**
- Verify integration permissions
- Check database schema matches expectations
- Test API calls with manual requests

**Configuration problems:**
- Validate JSON syntax in config files
- Check file paths are relative to correct directory
- Ensure all required configuration fields are present

### Debugging Tips

1. **Add logging** to trace execution flow
2. **Use TypeScript strict mode** to catch type errors early  
3. **Test configuration** with minimal setup first
4. **Check Notion integration** permissions in workspace
5. **Verify file paths** are correct for workflow files