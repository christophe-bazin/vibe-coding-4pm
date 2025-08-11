# Release Process

## Version Numbering

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes to config format or MCP API
- **MINOR**: New features, workflow improvements, new tools
- **PATCH**: Bug fixes, documentation updates, internal improvements

Examples:
- `1.0.0` → `1.0.1`: Bug fix in status validation
- `1.0.0` → `1.1.0`: New MCP tool added
- `1.0.0` → `2.0.0`: Config format changed (breaking)

## Pre-Release Checklist

### Code Quality
- [ ] All TypeScript errors resolved
- [ ] Build succeeds: `npm run build`
- [ ] No lint errors or warnings
- [ ] Code follows project standards

### Testing
- [ ] Manual testing with real Notion board
- [ ] All MCP tools respond correctly
- [ ] Workflow guidance files load properly
- [ ] Status transitions work as expected
- [ ] Error handling functions properly

### Documentation
- [ ] README.md is up to date
- [ ] CHANGELOG.md includes new changes
- [ ] API documentation reflects changes
- [ ] Workflow files are current
- [ ] Example configurations work

### Configuration
- [ ] Default config.json is valid
- [ ] All required fields documented
- [ ] Example workflows are complete
- [ ] Breaking changes are noted

## Release Steps

### 1. Prepare Release Branch
```bash
git checkout main
git pull origin main
git checkout -b release/v1.x.x
```

### 2. Update Version
```bash
# Update package.json version
npm version [major|minor|patch] --no-git-tag-version
```

### 3. Update Documentation
- Update README.md with new features
- Add entry to CHANGELOG.md
- Review and update API documentation
- Verify all links work

### 4. Final Testing
```bash
# Build and test
npm run build
npm start

# Test with actual MCP client
# Verify all tools work correctly
```

### 5. Commit Release
```bash
git add .
git commit -m "chore: prepare release v1.x.x"
```

### 6. Create Pull Request
- Create PR from release branch to main
- Include release notes in PR description
- Get review from team member
- Ensure CI passes

### 7. Merge and Tag
```bash
git checkout main
git pull origin main
git tag -a v1.x.x -m "Release v1.x.x"
git push origin v1.x.x
```

### 8. Create GitHub Release
- Go to GitHub releases page
- Create new release from tag
- Include release notes
- Attach any relevant files

## Release Notes Format

```markdown
## [1.x.x] - YYYY-MM-DD

### Added
- New MCP tool for task information retrieval
- Enhanced workflow guidance for AI execution
- Configuration validation on startup

### Changed
- Simplified architecture to config-driven approach
- Updated default status names to French
- Improved error messages for better debugging

### Fixed
- Resolved issue with missing workflow files
- Fixed status transition validation
- Corrected TypeScript type definitions

### Removed
- Removed complex FlexibleWorkflowConfig system
- Cleaned up obsolete example files
- Removed unused progress tracking features

### Breaking Changes
- Config format changed: see migration guide
- Default status names now in French
- Some MCP tools renamed for clarity
```

## Hotfix Process

For critical bugs in production:

### 1. Create Hotfix Branch
```bash
git checkout main
git checkout -b hotfix/critical-fix
```

### 2. Make Minimal Fix
- Focus only on the critical issue
- Avoid feature additions
- Include test for the fix

### 3. Fast-Track Release
- Skip some testing steps for speed
- Still require code review
- Update patch version
- Tag and release immediately

### 4. Communicate
- Notify users of critical fix
- Explain what was broken
- Provide upgrade instructions

## Rollback Plan

If a release causes issues:

### 1. Immediate Response
- Acknowledge the issue publicly
- Assess impact and affected users
- Decide on rollback vs. forward fix

### 2. Rollback Process
```bash
# Revert the problematic commit
git revert v1.x.x

# Create emergency patch release
npm version patch
git tag -a v1.x.y -m "Emergency rollback"
```

### 3. Communication
- Explain what went wrong
- Provide timeline for proper fix
- Thank users for patience

## Post-Release

### 1. Monitor
- Watch for user reports
- Monitor error rates
- Check integration health

### 2. Document Lessons
- Update process if needed
- Note any issues for next time
- Share learnings with team

### 3. Plan Next Release
- Review feedback
- Prioritize next features
- Update roadmap

## Automated Releases (Future)

Consider automating with GitHub Actions:
- Automatic testing on PR
- Version bumping
- Changelog generation
- Release creation
- Notification system

```yaml
# Example workflow trigger
on:
  push:
    tags:
      - 'v*'
```

## Release Schedule

- **Patch releases**: As needed for bugs
- **Minor releases**: Monthly or when features ready
- **Major releases**: Quarterly or for breaking changes

Avoid releases during:
- Holiday periods
- Major conferences
- End of fiscal quarters (when users are busy)