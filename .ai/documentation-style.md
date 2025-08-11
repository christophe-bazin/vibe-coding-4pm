# Documentation Style Guide

## General Principles

- **Clarity over cleverness**: Write for understanding, not to impress
- **Concise but complete**: Include all necessary information without redundancy
- **User-focused**: Write from the perspective of someone using the system
- **Actionable**: Provide specific steps and examples

## Markdown Conventions

### Headers
- Use sentence case (not title case)
- One H1 per document
- Logical hierarchy (don't skip levels)
- Add blank lines before and after headers

```markdown
# Main title

## Section header

### Subsection header
```

### Code Blocks
- Always specify language for syntax highlighting
- Use `bash` for command line examples
- Use `typescript` for code examples
- Use `json` for configuration examples

```typescript
// Good
const config = loadConfig();

// Not: missing language specification
```

### Lists
- Use `-` for unordered lists
- Add blank line before and after lists
- Use parallel structure in list items
- Keep list items concise

### Links
- Use descriptive link text (not "click here")
- Prefer relative links for internal documentation
- Include file extensions for clarity

```markdown
See [MCP architecture](docs/project/mcp-architecture.md) for details.
```

### Emphasis
- Use **bold** sparingly for key terms
- Use *italics* for emphasis or first-time terms
- Use `code formatting` for file names, commands, and API elements
- Avoid excessive formatting that makes text "criard"

## Documentation Structure

### README.md
- Project overview and value proposition
- Quick start instructions
- Configuration guide
- API reference
- Development setup

### Technical Documentation
- One concept per file
- Clear section headings
- Code examples for complex concepts
- Troubleshooting sections where relevant

### API Documentation
- Consistent parameter descriptions
- Request/response examples
- Error conditions
- Usage notes

## Writing Style

### Voice and Tone
- Use active voice when possible
- Write in present tense
- Be direct and helpful
- Avoid jargon without explanation

### Technical Accuracy
- Test all code examples
- Verify configuration examples work
- Keep examples up to date with code changes
- Include version-specific information when relevant

### Examples
```markdown
<!-- Good -->
Configure the board statuses in `config.json`:

```json
{
  "board": {
    "statuses": ["Not Started", "In Progress", "Test", "Done"]
  }
}
```

<!-- Avoid -->
You might want to think about maybe configuring some statuses.
```

## Configuration Documentation

### File Structure
- Document all configuration options
- Provide default values
- Explain the impact of each setting
- Include complete working examples

### Format
```markdown
### `statusTransitions`
**Type**: `Record<string, string[]>`  
**Default**: See example below  
**Description**: Defines allowed status transitions for workflow validation.

**Example**:
```json
{
  "statusTransitions": {
    "A faire": ["En cours"],
    "En cours": ["A tester"]
  }
}
```
```

## Workflow Documentation

### Structure
- Clear objective statement
- Step-by-step instructions
- Examples and templates
- Best practices section

### AI-Specific Guidelines
- Write for AI assistant consumption
- Use imperative mood ("Create a task", not "You should create")
- Provide structured templates
- Include clear restrictions and rules

### Templates
```markdown
## Template for [Specific Use Case]

```markdown
## [Template Title]
[Specific structure the AI should follow]

### [Section]
- [Specific guidance]
```
```

## Error Messages and Troubleshooting

### Error Documentation
- Include the full error message
- Explain what causes the error
- Provide step-by-step resolution
- Include prevention tips

### Format
```markdown
### Error: "Invalid transition from X to Y"

**Cause**: Attempting to change task status to a non-allowed value.

**Solution**:
1. Check allowed transitions in `config.json`
2. Verify current task status
3. Use `get_task_info` tool to see available options

**Prevention**: Always validate status transitions before attempting updates.
```

## Code Comments in Documentation

### Inline Comments
```typescript
// Load configuration with validation
const config = this.loadConfig();

// This handles the edge case where Notion returns null status
const status = notionStatus || this.getDefaultStatus();
```

### Block Comments
```typescript
/**
 * Updates task status with workflow validation
 * 
 * @param taskId - Notion page ID
 * @param newStatus - Target status (must be valid transition)
 * @param force - Bypass validation (use carefully)
 * @throws {Error} If transition is not allowed
 */
async updateTaskStatus(taskId: string, newStatus: string, force = false): Promise<void>
```

## Review Guidelines

### Before Publishing
- [ ] All code examples are tested
- [ ] Links work correctly
- [ ] Spelling and grammar checked
- [ ] Information is current and accurate
- [ ] Format follows style guide

### Regular Maintenance
- Review docs when API changes
- Update examples with new features
- Remove outdated information
- Gather feedback from users

## Common Mistakes to Avoid

- Over-explaining simple concepts
- Using inconsistent terminology
- Missing code language specifications
- Broken or outdated links
- Examples that don't work
- Assuming too much prior knowledge
- Using passive voice excessively