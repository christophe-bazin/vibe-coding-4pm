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

## Release Steps (AI Instructions)

### 1. Prepare Release
```bash
git checkout master
git pull origin master
```

### 2. Update Version and Documentation
```bash
# Update package.json version (choose appropriate type)
# ⚠️ IMPORTANT: This command updates BOTH package.json AND package-lock.json
npm version [major|minor|patch] --no-git-tag-version

# Update CHANGELOG.md with new version entry
# Update README.md if needed for new features
```

### 3. Final Testing
```bash
# Build and verify
npm run build
npm pack --dry-run

# Test with actual MCP client if possible
# Verify all tools work correctly
```

### 4. Commit and Push
```bash
# ⚠️ CRITICAL: Stage ALL files including package-lock.json
git add package.json package-lock.json CHANGELOG.md

# Verify all version files are staged
git status

git commit -m "chore: prepare release v1.x.x

- Updated package.json and package-lock.json to v1.x.x
- Updated CHANGELOG.md with release notes
- [Any other changes made]"

git push origin master
```

**Common mistake to avoid:**
- ❌ Forgetting to commit `package-lock.json` (npm version updates both files)
- ✅ Always check `git status` before committing to ensure package-lock.json is staged

### 5. Create GitHub Release (AUTOMATED NPM PUBLISH)
**Important: GitHub Release triggers automatic NPM publish via GitHub Actions**

#### Option A: GitHub CLI (Recommended)
```bash
# Create and push tag
git tag -a v1.x.x -m "Release v1.x.x"
git push origin v1.x.x

# Create GitHub Release with changelog
gh release create v1.x.x --title "v1.x.x" --notes-file CHANGELOG.md --latest
```

**For specific version section only:**
```bash
# Extract only current version from CHANGELOG.md for release notes
sed -n '/## \[1\.x\.x\]/,/## \[/p' CHANGELOG.md | head -n -1 > release-notes.tmp
gh release create v1.x.x --title "v1.x.x" --notes-file release-notes.tmp --latest
rm release-notes.tmp
```

#### Option B: GitHub Web Interface
- Go to https://github.com/christophe-bazin/vibe-coding-4pm/releases/new
- Choose tag: v1.x.x (will be created)
- Release title: v1.x.x  
- Description: Copy relevant section from CHANGELOG.md for this version
- Check "Set as the latest release"
- Click "Publish release"

**⚠️ CRITICAL: The GitHub Release automatically triggers NPM publishing via GitHub Actions**

### 6. Verify Automated Publishing
After creating the GitHub Release:
- Check GitHub Actions tab for successful workflow run
- Verify package appears on https://www.npmjs.com/package/@vc4pm/mcp-server
- Test installation: `npm install -g @vc4pm/mcp-server@latest`

### 7. Manual NPM Publish (ONLY if automation fails)
```bash
# Only use if GitHub Action failed
npm publish
```

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
git checkout master
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

## GitHub CLI Installation

Install GitHub CLI for streamlined release management:

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install gh -y

# Authenticate
gh auth login

# Verify installation
gh --version
gh auth status
```

**Other platforms:**
- macOS: `brew install gh`
- Windows: `winget install --id GitHub.cli`

## Automated NPM Publishing

✅ **IMPLEMENTED**: GitHub Actions automatically publishes to NPM when you create a GitHub Release.

**Setup Requirements:**
- `NPM_TOKEN` secret configured in GitHub repository settings
- Workflow file: `.github/workflows/publish.yml`
- Triggers on: `release.types: [published]`

**What happens automatically:**
- Dependencies installed
- Project built (`npm run build`)
- Tests run (if available)
- Package published to NPM
- Deployment comment added to release

**Manual NPM Token Setup:**
1. Go to https://www.npmjs.com/settings/tokens
2. Create new "Automation" token
3. Add as `NPM_TOKEN` secret in GitHub repo settings

```yaml
# Current workflow trigger
on:
  release:
    types: [published]
```

## Release Schedule

- **Patch releases**: As needed for bugs
- **Minor releases**: Monthly or when features ready
- **Major releases**: Quarterly or for breaking changes

Avoid releases during:
- Holiday periods
- Major conferences
- End of fiscal quarters (when users are busy)