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
      
      let configChoice = 'overwrite';
      let templateChoice = 'overwrite';
      let existingConfig = null;

      if (fs.existsSync(configFile)) {
        console.log('\nAn existing VC4PM configuration was found.');
        existingConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));

        const configQuestion = `A config.json file already exists. What would you like to do?\n  [1] Merge new settings (preserve API keys) (Default)\n  [2] Overwrite completely (your keys will be lost)\n  [3] Skip\n> `;
        const cChoice = await this.askQuestion(configQuestion);
        if (cChoice === '2') configChoice = 'overwrite';
        else if (cChoice === '3') configChoice = 'skip';
        else configChoice = 'merge';
      }

      if (fs.existsSync(templatesDir)) {
        const templateQuestion = `\nCustom task templates already exist. What would you like to do?\n  [1] Merge (add new templates, keep existing) (Default)\n  [2] Replace all templates\n  [3] Skip\n> `;
        const tChoice = await this.askQuestion(templateQuestion);
        if (tChoice === '2') templateChoice = 'overwrite';
        else if (tChoice === '3') templateChoice = 'skip';
        else templateChoice = 'merge';
      }

      if (configChoice === 'skip' && templateChoice === 'skip') {
        console.log('\nSkipping all setup steps. Exiting.');
        this.rl.close();
        return;
      }

      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
        console.log('\n✅ Created .vc4pm directory');
      }

      const ideChoice = await this.getIDEConfiguration();

      if (configChoice !== 'skip') {
        const config = await this.getProviderConfig(configChoice, existingConfig);
        fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
        console.log('✅ Wrote configuration file');
      } else {
        console.log('\nSkipping configuration file setup.');
      }

      this.createManifestFile(configDir);
      this.createReadmeFile(configDir);

      if (templateChoice !== 'skip') {
        await this.copyTemplates(configDir, templateChoice);
      } else {
        console.log('\nSkipping template synchronization.');
      }

      console.log('\n🎉 Setup complete!');
      console.log('\nNext steps:');
      console.log('1. Start the server with `npx vc4pm-server` in your project root.');
      console.log('2. Ensure your Notion credentials are correct in .vc4pm/config.json.');
      console.log('3. Customize templates and workflow in .vc4pm/ (optional).');
      
      this.showIDEInstructions(ideChoice);

      this.rl.close();
    } catch (error) {
      console.error('\n❌ Setup failed:', error.message);
      this.rl.close();
      process.exit(1);
    }
  }

  async getProviderConfig(choice, existingConfig) {
    console.log('\n📋 Task Management Provider Setup...');
    const config = {
      "workflow": {
        "statusMapping": {
          "notStarted": "Not started",
          "inProgress": "In progress",
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

    if (choice === 'merge' && existingConfig) {
      const existingApiKey = existingConfig?.providers?.available?.notion?.config?.apiKey;
      const existingDbId = existingConfig?.providers?.available?.notion?.config?.databaseId;
      if (existingApiKey && existingApiKey !== 'your_notion_integration_token_here') {
        config.providers.available.notion.config.apiKey = existingApiKey;
        console.log('✅ Preserved existing Notion API key.');
      }
      if (existingDbId && existingDbId !== 'your_notion_database_id_here') {
        config.providers.available.notion.config.databaseId = existingDbId;
        console.log('✅ Preserved existing Notion Database ID.');
      }
    }

    const needsApiCredentials = !config.providers.available.notion.config.apiKey || config.providers.available.notion.config.apiKey === 'your_notion_integration_token_here';
    const needsDbId = !config.providers.available.notion.config.databaseId || config.providers.available.notion.config.databaseId === 'your_notion_database_id_here';

    if (needsApiCredentials || needsDbId) {
        const setupCredentials = await this.askQuestion('\nConfigure missing API credentials now? (optional) (y/N): ');
        if (setupCredentials.toLowerCase() === 'y') {
          console.log('\n🔑 Notion Configuration');
          if (needsApiCredentials) {
            const apiKey = await this.askQuestion('Notion Integration Token: ');
            if (apiKey) config.providers.available.notion.config.apiKey = apiKey;
          }
          if (needsDbId) {
            const databaseId = await this.askQuestion('Notion Database ID: ');
            if (databaseId) config.providers.available.notion.config.databaseId = databaseId;
          }
        } else {
          console.log('⚠️  Remember to add missing credentials to .vc4pm/config.json');
        }
    }
    return config;
  }

  async copyTemplates(configDir, choice) {
    const templatesDir = path.join(configDir, 'templates');
    const sourceTemplatesDir = path.join(__dirname, '..', 'templates');
    if (!fs.existsSync(sourceTemplatesDir)) {
      console.log('⚠️  Source templates not found, skipping.');
      return;
    }
    if (choice === 'merge') {
        console.log('\n🔄 Merging templates (new files will be added, existing files will be kept)...');
    } else { // Overwrite
        console.log('\n✨ Copying all default templates...');
    }
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
    }
    this.copyDirectory(sourceTemplatesDir, templatesDir, choice === 'merge');
    console.log('✅ Template sync complete.');
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

  createManifestFile(configDir) {
    const manifestPath = path.join(configDir, 'manifest.json');
    const templatePath = path.join(__dirname, 'setup/assets/manifest.json');
    let manifestContent = fs.readFileSync(templatePath, 'utf8');
    const port = process.env.VC4PM_PORT || 65432;
    manifestContent = manifestContent.replace(/%%PORT%%/g, port);
    fs.writeFileSync(manifestPath, manifestContent);
    console.log('✅ Created API manifest file (.vc4pm/manifest.json)');
  }

  createReadmeFile(configDir) {
    const readmePath = path.join(configDir, 'README.md');
    const templatePath = path.join(__dirname, 'setup/assets/README.md');
    let readmeContent = fs.readFileSync(templatePath, 'utf8');
    const port = process.env.VC4PM_PORT || 65432;
    readmeContent = readmeContent.replace(/%%PORT%%/g, port);
    fs.writeFileSync(readmePath, readmeContent);
    console.log('✅ Created usage guide (.vc4pm/README.md)');
  }

  askQuestion(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim() || '1'); // Default to 1 (Merge)
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