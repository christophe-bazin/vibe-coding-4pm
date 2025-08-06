# Contributing Guide

Guide for contributing to and customizing the Notion Vibe Coding MCP server.

## Project Structure

```
vibe-coding-4pm/
├── src/                             # TypeScript source code
├── templates/                       # Task and summary templates
│   ├── task/                        # Task creation templates
│   │   ├── feature.md               # Feature task template
│   │   ├── bug.md                   # Bug task template
│   │   └── refactoring.md           # Refactoring task template
│   └── summary/                     # Summary templates
│       └── summary.md               # Summary template
├── docs/                            # User documentation
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
git clone https://github.com/christophe-bazin/vibe-coding-4pm.git
cd vibe-coding-4pm
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
4. Test via MCP client integration
5. Update documentation if needed

## How It Works

The MCP server provides 10 tools that AI assistants can use to manage tasks in your Notion workspace:

- **Task Management**: Create, read, update tasks with automatic status tracking
- **Template System**: Intelligent templates adapt to your specific requirements
- **Todo Processing**: Batch todo updates with progress tracking
- **Development Summaries**: Automatic summary generation with testing checklists

### Template Customization

You can customize templates in the `templates/` directory:

- `templates/task/feature.md` - For new features
- `templates/task/bug.md` - For bug fixes  
- `templates/task/refactoring.md` - For code improvements
- `templates/dev_summary/dev_summary.md` - For development summaries

Templates use markdown format and support intelligent adaptation by AI assistants.

## Customization

### Adding New Task Types

1. **Update your MCP configuration** (`.claude/mcp-config.json`):
```json
{
  "taskTypes": ["Feature", "Bug", "Refactoring", "Documentation"]
}
```

2. **Create a template** in `templates/task/documentation.md`:
```markdown
## Documentation Objective
[What needs to be documented]

## Scope
[Specific areas to cover]

## Acceptance Criteria
- [ ] Documentation written
- [ ] Examples provided
- [ ] Review completed
```

### Customizing Templates

Templates support markdown formatting and will be intelligently adapted by AI assistants based on your task description. You can modify existing templates or create new ones following the same structure.

### Future Provider Support

The server is designed to support multiple task providers beyond Notion (Linear, GitHub, Jira). Provider support will be added based on community demand.

## Testing Your Setup

### Manual Testing

1. **Create a test workspace** in Notion with the required database structure
2. **Test basic functionality**:
```bash
# Test task creation
node mcp.js create_task '{"title":"Test Task","taskType":"Feature","description":"Test"}'

# Test task retrieval
node mcp.js get_task '{"taskId":"your-task-id"}'

# Test status updates
node mcp.js update_task '{"taskId":"your-task-id","status":"In Progress"}'
```

### Verifying Integration

1. Test with your actual Notion workspace
2. Verify task creation and updates work correctly  
3. Test template customizations
4. Check that AI assistants can access all tools through MCP

## Development Standards

- Follow TypeScript best practices
- Test changes with real Notion workspaces
- Update documentation when adding features
- Maintain backward compatibility with existing configurations

## Contributing

We welcome contributions! Here's how to get started:

### Pull Request Process

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/my-new-feature`
3. **Make your changes** and test with your Notion workspace
4. **Update documentation** if you add new features
5. **Submit pull request** with clear description of changes

### What We're Looking For

- Bug fixes and improvements
- New task templates for different use cases
- Better error handling and user experience
- Documentation improvements
- Support for additional task providers (Linear, GitHub, Jira)

### Commit Messages

Use clear, descriptive commit messages:

- `feat: add documentation task template`
- `fix: resolve todo matching issue`
- `docs: improve setup instructions`

## Troubleshooting

### Common Issues

**Setup Problems:**

- Verify your Notion integration has access to your database
- Check that your API key and database ID are correct in the config
- Ensure your database has the required Status and Type properties

**MCP Integration Issues:**

- Restart your MCP client after updating configuration
- Check that your `.claude/mcp-config.json` file has valid JSON syntax
- Verify the server builds successfully with `npm run build`

**Template Issues:**

- Templates should use standard markdown formatting
- Check that your template files are in the correct directories
- Test template changes by creating new tasks

### Getting Help

For additional support:

- Open an issue on GitHub with detailed error information
- Include your configuration (without API keys) and steps to reproduce
- Check existing issues for similar problems and solutions