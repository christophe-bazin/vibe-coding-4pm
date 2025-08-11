# Development Workflow v3.0

## Project Setup (for contributors)

### Initial Setup
```bash
# Clone and setup
git clone https://github.com/christophe-bazin/vibe-coding-4pm.git
cd vibe-coding-4pm
npm install
npm run build
```

### Local Development Setup
```bash
# Link for local development
npm link

# Setup MCP server in Claude Code
claude mcp add vc4pm-dev "node" "/path/to/vibe-coding-4pm/dist/server.js"

# Create test project config
mkdir test-project/.vc4pm
cp .vc4pm/config.json test-project/.vc4pm/config.json
# Edit with test credentials
```

## Development Process

### Branch Strategy
- **main**: Production-ready code
- **develop**: Integration branch for features
- **feature/**: New features and enhancements
- **fix/**: Bug fixes
- **hotfix/**: Critical production fixes

### Feature Development Workflow

1. **Create Feature Branch**
```bash
git checkout main
git pull origin main
git checkout -b feature/template-fallback-fix
```

2. **Development Loop**
```bash
# Make changes to services
npm run build  # Compile TypeScript

# Test MCP server directly
node dist/server.js &
SERVER_PID=$!

# Test via Claude Code (recommended)
# Open test project in Claude Code
# Use natural language: "Create a task for testing new feature"

# Or test MCP protocol directly
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/server.js

kill $SERVER_PID
```

3. **Template System Testing**
```bash
# Test template fallback (v3.0 fix)
cd test-project-without-templates
# Should use package templates, not fail

# Test template override
mkdir -p .vc4pm/templates/task
cp custom-feature.md .vc4pm/templates/task/feature.md
# Should use custom template when override: true
```

4. **Commit Changes**
```bash
git add .
git commit -m "fix(templates): resolve templates from package directory

- Fix template fallback to use package root instead of CWD
- Add proper path resolution for npm linked/installed packages
- Ensure templates work in projects without local overrides"
```

5. **Push and Create PR**
```bash
git push origin feature/template-fallback-fix
# Create pull request via GitHub
```

### Testing Strategy

#### MCP Integration Testing
- Test all 12 MCP tools via Claude Code
- Verify project-specific configuration loading
- Test template fallback system works correctly
- Check per-project provider isolation
- Verify error handling with invalid inputs

#### Manual Testing Checklist
```bash
# Test in different scenarios:

# 1. Clean project (no local templates)
mkdir test-clean && cd test-clean
# Create .vc4pm/config.json
# Use MCP tools - should use package templates

# 2. Project with custom templates
mkdir test-custom && cd test-custom
# Create .vc4pm/config.json with templates.override: true
# Create custom templates in .vc4pm/templates/
# Use MCP tools - should use custom templates

# 3. Multiple projects with different configs
# Each should use its own configuration independently
```

#### Service Testing
```bash
# Test service architecture
node -e "
const { CreationService } = require('./dist/services/core/CreationService.js');
const { UpdateService } = require('./dist/services/core/UpdateService.js');
const { ExecutionService } = require('./dist/services/core/ExecutionService.js');
console.log('Services loaded successfully');
"

# Test configuration loading
node -e "
const server = require('./dist/server.js');
console.log('Server configuration loading works');
"
```

#### Content Management Testing
```bash
# Test new content management features
# In Claude Code with MCP configured:
# "Read the Notion page [page-id] and its linked pages"
# "Update the page with new content"
# "Update both the page and its child pages"
```

### Code Quality

#### TypeScript Compilation
```bash
# Ensure no TypeScript errors
npm run build

# Check for type issues
npx tsc --noEmit
```

#### MCP Protocol Compliance
- Ensure all tools follow MCP specification
- Validate input/output schemas
- Test error responses are properly formatted
- Check tool descriptions are clear and helpful

#### Error Handling
- Provide clear, actionable error messages
- Include expected file paths in template errors
- Handle missing configuration gracefully
- Log appropriate information without exposing secrets

### Configuration Management

#### Project Configuration Changes
1. Update `.vc4pm/config.json` example with new options
2. Update TypeScript interfaces in `src/models/`
3. Add validation in server configuration loading
4. Update documentation in `docs/configuration.md`
5. Test with existing project setups

#### Template System Changes
1. Edit template files in `templates/`
2. Test loading from package directory
3. Test override system with local templates
4. Verify AI guidance is clear and actionable
5. Update template documentation

### Debugging

#### MCP Server Debugging
```bash
# Test server startup with config
cd test-project
node /path/to/vibe-coding-4pm/dist/server.js

# Test configuration loading
node -e "
process.chdir('/path/to/test-project');
const config = require('/path/to/vibe-coding-4pm/dist/server.js');
"

# Test template resolution
node -e "
const { resolve } = require('path');
const { existsSync } = require('fs');
const packageRoot = resolve('./node_modules/@vc4pm/mcp-server');
const templatePath = resolve(packageRoot, 'templates/task/feature.md');
console.log('Template exists:', existsSync(templatePath));
console.log('Template path:', templatePath);
"
```

#### Claude Code Integration Debugging
```bash
# Check MCP server status
claude mcp list

# Remove and re-add server
claude mcp remove vc4pm
claude mcp add vc4pm "node" "@vc4pm/mcp-server/dist/server.js"

# Test from different project directories
cd project-a && # Test MCP tools
cd project-b && # Should use different config
```

#### Common Debug Scenarios
```bash
# Template not found errors
# Check: packageRoot resolution, template file existence, path resolution

# Configuration errors  
# Check: .vc4pm/config.json exists, JSON syntax, required fields

# Provider connection errors
# Check: API keys, database IDs, provider permissions
```

## Release Workflow

### Pre-Release Testing
- [ ] All TypeScript compiles without errors
- [ ] Template fallback system works in clean projects
- [ ] All 12 MCP tools respond correctly via Claude Code
- [ ] Multi-project configuration isolation works
- [ ] Documentation reflects current architecture
- [ ] Content management features work with Notion pages

### Version Bumping
```bash
# Update version in package.json (now @vc4pm/mcp-server)
npm version [patch|minor|major]

# Update CLAUDE.md and architecture docs
# Update README.md installation instructions

# Tag and push
git push origin main --tags
```

### NPM Publishing
```bash
# Build and publish
npm run build
npm publish

# Test installation
npm install -g @vc4pm/mcp-server
claude mcp add vc4pm "node" "@vc4pm/mcp-server/dist/server.js"
```

### Deployment Checklist
- [ ] Test npm package installation globally
- [ ] Verify MCP integration in Claude Code
- [ ] Test template fallback with clean projects
- [ ] Check multi-project configuration isolation
- [ ] Verify content management features
- [ ] Update documentation website

## Architecture Evolution (v3.0)

### Major Changes from v2.0
- **Removed CLI Wrapper**: No more `mcp.js` or `vc4pm` command
- **Native MCP**: Direct MCP protocol implementation
- **Per-Project Config**: Configuration isolated to project directories
- **Template Fallback Fix**: Proper resolution from package directory
- **Content Management**: Added `read_notion_page` for documentation analysis
- **IDE-First Design**: Optimized for Claude Code and Cursor

### Migration from v2.0
1. Remove old CLI references
2. Update MCP client configuration
3. Ensure project has `.vc4pm/config.json`
4. Test template loading without local templates
5. Verify content management features work

### Development Focus Areas
- **MCP Protocol**: Ensure compliance and optimal performance
- **Project Isolation**: Each project should be completely independent
- **Template System**: Reliable fallback and override mechanisms
- **Content Management**: Rich Notion page manipulation capabilities
- **Error Handling**: Clear, actionable error messages

## Collaboration Guidelines

### Code Reviews for v3.0
- Focus on MCP protocol compliance
- Check project configuration isolation
- Verify template system reliability
- Test content management features
- Ensure IDE compatibility
- Review error handling improvements

### Communication
- Use GitHub issues for bug reports
- Use GitHub discussions for architecture questions
- Update architecture documentation for major changes
- Notify team of MCP protocol changes

### Knowledge Sharing
- Document MCP integration patterns
- Share debugging techniques for multi-project setups
- Update troubleshooting guides for new architecture
- Maintain template development examples

## Development Tools

### Recommended Claude Code Setup
```bash
# Install package globally
npm install -g @vc4pm/mcp-server

# Add to Claude Code
claude mcp add vc4pm "node" "@vc4pm/mcp-server/dist/server.js"

# For development, use local version
claude mcp add vc4pm-dev "node" "/path/to/local/repo/dist/server.js"
```

### Testing Different Project Configurations
```bash
# Create test projects with different setups
mkdir -p test-projects/{clean,custom,multi-provider}

# Clean project - uses package templates
cd test-projects/clean
echo '{"workflow":{"statusMapping":{"notStarted":"Not Started"},"taskTypes":["Feature"],"transitions":{"notStarted":["inProgress"]}},"providers":{"default":"notion","available":{"notion":{"enabled":true,"config":{"apiKey":"test","databaseId":"test"}}}}}' > .vc4pm/config.json

# Custom project - uses local templates  
cd test-projects/custom
# Add templates.override: true to config
mkdir -p .vc4pm/templates/task
echo "# Custom Feature Template" > .vc4pm/templates/task/feature.md
```

### Environment Management for v3.0
```bash
# Development with local server
export MCP_SERVER_PATH="/path/to/local/repo/dist/server.js"

# Testing with different project directories
cd test-project-a  # Uses config A
cd test-project-b  # Uses config B

# Production with npm package
npm install -g @vc4pm/mcp-server
# Uses published package globally
```

## Troubleshooting v3.0 Issues

### Configuration Not Found
- Ensure `.vc4pm/config.json` exists in project root
- Check JSON syntax and required fields
- Verify working directory is correct

### Template Not Found Errors
- Check if templates exist in package installation
- Verify package root resolution works correctly
- Test with and without local template overrides

### MCP Integration Issues
- Check `claude mcp list` output
- Verify server command and path are correct
- Test server startup manually
- Check for configuration loading errors

### Multi-Project Issues
- Ensure each project has independent configuration
- Check for configuration file conflicts
- Verify provider credentials are per-project
- Test switching between different project directories

This workflow ensures reliable development of the v3.0 MCP native architecture while maintaining the simplicity and power of AI-guided development workflows.