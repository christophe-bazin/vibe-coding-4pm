# Commit Conventions

## Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

## Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, missing semicolons, etc.)
- **refactor**: Code refactoring without functional changes
- **test**: Adding or updating tests
- **chore**: Maintenance tasks, dependency updates
- **config**: Configuration file changes

## Scopes

- **server**: MCP server functionality
- **config**: Configuration management
- **workflows**: Workflow markdown files
- **tracker**: Progress tracking logic
- **utils**: Utility functions
- **types**: Type definitions
- **docs**: Documentation

## Examples

### Features
```
feat(server): add get_task_info MCP tool

Add new tool to retrieve current task status and available transitions.
Helps AI understand current state before making changes.

feat(workflows): add execution context guidance

Add section explaining new task vs resumption vs modified task scenarios
to help AI choose appropriate implementation approach.
```

### Bug Fixes
```
fix(tracker): prevent AI from transitioning to Terminé

Update config to remove "En cours" -> "Terminé" transition.
AI must now use "A tester" state for human validation.

fix(config): handle missing workflow files gracefully

Throw descriptive error when workflow markdown files are missing
instead of failing silently with undefined behavior.
```

### Documentation
```
docs(readme): update with simplified architecture

Reflect new config-driven approach and removed complex features.
Add section on AI restrictions and workflow separation.

docs(workflows): remove excessive bold formatting

Clean up markdown files to be more readable and less "criard".
Maintain emphasis only where truly needed.
```

### Configuration
```
config(board): restrict AI status transitions

Remove ability for AI to directly close tasks.
Require human validation for "Terminé" status.

config(workflows): add execution summary templates

Provide structured templates for AI to document implementation
and generate test plans before status transitions.
```

### Refactoring
```
refactor(server): simplify to config-based approach

Remove complex FlexibleWorkflowConfig and programmatic customization.
Replace with simple JSON config and markdown workflow files.

- Remove progress-tracker.ts (complex version)
- Add simple-progress-tracker.ts
- Update server.ts to use new approach
```

### Chores
```
chore: clean up obsolete files

Remove unused files from complex approach:
- workflow-examples.ts
- french-board-example.ts  
- task-analyzer.ts
- example-usage.ts

chore(deps): update @notionhq/client to latest

Update Notion client for improved API compatibility.
```

## Message Guidelines

### Subject Line
- Use imperative mood ("add", not "added" or "adds")
- Keep under 50 characters
- Don't end with a period
- Be specific about what changed

### Body
- Explain the "why" not just the "what"
- Reference issues or discussions when relevant
- Break long lines at 72 characters
- Use bullet points for multiple changes

### Footer
- Reference breaking changes: `BREAKING CHANGE: description`
- Close issues: `Closes #123` or `Fixes #456`
- Reference related work: `Related to #789`

## Special Cases

### Breaking Changes
```
feat(config)!: add required validation field to config

BREAKING CHANGE: Config format changed, new required field added.
Update your config.json file to include:
- Add "requiresValidation" array to board configuration
- Example: "requiresValidation": ["Done"]
- Server will fail to start without this field
```

### Multiple Changes
```
feat(workflows): improve AI guidance

- Add execution context section to help AI understand task state
- Remove excessive bold formatting for better readability
- Add clear templates for summary and test generation
- Specify AI restrictions around status transitions
```

### Hotfixes
```
fix(server): handle missing NOTION_API_KEY gracefully

Provide clear error message when environment variable is missing
instead of crashing with obscure error during API initialization.

This is a critical fix for deployment scenarios.
```

## Pre-commit Checklist

- [ ] Message follows format conventions
- [ ] Subject line is descriptive and under 50 chars
- [ ] Changes are logically grouped in single commit
- [ ] Breaking changes are clearly marked
- [ ] Related issues are referenced
- [ ] Code follows project coding standards
- [ ] **NEVER mention AI assistance in commit messages** (commits should appear as normal human work)