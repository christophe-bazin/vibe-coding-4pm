#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * VC4PM Server - Simple Global Launcher
 * Loads .vc4pm/config.json and starts MCP server
 */
class VC4PMServer {
  constructor() {
    this.args = process.argv.slice(2);
  }

  findConfig() {
    const configPath = path.resolve('.vc4pm/config.json');
    
    if (!fs.existsSync(configPath)) {
      throw new Error(
        'No config found. Create .vc4pm/config.json in your project.\n' +
        'Run: vc4pm-server --help for setup instructions.'
      );
    }
    
    return configPath;
  }

  loadConfig() {
    const configPath = this.findConfig();
    
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      if (!config.workflow || !config.providers) {
        throw new Error('Config must have "workflow" and "providers" sections');
      }
      
      return config;
    } catch (error) {
      throw new Error(`Invalid config: ${error.message}`);
    }
  }

  setupEnvironment(config) {
    process.env.WORKFLOW_CONFIG = JSON.stringify(config.workflow);
    process.env.PROVIDERS_CONFIG = JSON.stringify(config.providers);
  }

  launchServer() {
    const serverPath = path.join(__dirname, '../dist/server.js');
    
    if (!fs.existsSync(serverPath)) {
      throw new Error('Server not found. Run: npm run build');
    }

    const server = spawn('node', [serverPath], { stdio: 'inherit' });

    server.on('error', (error) => {
      console.error(`Server error: ${error.message}`);
      process.exit(1);
    });

    server.on('exit', (code) => {
      process.exit(code || 0);
    });

    process.on('SIGINT', () => server.kill('SIGINT'));
    process.on('SIGTERM', () => server.kill('SIGTERM'));
  }

  showHelp() {
    console.log(`
VC4PM Server - AI Task Management

USAGE:
  vc4pm-server

SETUP:
  1. Install: npm install -g @vc4pm/server
  2. Create .vc4pm/config.json in your project
  3. Configure your task provider (Notion)

CONFIG FORMAT (.vc4pm/config.json):
  {
    "workflow": {
      "statusMapping": { "notStarted": "Not Started", ... },
      "taskTypes": ["Feature", "Bug", "Refactoring"]
    },
    "providers": {
      "default": "notion",
      "available": {
        "notion": {
          "enabled": true,
          "config": { "apiKey": "...", "databaseId": "..." }
        }
      }
    }
  }
    `);
  }

  run() {
    if (this.args.includes('--help') || this.args.includes('-h')) {
      this.showHelp();
      return;
    }

    try {
      const config = this.loadConfig();
      this.setupEnvironment(config);
      this.launchServer();
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  }
}

new VC4PMServer().run();