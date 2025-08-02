# Development Workflow

## Project Setup

### Initial Setup
```bash
# Clone and setup
git clone <repository-url>
cd notion-workflow-mcp
npm install
npm run build
```

### Environment Configuration
```bash
# Create environment file
cp .env.example .env
# Edit .env with your Notion API key
echo "NOTION_API_KEY=your_secret_token" > .env
```

### Notion Setup
1. Create Notion integration
2. Setup test database with required properties
3. Share database with integration
4. Test basic connectivity

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
git checkout -b feature/execution-service-improvements
```

2. **Development Loop**
```bash
# Make changes to services
npm run build  # Compile TypeScript

# Test with CLI wrapper
node mcp.js create_task '{"title":"Test","taskType":"Feature","description":"Test task"}'
node mcp.js execute_task '{"taskId":"test-id"}'

# Test auto-continuation system
node mcp.js update_todos '{"taskId":"test-id","updates":[{"todoText":"Test todo","completed":true}]}'
```

3. **Commit Changes**
```bash
git add .
git commit -m "feat(execution): implement auto-continuation system

- Add callback system between UpdateService and ExecutionService
- Implement todo-by-todo AI guidance with auto-progression
- Add development summary generation with git integration"
```

4. **Push and Create PR**
```bash
git push origin feature/workflow-guidance-improvements
# Create pull request via GitHub
```

### Testing Strategy

#### Manual Testing
- Test all 9 MCP tools with real Notion pages
- Verify flexible status transitions work correctly
- Test auto-continuation workflow with todo updates
- Test template intelligence for different task types
- Check error handling with invalid inputs
- Verify git-based development summaries

#### Service Testing
```bash
# Test service architecture
node -e "
const { CreationService } = require('./dist/services/core/CreationService.js');
const { UpdateService } = require('./dist/services/core/UpdateService.js');
const { ExecutionService } = require('./dist/services/core/ExecutionService.js');
console.log('Services loaded successfully');
"

# Test template loading
node -e "
const fs = require('fs');
console.log('Feature template:', fs.readFileSync('./workflows/feature.md', 'utf8').substring(0, 100));
console.log('Bug template:', fs.readFileSync('./workflows/bug.md', 'utf8').substring(0, 100));
"
```

#### Integration Testing
```bash
# Test Notion API connectivity
node -e "
const { Client } = require('@notionhq/client');
const notion = new Client({ auth: process.env.NOTION_API_KEY });
notion.users.me().then(r => console.log('Connected as:', r.name));
"
```

### Code Quality

#### TypeScript Compilation
```bash
# Ensure no TypeScript errors
npm run build

# Check for type issues
npx tsc --noEmit
```

#### Code Style
- Follow established coding standards
- Use meaningful variable names
- Add comments for complex logic
- Keep functions focused and small

#### Error Handling
- Provide clear, actionable error messages
- Include context in error descriptions
- Handle edge cases gracefully
- Log appropriate information without exposing secrets

### Configuration Management

#### Config File Changes
1. Update `config.json` with new options
2. Update TypeScript interfaces in `types.ts`
3. Add validation in `config-loader.ts`
4. Update documentation
5. Test with existing setups

#### Workflow File Changes
1. Edit markdown files in `workflows/`
2. Test loading in development
3. Verify AI guidance is clear
4. Update examples if needed

### Debugging

#### Enable Debug Mode
```typescript
// Add to config for verbose logging
{
  "debug": true,
  "logLevel": "verbose"
}
```

#### Common Debug Commands
```bash
# Test URL parsing
node -e "
const { parseNotionUrl } = require('./dist/utils.js');
console.log(parseNotionUrl('https://notion.so/your-test-page'));
"

# Test status transitions
node -e "
const { ConfigLoader } = require('./dist/config-loader.js');
const loader = new ConfigLoader('./config.json');
console.log('Allowed from En cours:', 
  loader.loadConfig().board.transitions['En cours']);
"
```

#### MCP Server Testing
```bash
# Start server in debug mode
DEBUG=* npm start

# Test with MCP client
# Send test requests to verify functionality
```

## Release Workflow

### Pre-Release Testing
- [ ] All TypeScript compiles without errors
- [ ] Manual testing with real Notion board
- [ ] All MCP tools respond correctly  
- [ ] Documentation is up to date
- [ ] Configuration examples work

### Version Bumping
```bash
# Update version in package.json
npm version [patch|minor|major]

# Tag and push
git push origin main --tags
```

### Deployment Checklist
- [ ] Test in staging environment
- [ ] Verify environment variables
- [ ] Check Notion integration permissions
- [ ] Monitor error rates after deployment
- [ ] Update documentation if needed

## Collaboration Guidelines

### Code Reviews
- Focus on functionality and maintainability
- Check error handling and edge cases
- Verify documentation updates
- Test configuration changes
- Ensure backward compatibility

### Communication
- Use GitHub issues for bug reports
- Use GitHub discussions for feature ideas
- Update CHANGELOG.md for user-facing changes
- Notify team of breaking changes

### Knowledge Sharing
- Document architectural decisions
- Share debugging techniques
- Update troubleshooting guides
- Maintain examples and tutorials

## Development Tools

### Recommended VS Code Extensions
- TypeScript and JavaScript Language Features
- ESLint
- Prettier
- Markdown All in One
- GitLens

### Useful Scripts
```bash
# Watch TypeScript compilation
npm run dev

# Clean build
npm run clean && npm run build

# Format code
npx prettier --write src/

# Lint TypeScript
npx eslint src/ --ext .ts
```

### Environment Management
```bash
# Development environment
export NODE_ENV=development
export NOTION_API_KEY=your_dev_token

# Staging environment  
export NODE_ENV=staging
export NOTION_API_KEY=your_staging_token

# Production environment
export NODE_ENV=production
export NOTION_API_KEY=your_prod_token
```

## Troubleshooting Common Issues

### Build Failures
- Check TypeScript errors: `npx tsc --noEmit`
- Verify all imports have `.js` extensions
- Ensure all dependencies are installed
- Check for circular dependencies

### Runtime Errors
- Verify Notion API key is set
- Check Notion permissions and sharing
- Validate configuration file format
- Test with minimal examples

### Configuration Issues
- Validate JSON syntax in config files
- Check file paths are correct
- Verify status names match Notion setup
- Test with default configuration

### Performance Issues
- Monitor API rate limits
- Check for memory leaks in long-running sessions
- Optimize configuration file loading
- Consider caching strategies

This workflow ensures consistent, high-quality development while maintaining the simplicity and reliability of the MCP server.