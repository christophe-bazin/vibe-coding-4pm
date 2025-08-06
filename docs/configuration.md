# Configuration Reference

Complete reference for configuring the provider-aware Notion Vibe Coding MCP server.

## Quick Setup

### MCP Configuration
Copy the example configuration:

```bash
cp mcp-config.example.json .claude/mcp-config.json
```

## MCP Configuration Structure

Standard MCP server configuration format:

```json
{
  "mcpServers": {
    "vibe-coding-4pm": {
      "command": "node",
      "args": ["./vibe-coding-4pm/dist/server.js"],
      "env": {
        "NOTION_API_KEY": "your_notion_integration_token_here",
        "NOTION_DATABASE_ID": "your_notion_database_id_here",
        "WORKFLOW_CONFIG": {
          // Configuration object (see example file)
        }
      }
    }
  }
}
```

## Environment Variables

### Required Variables

#### `WORKFLOW_CONFIG`
- **Type**: JSON Object 
- **Description**: Complete workflow configuration
- **Note**: See example configuration file for complete structure

#### `PROVIDERS_CONFIG`
- **Type**: JSON Object
- **Description**: Multi-provider configuration for task management platforms
- **Default**: Notion only (enabled)
- **Available Providers**: notion (core), linear (premium), github (enterprise)

## Workflow Configuration Object

### `statusMapping`

Maps internal status keys (camelCase) to Notion display labels:

```json
{
  "statusMapping": {
    "notStarted": "Not Started",
    "inProgress": "In Progress",
    "test": "Test",
    "done": "Done"
  }
}
```

**Rules:**
- Keys must be camelCase (internal representation)
- Values must match exactly your Notion select options
- All four statuses are required
- Case-sensitive matching

### `transitions`

Defines valid status transitions:

```json
{
  "transitions": {
    "notStarted": ["inProgress"],
    "inProgress": ["test"],
    "test": ["done", "inProgress"],
    "done": ["test"]
  }
}
```

**Rules:**
- Keys are internal status keys (camelCase)
- Values are arrays of allowed next statuses
- Must form a valid state machine
- AI cannot transition to "done" (human-only)

### `taskTypes`

Available task types for creation:

```json
{
  "taskTypes": ["Feature", "Bug", "Refactoring"]
}
```

**Rules:**
- Must match Notion select options exactly
- Case-sensitive
- Can add custom types as needed

### `defaultStatus`

Initial status for new tasks:

```json
{
  "defaultStatus": "notStarted"
}
```

**Rules:**
- Must be a valid status key from statusMapping
- Typically "notStarted"

### `requiresValidation`

Statuses that require human approval:

```json
{
  "requiresValidation": ["done"]
}
```

**Rules:**
- Array of status keys requiring human intervention
- AI cannot transition tasks to these statuses
- Typically includes "done"

## Providers Configuration Object

### Basic Structure

```json
{
  "PROVIDERS_CONFIG": {
    "default": "notion",
    "available": {
      "notion": {
        "name": "Notion", 
        "type": "core",
        "enabled": true,
        "config": {
          "apiKey": "your_notion_api_key",
          "databaseId": "your_notion_database_id"
        }
      },
      "linear": {
        "name": "Linear",
        "type": "premium", 
        "enabled": false,
        "config": {
          "apiKey": "LINEAR_API_KEY",
          "teamId": "LINEAR_TEAM_ID"
        }
      }
    }
  }
}
```

### Configuration Fields

#### `default`
- **Type**: String
- **Description**: Default provider to use when no provider is specified
- **Required**: Yes
- **Example**: `"notion"`

#### `available`
- **Type**: Object
- **Description**: Available providers and their configurations
- **Structure**: `{ [providerName]: ProviderConfig }`

### Provider Configuration

Each provider has the following structure:

- **`name`**: Display name for the provider
- **`type`**: Provider tier (`core`, `premium`, `enterprise`)
- **`enabled`**: Whether the provider is active
- **`config`**: Provider-specific configuration (credentials, etc.)

### Provider Types

- **`core`**: Free providers (included by default)
- **`premium`**: Paid providers (requires subscription)
- **`enterprise`**: Enterprise-only providers

## Template System

The system uses templates stored in the `templates/` directory:

```
templates/
├── task/                        # Task creation templates
│   ├── feature.md               # Feature task template
│   ├── bug.md                   # Bug task template
│   └── refactoring.md           # Refactoring task template
└── summary/                     # Summary templates
    └── summary.md               # Summary template
```

**Templates are:**
- Intelligently adapted by AI based on task description
- Fully customizable - create your own templates
- Stored as markdown files for easy editing

### Template Variables

Templates support variables that get replaced with actual status labels:

### Available Templates

- `{{status_notStarted}}` → "Not Started"
- `{{status_inProgress}}` → "In Progress"  
- `{{status_test}}` → "Test"
- `{{status_done}}` → "Done"

### Example Usage in Workflow Files

```markdown
# Move task from {{status_notStarted}} to {{status_inProgress}}

When implementing a task:
1. Change status from "{{status_notStarted}}" to "{{status_inProgress}}"
2. Complete implementation
3. Move to "{{status_test}}" for validation
4. Human marks as "{{status_done}}"
```

## Notion Database Requirements

Your Notion database must have these properties:

### Required Properties

#### Status Property
- **Name**: "Status" (exact match)
- **Type**: Select
- **Options**: Must match your statusMapping values exactly
  - "Not Started"
  - "In Progress"  
  - "Test"
  - "Done"

#### Type Property
- **Name**: "Type" (exact match)
- **Type**: Select
- **Options**: Must match your taskTypes exactly
  - "Feature"
  - "Bug"
  - "Refactoring"

### Optional Properties

You can add additional properties as needed:
- Priority (Select)
- Assignee (Person)
- Due Date (Date)
- Tags (Multi-select)

## Configuration Examples

### Complete Configuration (Required)

**Note**: `WORKFLOW_CONFIG` is mandatory. No defaults are provided.

#### MCP Configuration Example

```json
{
  "mcpServers": {
    "vibe-coding-4pm": {
      "command": "node", 
      "args": ["./vibe-coding-4pm/dist/server.js"],
      "env": {
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
        },
        "PROVIDERS_CONFIG": {
          "default": "notion",
          "available": {
            "notion": {
              "name": "Notion",
              "type": "core",
              "enabled": true,
              "config": {
                "apiKey": "secret_your_key_here",
                "databaseId": "your_database_id_here"
              }
            },
            "linear": {
              "name": "Linear",
              "type": "premium",
              "enabled": false,
              "config": {
                "apiKey": "your_linear_api_key",
                "teamId": "your_linear_team_id"
              }
            },
            "github": {
              "name": "GitHub Projects",
              "type": "enterprise", 
              "enabled": false,
              "config": {
                "token": "your_github_token",
                "org": "your_github_org"
              }
            }
          }
        }
      }
    }
  }
}
```

The `WORKFLOW_CONFIG` object structure (see example file for complete configuration).

### Custom Status Names

```json
{
  "WORKFLOW_CONFIG": {
    "statusMapping": {
      "notStarted": "Backlog",
      "inProgress": "Development", 
      "test": "Review",
      "done": "Complete"
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
```

### Extended Task Types

```json
{
  "WORKFLOW_CONFIG": {
    "statusMapping": {
      "notStarted": "Not Started",
      "inProgress": "In Progress",
      "test": "Test", 
      "done": "Done"
    },
    "taskTypes": ["Feature", "Bug", "Refactoring", "Documentation", "Research", "Spike"],
    "transitions": {
      "notStarted": ["inProgress"],
      "inProgress": ["test"],
      "test": ["done", "inProgress"],
      "done": ["test"]
    },
    "defaultStatus": "notStarted",
    "requiresValidation": ["done"]
  }
}
```

### Multi-Environment Setup

Different configurations for different environments:

#### Development Environment
```json
{
  "NOTION_DATABASE_ID": "dev_database_id_here",
  "WORKFLOW_CONFIG": {
    "taskTypes": ["Feature", "Bug", "Refactoring", "Experiment"]
  }
}
```

#### Production Environment  
```json
{
  "NOTION_DATABASE_ID": "prod_database_id_here", 
  "WORKFLOW_CONFIG": {
    "taskTypes": ["Feature", "Bug", "Hotfix"],
    "requiresValidation": ["done", "test"]
  }
}
```

## Configuration Validation

The server validates configuration on startup:

### Common Validation Errors

1. **Missing Required Fields**
   ```
   Error: NOTION_API_KEY environment variable is required
   ```

2. **Invalid Status Mapping**
   ```
   Error: statusMapping must contain all required statuses: notStarted, inProgress, test, done
   ```

3. **Invalid Transitions**
   ```
   Error: Invalid transition from 'notStarted' to 'done' - not allowed
   ```

4. **Missing Workflow Files**
   ```
   Error: Workflow file not found: ./workflows/task-creation.md
   ```

### Validation Checklist

Before starting the server, verify:

- ✅ NOTION_API_KEY is valid and starts with "secret_"
- ✅ NOTION_DATABASE_ID is 32 characters
- ✅ Database is shared with your Notion integration
- ✅ Database has "Status" and "Type" properties
- ✅ Status options match statusMapping values
- ✅ Type options match taskTypes array
- ✅ All workflow files exist at specified paths
- ✅ Transitions form a valid state machine

## Required Configuration

`WORKFLOW_CONFIG` must always be provided. The server will fail to start without it.

**All fields are mandatory:**
- `statusMapping` - Must contain exactly: notStarted, inProgress, test, done
- `transitions` - Must define valid state transitions  
- `taskTypes` - Array of available task types
- `defaultStatus` - Initial status for new tasks
- `requiresValidation` - Statuses requiring human approval

## Best Practices

### Naming Conventions

- **Internal status keys**: camelCase (notStarted, inProgress)
- **Notion labels**: Title Case ("Not Started", "In Progress")
- **Task types**: Title Case ("Feature", "Bug Fix")

### Configuration Management

- Keep configuration in version control
- Use environment-specific configurations
- Document custom statuses and types
- Test configuration changes thoroughly

### Security

- Never commit API keys to version control
- Use secure methods to share keys with team
- Rotate API keys periodically
- Limit integration permissions to necessary databases

### Maintenance

- Regular backup of configuration
- Document any customizations
- Test after Notion schema changes
- Monitor for configuration validation errors