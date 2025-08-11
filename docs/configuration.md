# Configuration Reference

Complete reference for configuring VC4PM MCP Server v3.0 with per-project configuration.

## Quick Setup

### Installation & Configuration

1. Install MCP server globally:
```bash
npm install -g @vc4pm/mcp-server
```

2. Create project configuration:
```bash
mkdir .vc4pm
touch .vc4pm/config.json
# Edit with your provider credentials
```

3. Add MCP server to your IDE:
```bash
# Claude Code
claude mcp add vc4pm "node" "@vc4pm/mcp-server/dist/server.js"
```

## Per-Project Configuration

Each project requires its own `.vc4pm/config.json` file. The MCP server automatically loads configuration from the project directory where it's running.

```json
{
  "workflow": {
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
    "templates": {
      "override": false,
      "taskPath": ".vc4pm/templates/task/",
      "summaryPath": ".vc4pm/templates/summary/"
    }
  },
  "providers": {
    "default": "notion",
    "available": {
      "notion": {
        "name": "Notion",
        "type": "core",
        "enabled": true,
        "config": {
          "apiKey": "your_notion_integration_token_here",
          "databaseId": "your_notion_database_id_here"
        }
      },
      "linear": {
        "enabled": false,
        "config": {
          "apiKey": "your_linear_api_key_here",
          "teamId": "your_linear_team_id_here"
        }
      },
      "github": {
        "enabled": false,
        "config": {
          "token": "your_github_personal_access_token_here",
          "org": "your_github_organization_here"
        }
      }
    }
  }
}
```

## Configuration Sections

### Workflow Configuration

#### `statusMapping` 
Maps internal status keys to display labels in your task provider:

- **notStarted**: Task has not begun
- **inProgress**: Task is actively being worked on
- **test**: Task implementation complete, ready for testing/review
- **done**: Task fully completed and tested

#### `transitions`
Defines allowed status changes. Each key shows which statuses can be transitioned to:

```json
{
  "notStarted": ["inProgress"],     // Can only start work
  "inProgress": ["test"],           // Can move to testing
  "test": ["done", "inProgress"],   // Can complete or return to work
  "done": ["test"]                  // Can reopen for testing
}
```

#### `taskTypes`
Available task types for classification:

- **Feature**: New functionality or enhancements
- **Bug**: Issue fixes and corrections  
- **Refactoring**: Code improvements and restructuring

#### `templates`
Override global templates with project-specific ones:

```json
"templates": {
  "override": false,
  "taskPath": ".vc4pm/templates/task/",
  "summaryPath": ".vc4pm/templates/summary/"
}
```

**Options:**
- `override`: Set to `true` to use custom templates instead of global ones
- `taskPath`: Directory for task templates (optional, defaults to `.vc4pm/templates/task/`)
- `summaryPath`: Directory for summary templates (optional, defaults to `.vc4pm/templates/summary/`)

**Template Files:**
When `override: true`, create these files:
```
.vc4pm/templates/task/feature.md
.vc4pm/templates/task/bug.md
.vc4pm/templates/task/refactoring.md
.vc4pm/templates/summary/summary.md
```

**Behavior:**
- If custom template exists → uses custom template
- If custom template missing → falls back to global template  
- Templates use the same markdown format as global ones
- Paths can be customized independently for tasks and summaries

### Provider Configuration

#### `providers.default`
The default provider to use for new tasks.

#### `providers.available`
Configuration for each task management provider:

##### Notion (Core)
Free tier provider, fully supported:

```json
{
  "notion": {
    "enabled": true,
    "config": {
      "apiKey": "your_notion_integration_token_here",
      "databaseId": "your_notion_database_id_here"
    }
  }
}
```

**Setup Steps:**
1. Create a [Notion integration](https://www.notion.so/my-integrations)
2. Create a database with Status (Select) and Type (Select) properties
3. Share the database with your integration
4. Copy the integration token and database ID

##### Linear (Future)
Linear integration (coming soon):

```json
{
  "linear": {
    "enabled": false,
    "config": {
      "apiKey": "your_linear_api_key_here", 
      "teamId": "your_linear_team_id_here"
    }
  }
}
```

##### GitHub Projects (Future)
GitHub Projects integration (coming soon):

```json
{
  "github": {
    "enabled": false,
    "config": {
      "token": "your_github_personal_access_token_here",
      "org": "your_github_organization_here"
    }
  }
}
```

## Configuration Validation

The server validates configuration on startup:

- **Required sections**: `workflow` and `providers` must be present
- **Provider validation**: At least one provider must be enabled
- **Credential validation**: Enabled providers must have valid config
- **Workflow validation**: Status mappings and transitions must be consistent

## Project Isolation

### Per-Project Benefits

Each project maintains complete isolation:

- **Separate Credentials**: Each project uses its own API keys and database IDs
- **Independent Workflows**: Different status mappings and transitions per project
- **Custom Templates**: Project-specific template overrides when enabled
- **Provider Flexibility**: Different projects can use different task management systems

### Multi-Project Usage

```bash
# Project A - Uses Notion
cd project-a
ls .vc4pm/config.json  # Notion configuration
# Use MCP tools → operates on Project A's Notion database

# Project B - Uses different Notion database
cd project-b  
ls .vc4pm/config.json  # Different Notion database
# Use MCP tools → operates on Project B's Notion database
```

### Configuration Loading

The MCP server loads configuration from the current working directory:

1. Looks for `.vc4pm/config.json` in current directory
2. Validates configuration structure and required fields
3. Initializes provider with project-specific credentials
4. All MCP tools operate within this project context

### Security Benefits

- **Local Storage**: API keys stored locally per project, never shared
- **No Global State**: No global configuration or credentials
- **Project Scoped**: Each project accesses only its own resources
- **Team Isolation**: Different teams can use different providers independently