# Configuration Reference

Complete reference for configuring VC4PM Server (npm global package).

## Quick Setup

### Installation & Configuration

1. Install globally:
```bash
npm install -g @vc4pm/server
```

2. Create project configuration:
```bash
mkdir .vc4pm
# Copy example and customize
cp .vc4pm/config.example.json .vc4pm/config.json
```

## Configuration Structure

Single configuration file: `.vc4pm/config.json`

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
    "requiresValidation": ["done"]
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
        "name": "Linear", 
        "type": "premium",
        "enabled": false,
        "config": {
          "apiKey": "your_linear_api_key_here",
          "teamId": "your_linear_team_id_here"
        }
      },
      "github": {
        "name": "GitHub Projects",
        "type": "enterprise",
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

##### Linear (Premium)
Pro tier provider (coming soon):

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

##### GitHub Projects (Enterprise)
Enterprise tier provider (coming soon):

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

## Multiple Project Support

Each project can have its own `.vc4pm/config.json` with different:

- Task providers (different Notion databases, Linear teams, etc.)
- Workflow configurations (custom statuses, transitions)
- Task types and validation rules

The global `vc4pm` command automatically detects and uses the project-local configuration.