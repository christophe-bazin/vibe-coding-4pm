# Contributing Guide

Guide for contributing to and customizing the VC4PM MCP Server v3.0.

## Project Structure

```
@vc4pm/mcp-server/
├── src/                             # TypeScript source code
│   ├── services/                    # Core business logic services
│   ├── providers/                   # Task provider implementations 
│   ├── models/                      # TypeScript interfaces and types
│   └── server.ts                    # MCP server implementation
├── templates/                       # Task and summary templates (global)
│   ├── task/                        # Task creation templates
│   │   ├── feature.md               # Feature task template
│   │   ├── bug.md                   # Bug task template
│   │   └── refactoring.md           # Refactoring task template
│   └── summary/                     # Summary templates
│       └── summary.md               # Summary template
├── dist/                            # Compiled JavaScript output
├── docs/                            # User documentation
├── .ai/                             # Development guidelines for AI
└── README.md
```

## Development Setup

### Prerequisites

- Node.js 18+ 
- npm package manager
- TypeScript knowledge
- Task provider familiarity (Notion API, Linear, etc.)
- MCP protocol understanding

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

3. Set up test project configuration:
```bash
mkdir test-project/.vc4pm
cp .vc4pm/config.json test-project/.vc4pm/config.json
# Edit with your test credentials
```

4. Link for local development:
```bash
npm link
# Now you can test with local version
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

**Direct MCP Testing:**
```bash
# Build first
npm run build

# Test server startup
cd test-project
node /path/to/repo/dist/server.js
```

**IDE Integration Testing:**
```bash
# Add local development server to Claude Code
claude mcp add vc4pm-dev "node" "/path/to/repo/dist/server.js"

# Open test project in Claude Code
# Use natural language to test tools:
# "Create a task for testing the MCP server"
# "Get the task details"
# "Update the task status"
```

#### Development Workflow
1. Make changes to TypeScript source
2. Run `npm run build` to compile
3. Test MCP server startup
4. Test via Claude Code with local server
5. Verify template fallback system works
6. Update documentation if needed

## Architecture Overview

The MCP server provides 11 tools for AI-guided development workflows:

- **Task Management**: Create, read, update tasks with automatic status tracking
- **Template System**: Intelligent templates with project-specific overrides
- **Todo Processing**: Batch todo updates with automatic execution continuation
- **Content Management**: Read and update Notion pages with markdown
- **Development Summaries**: AI-adapted summary generation with testing checklists

### MCP Native Design

- **No CLI Wrapper**: Direct MCP protocol implementation
- **Per-Project Config**: Each project uses `.vc4pm/config.json` 
- **Template Fallback**: Package templates used when local templates missing
- **Provider Pattern**: Extensible for Linear, GitHub, Jira support

### Template System v3.0

**Global Templates** (in npm package):
- `templates/task/feature.md` - Feature development template
- `templates/task/bug.md` - Bug fixing template  
- `templates/task/refactoring.md` - Code refactoring template
- `templates/summary/summary.md` - Development summary template

**Project Template Overrides** (per project):
```bash
# Enable override in .vc4pm/config.json
"templates": { "override": true }

# Create custom templates
mkdir -p .vc4pm/templates/task
cp custom-feature.md .vc4pm/templates/task/feature.md
```

**Template Resolution:**
1. If project has custom template AND override enabled → use custom
2. Otherwise → use global package template
3. Templates are AI-adapted contextually at creation time

## Customization

### Adding New Task Types

1. **Update your project configuration** (`.vc4pm/config.json`):
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

1. **Set up test provider** (Notion database with required properties)
2. **Test MCP server integration**:
```bash
# Test via Claude Code (recommended)
# Open test project containing .vc4pm/config.json
# Use natural language:
# "Create a task for testing the server"
# "Get the task I just created" 
# "Update the task status to In Progress"

# Direct server testing
cd test-project
node /path/to/repo/dist/server.js
# Should start without errors and show available tools
```

3. **Test template fallback**:
```bash
# Test project without local templates
cd clean-test-project
# Should use package templates without errors

# Test project with custom templates
cd custom-test-project  
# Should use custom templates when override: true
```

### Verifying Integration

1. **Provider Integration**: Test with real Notion/Linear workspace
2. **Template System**: Verify global and custom templates work
3. **Multi-Project**: Test different projects with different configs
4. **MCP Compliance**: Verify all 11 tools respond correctly
5. **Claude Code**: Test full workflow via AI assistant
6. **Content Management**: Test page reading and updating features

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

**Configuration Issues:**

- Check that your `.vc4pm/config.json` file has valid JSON syntax
- Verify the server builds successfully with `npm run build`
- Ensure config file exists in project directory (not package directory)
- Check provider credentials are correct and enabled
- Verify MCP server can read config from process working directory

**Template Issues:**

- Package templates should exist in `templates/` directory
- Custom templates need `override: true` in config to be used
- Template fallback should work when local templates missing
- Check template resolution paths in error messages
- Verify package root resolution works correctly

### Getting Help

For additional support:

- Open an issue on GitHub with detailed error information
- Include your configuration (without API keys) and steps to reproduce
- Check existing issues for similar problems and solutions