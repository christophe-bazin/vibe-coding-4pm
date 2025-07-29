# Configuration Reference

Complete reference for configuring the Notion Vibe Coding MCP server.

## Quick Setup

### Claude Desktop
Use the installation script to generate the correct configuration:

```bash
./install-claude-desktop.sh
```

This automatically converts the object format to the JSON string format required by Claude Desktop.

### Claude Code
Copy the example configuration:

```bash
cp mcp-config.example.json .claude/mcp-config.json
```

## MCP Configuration Structure

The configuration differs between Claude Desktop and Claude Code:

### Claude Code Format (Object)
```json
{
  "mcpServers": {
    "notion-vibe-coding": {
      "command": "node",
      "args": ["./notion-vibe-coding/dist/server.js"],
      "env": {
        "NOTION_API_KEY": "secret_your_notion_integration_token_here",
        "NOTION_DATABASE_ID": "your_notion_database_id_here",
        "WORKFLOW_CONFIG": {
          // Configuration object
        }
      }
    }
  }
}
```

### Claude Desktop Format (JSON String)
```json
{
  "mcpServers": {
    "notion-vibe-coding": {
      "command": "node",
      "args": ["./notion-vibe-coding/dist/server.js"],
      "env": {
        "NOTION_API_KEY": "secret_your_notion_integration_token_here",
        "NOTION_DATABASE_ID": "your_notion_database_id_here",
        "WORKFLOW_CONFIG": "{\"statusMapping\":{...},\"transitions\":{...}}"
      }
    }
  }
}
```

💡 **Use the installation script** to avoid manual JSON string conversion errors.

## Environment Variables

### Required Variables

#### `NOTION_API_KEY`
- **Type**: String
- **Description**: Your Notion integration token
- **Format**: `secret_*` (starts with "secret_")
- **Example**: `"secret_abc123def456ghi789"`

#### `NOTION_DATABASE_ID`
- **Type**: String
- **Description**: The Notion database ID where tasks will be created/managed
- **Format**: UUID without dashes (32 characters)
- **Example**: `"abc123def456ghi789jkl012mno345pq"`

#### `WORKFLOW_CONFIG`
- **Type**: JSON String (for Claude Desktop) or Object (for CLI/development)
- **Description**: Complete workflow configuration  
- **Note**: Claude Desktop MCP requires JSON string format, CLI wrapper accepts both

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

### `workflowFiles`

Paths to workflow guidance files:

```json
{
  "workflowFiles": {
    "creation": "./notion-vibe-coding/workflows/task-creation.md",
    "update": "./notion-vibe-coding/workflows/task-update.md",
    "execution": "./notion-vibe-coding/workflows/task-execution.md"
  }
}
```

**Rules:**
- Relative paths from the working directory
- All three workflow types are required
- Files must exist and be readable

## Template System

Workflow files support template variables that get replaced with actual status labels:

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

#### Claude Desktop Format (JSON String)

```json
{
  "mcpServers": {
    "notion-vibe-coding": {
      "command": "node", 
      "args": ["path/to/notion-vibe-coding/dist/server.js"],
      "env": {
        "NOTION_API_KEY": "secret_your_key_here",
        "NOTION_DATABASE_ID": "your_database_id_here",
        "WORKFLOW_CONFIG": "{\"statusMapping\":{\"notStarted\":\"Not Started\",\"inProgress\":\"In Progress\",\"test\":\"Test\",\"done\":\"Done\"},\"transitions\":{\"notStarted\":[\"inProgress\"],\"inProgress\":[\"test\"],\"test\":[\"done\",\"inProgress\"],\"done\":[\"test\"]},\"taskTypes\":[\"Feature\",\"Bug\",\"Refactoring\"],\"defaultStatus\":\"notStarted\",\"requiresValidation\":[\"done\"],\"workflowFiles\":{\"creation\":\"path/to/workflows/task-creation.md\",\"update\":\"path/to/workflows/task-update.md\",\"execution\":\"path/to/workflows/task-execution.md\"}}"
      }
    }
  }
}
```

#### CLI/Development Format (Object)

For reference, the equivalent object structure:

```json
{
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
  "requiresValidation": ["done"],
  "workflowFiles": {
    "creation": "path/to/workflows/task-creation.md",
    "update": "path/to/workflows/task-update.md",
    "execution": "path/to/workflows/task-execution.md"
  }
}
```

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
    "requiresValidation": ["done"],
    "workflowFiles": {
      "creation": "./notion-vibe-coding/workflows/task-creation.md",
      "update": "./notion-vibe-coding/workflows/task-update.md",
      "execution": "./notion-vibe-coding/workflows/task-execution.md"
    }
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
    "requiresValidation": ["done"],
    "workflowFiles": {
      "creation": "./notion-vibe-coding/workflows/task-creation.md",
      "update": "./notion-vibe-coding/workflows/task-update.md",
      "execution": "./notion-vibe-coding/workflows/task-execution.md"
    }
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
- `workflowFiles` - Paths to all three workflow guidance files

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