#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

class VC4PMSetup {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async setup() {
    try {
      console.log('🚀 VC4PM Project Setup');
      console.log('======================\n');

      const projectDir = process.cwd();
      const configDir = path.join(projectDir, '.vc4pm');
      const configFile = path.join(configDir, 'config.json');
      const templatesDir = path.join(configDir, 'templates');

      let mode = 'install';
      let existingConfig = null;

      // Detect existing installation
      if (fs.existsSync(configFile)) {
        console.log('✓ Existing VC4PM installation detected\n');
        const modeQuestion = `Choose installation mode:\n  [1] Update (refresh docs, keep config & templates) (Default)\n  [2] Reinstall (reset everything, lose API keys)\n> `;
        const mChoice = await this.askQuestion(modeQuestion);

        if (mChoice === '2') {
          mode = 'reinstall';
          console.log('\n⚠️  WARNING: This will delete your existing configuration and templates!');
          const confirm = await this.askQuestion('Are you sure? Type "yes" to confirm: ');
          if (confirm.toLowerCase() !== 'yes') {
            console.log('\nReinstall cancelled. Exiting.');
            this.rl.close();
            return;
          }
        } else {
          mode = 'update';
          existingConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));
        }
      }

      // Create directory if needed
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
        console.log('\n✅ Created .vc4pm directory');
      }

      // Get IDE configuration (only for new installs)
      let ideChoice = 'manual';
      if (mode === 'install' || mode === 'reinstall') {
        ideChoice = await this.getIDEConfiguration();
      }

      // Handle config.json
      if (mode === 'update') {
        console.log('\n✅ Keeping existing configuration');
      } else {
        const config = await this.getProviderConfig(existingConfig);
        fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
        console.log('✅ Created configuration file');
      }

      // Always update README (reflects current version)
      this.createReadmeFile(configDir);

      // Handle templates
      if (mode === 'update') {
        console.log('✅ Keeping existing templates');
      } else {
        await this.copyTemplates(configDir);
      }

      console.log('\n🎉 Setup complete!');

      if (mode === 'update') {
        console.log('\n✓ Documentation updated to latest version');
        console.log('✓ Your configuration and templates remain unchanged');
      } else {
        console.log('\nNext steps:');
        console.log('1. Configure your provider credentials in .vc4pm/config.json');
        console.log('2. The MCP server is ready to use with your AI editor');
        console.log('3. Customize templates and workflow in .vc4pm/ (optional)');

        this.showIDEInstructions(ideChoice);
      }

      this.rl.close();
    } catch (error) {
      console.error('\n❌ Setup failed:', error.message);
      this.rl.close();
      process.exit(1);
    }
  }

  async getProviderConfig(existingConfig) {
    console.log('\n📋 Task Management Provider Setup...');
    const config = {
      "workflow": {
        "statusMapping": {
          "notStarted": "Not Started",
          "inProgress": "In Progress",
          "test": "Test",
          "done": "Done"
        },
        "transitions": {
          "notStarted": ["inProgress"],
          "inProgress": ["test"],
          "test": ["done", "inProgress"],
          "done": ["test"]
        },
        "taskTypes": ["Feature", "Bug", "Refactoring"],
        "defaultStatus": "notStarted",
        "requiresValidation": ["done"],
        "templates": {
          "override": false,
          "taskPath": ".vc4pm/templates/task/",
          "summaryPath": ".vc4pm/templates/summary/"
        }
      },
      "providers": {
        "default": "notion",
        "available": {
          "notion": {
            "name": "Notion",
            "type": "core",
            "enabled": true,
            "config": {
              "apiKey": "your_notion_integration_token_here",
              "databaseId": "your_notion_database_id_here"
            }
          }
        }
      }
    };

    const setupCredentials = await this.askQuestion('\nConfigure Notion API credentials now? (optional) (y/N): ');
    if (setupCredentials.toLowerCase() === 'y') {
      console.log('\n🔑 Notion Configuration');
      const apiKey = await this.askQuestion('Notion Integration Token: ');
      if (apiKey) config.providers.available.notion.config.apiKey = apiKey;

      const databaseId = await this.askQuestion('Notion Database ID: ');
      if (databaseId) config.providers.available.notion.config.databaseId = databaseId;
    } else {
      console.log('⚠️  Remember to add credentials to .vc4pm/config.json later');
    }

    return config;
  }

  async copyTemplates(configDir) {
    const templatesDir = path.join(configDir, 'templates');
    const sourceTemplatesDir = path.join(__dirname, '..', 'templates');
    if (!fs.existsSync(sourceTemplatesDir)) {
      console.log('⚠️  Source templates not found, skipping.');
      return;
    }
    console.log('\n✨ Copying default templates...');
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
    }
    this.copyDirectory(sourceTemplatesDir, templatesDir, false);
    console.log('✅ Templates installed');
  }

  copyDirectory(source, destination, merge) {
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
    }
    const items = fs.readdirSync(source);
    for (const item of items) {
      const sourcePath = path.join(source, item);
      const destPath = path.join(destination, item);
      if (fs.statSync(sourcePath).isDirectory()) {
        this.copyDirectory(sourcePath, destPath, merge);
      } else {
        if (merge && fs.existsSync(destPath)) {
        } else {
          fs.copyFileSync(sourcePath, destPath);
        }
      }
    }
  }

  async getIDEConfiguration() {
    console.log('\n🛠️  Development Environment');
    console.log('Which AI-powered editor will you use with VC4PM?\n');
    console.log('1. Claude Code');
    console.log('2. Cursor');
    console.log('3. VS Code (with MCP extension)');
    console.log('4. Zed (experimental MCP)');
    console.log('5. Continue.dev');
    console.log('6. Manual MCP configuration\n');
    const choice = await this.askQuestion('Select option (1-6): ');
    switch (choice) {
      case '1': return 'claude-code';
      case '2': return 'cursor';
      case '3': return 'vscode';
      case '4': return 'zed';
      case '5': return 'continue';
      case '6':
      default: return 'manual';
    }
  }

  showIDEInstructions(ideChoice) {
    console.log('\n📖 IDE-Specific Instructions:');
    console.log('============================');
    switch (ideChoice) {
      case 'claude-code':
        console.log('\n🔵 Claude Code:');
        console.log('Adding MCP server to Claude Code...');
        try {
          const { execSync } = require('child_process');
          execSync('claude mcp add vc4pm "vc4pm-server"', { stdio: 'inherit' });
          console.log('✅ MCP server added to Claude Code configuration');
        } catch (error) {
          console.log('⚠️  Could not automatically add MCP server. Please run manually:');
          console.log('   claude mcp add vc4pm "vc4pm-server"');
        }
        break;
      case 'cursor':
        console.log('\n🟡 Cursor:');
        console.log('1. Install the MCP extension for Cursor');
        console.log('2. Add to your Cursor MCP configuration:');
        console.log('   {\n     "mcpServers": {\n       "vc4pm": {\n         "command": "vc4pm-server"\n       }\n     }\n   }');
        console.log('3. Run Cursor from your project directory');
        break;
      case 'vscode':
        console.log('\n🔵 VS Code (with MCP extension):');
        console.log('1. Install an MCP extension for VS Code');
        console.log('2. Add to your MCP configuration:');
        console.log('   {\n     "mcp.servers": {\n       "vc4pm": {\n         "command": "vc4pm-server",\n         "cwd": "${workspaceFolder}"\n       }\n     }\n   }');
        break;
      case 'zed':
        console.log('\n🟢 Zed (experimental MCP support):');
        console.log('1. Update to latest Zed version with MCP support');
        console.log('2. Add to your Zed configuration:');
        console.log('   {\n     "assistant": {\n       "mcp_servers": {\n         "vc4pm": {\n           "command": "vc4pm-server"\n         }\n       }\n     }\n   }');
        break;
      case 'continue':
        console.log('\n🟣 Continue.dev:');
        console.log('1. Install Continue VS Code extension');
        console.log('2. Add to your continue_config.json:');
        console.log('   {\n     "mcpServers": {\n       "vc4pm": {\n         "command": "vc4pm-server"\n       }\n     }\n   }');
        break;
      case 'manual':
      default:
        console.log('\n🔧 Manual MCP Configuration:');
        console.log('Basic configuration for any MCP-compatible editor:');
        console.log('- Command: "vc4pm-server"');
        console.log('- Working directory: project root with .vc4pm/config.json');
        break;
    }
    console.log('\n📚 For detailed setup instructions, see:\nhttps://github.com/christophe-bazin/vibe-coding-4pm/blob/master/docs/advanced-usage.md#development-environment-integration');
  }

  createReadmeFile(configDir) {
    const readmePath = path.join(configDir, 'README.md');
    const templatePath = path.join(__dirname, 'setup/assets/README.md');
    const readmeContent = fs.readFileSync(templatePath, 'utf8');
    fs.writeFileSync(readmePath, readmeContent);
    console.log('✅ Created usage guide (.vc4pm/README.md)');
  }

  askQuestion(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim() || '1');
      });
    });
  }
}

if (require.main === module) {
  const setup = new VC4PMSetup();
  setup.setup().catch((error) => {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  });
}

module.exports = VC4PMSetup;