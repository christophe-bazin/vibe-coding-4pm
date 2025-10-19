# Coding Standards

## Code Style

### Modern JavaScript/TypeScript
- Use modern ES6+ syntax and TypeScript features
- Prefer `async/await` over Promise chains
- Use object/array destructuring when appropriate
- Write self-documenting code with clear variable names

### Imports and Modules
- Use ES6 imports with `.js` extension for TypeScript compatibility
- Group imports: Node.js built-ins, third-party, local modules
- Use explicit imports over wildcards

```typescript
import { readFileSync } from 'fs';
import { Client } from '@notionhq/client';
import { ConfigLoader } from './config-loader.js';
```

## Commenting Guidelines

Add comments for:
- **File purpose**: Brief description at the top of each file
- **Complex logic**: Explain non-obvious algorithms or business rules
- **Configuration**: Document config file structure and options
- **API integration**: Notion API quirks and limitations
- **Security considerations**: Token handling, validation logic

### Comment Style
```typescript
/**
 * Loads workflow configuration from markdown files
 * and provides simple status transition validation
 */
export class ConfigLoader {
  // Cache workflows to avoid repeated file reads
  private workflows: Map<string, string> = new Map();
}
```

## Configuration Management

- **Never hardcode values** - use config files
- **Explicit configuration** - fail fast on missing required config
- **Per-project config** - each project has `.vc4pm/config.json` with credentials
- **Validation** - validate config on startup
- **MCP stdio transport** - server uses stdio (not HTTP) for MCP communication

```typescript
// Good
const config = this.loadConfig();
if (!config.board.statuses.length) {
  throw new Error('Board statuses are required');
}

// Bad
const statuses = ['Not Started', 'In Progress']; // hardcoded
```

## Error Handling

- **Specific error messages** with actionable information
- **Include context** - what was being attempted when error occurred
- **No generic errors** - avoid "Something went wrong"
- **Proper error types** - use appropriate Error subclasses

```typescript
// Good
throw new Error(`Invalid transition from ${currentStatus} to ${newStatus}. Allowed: ${allowedTransitions.join(', ')}`);

// Bad
throw new Error('Invalid transition');
```

## API Design

### Method Naming
- Use clear, descriptive names
- Follow TypeScript/JavaScript conventions
- Be consistent across similar methods

### Return Values
- Return standardized objects for consistency
- Include success/error indicators
- Provide meaningful data structures

```typescript
// Good
async updateTaskStatus(taskId: string, newStatus: string): Promise<void> {
  // Clear purpose, throws on error
}

// Avoid
async doUpdate(id: string, status: string): Promise<any> {
  // Unclear purpose, any return type
}
```

## Security

### Input Validation
- **Validate all inputs** - especially user-provided URLs and IDs
- **Type checking** - use TypeScript strictly
- **Length limits** - prevent excessive input sizes
- **Sanitize data** - especially when constructing API calls

### Secret Management
- **Never log tokens** or sensitive data
- **Store API keys in config.json** (per-project configuration)
- **Validate credentials** on server startup

```typescript
// Good
if (!config.providers.available.notion.config.apiKey) {
  throw new Error('Notion API key is required in .vc4pm/config.json');
}

// Bad
console.log('API Key:', apiKey); // Never log secrets
```

## File Organization

### Directory Structure
```
src/
├── server.ts                    # Pure MCP router (< 100 lines)
├── adapters/
│   └── NotionAPIAdapter.ts      # Notion API integration
├── interfaces/
│   └── TaskProvider.ts          # Provider abstraction
├── models/
│   ├── Task.ts                  # Task type definitions
│   ├── Todo.ts                  # Todo type definitions
│   └── Workflow.ts              # Execution + configuration types
├── services/core/               # Core business services
│   ├── CreationService.ts       # Task creation + templates
│   ├── UpdateService.ts         # Updates + auto-callback system
│   └── ExecutionService.ts      # Orchestration + continuation
├── services/shared/             # Shared utilities
│   ├── StatusService.ts         # Status management
│   ├── ValidationService.ts     # Input validation
│   └── ResponseFormatter.ts     # MCP response formatting
└── types/
    └── Errors.ts                # Custom error types
```

### File Naming
- Use kebab-case for files
- Use descriptive names that match their purpose
- Keep related functionality together

## Testing Considerations

- Write testable code with dependency injection
- Separate pure functions from side effects
- Mock external dependencies (Notion API)
- Test error conditions and edge cases

## Documentation

- Keep README up to date with API changes
- Document configuration options clearly
- Provide examples for complex usage
- Update workflow markdown files when behavior changes