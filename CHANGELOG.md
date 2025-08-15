# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.0.4] - 2025-01-15

### Added
- GitHub Actions workflow for automatic NPM publishing on releases
- Enhanced vc4pm-setup with multi-editor support (Claude Code, Cursor, VS Code, Zed, Continue.dev)
- Optional API credentials configuration during interactive setup
- Comprehensive development environment integration documentation

### Changed
- Improved setup flow with consolidated quick start section in README
- Simplified provider selection (Notion only, ready for future expansion)  
- Removed status mapping customization from interactive setup (config-file only)
- Enhanced messaging with clear "optional" indicators and config file references

### Fixed
- Improved documentation structure and navigation
- Better setup guidance for different editors

## [3.0.3] - 2025-01-15

### Added
- Interactive setup utility for project initialization
- Per-project configuration with template fallback system
- Complete MCP tool suite (11 tools for task management)

### Changed
- Architecture redesign to service-oriented pattern
- Configuration-driven approach with camelCase conventions
- Improved documentation structure

### Fixed
- Template resolution and adaptation system
- Provider configuration validation
- Error handling and user feedback

## [3.0.2] - 2025-01-14

### Fixed
- Bug fixes and stability improvements
- Documentation updates

## [3.0.1] - 2025-01-14

### Fixed
- Initial release bug fixes
- Package configuration improvements

## [3.0.0] - 2025-01-14

### Added
- Initial v3.0 release with MCP native architecture
- Notion provider support
- Template system with Feature/Bug/Refactoring workflows
- Per-project configuration system
- AI-guided development workflows

### Breaking Changes
- Complete rewrite from v2.x
- New configuration format
- MCP protocol native implementation