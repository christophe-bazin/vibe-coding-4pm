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

      // Check if already configured
      if (fs.existsSync(configFile)) {
        const overwrite = await this.askQuestion(
          '⚠️  VC4PM is already configured in this project. Overwrite? (y/N): '
        );
        if (overwrite.toLowerCase() !== 'y') {
          console.log('Setup cancelled.');
          this.rl.close();
          return;
        }
      }

      // Create .vc4pm directory
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
        console.log('✅ Created .vc4pm directory');
      }

      // Get IDE configuration
      const ideChoice = await this.getIDEConfiguration();

      // Get provider configuration
      const config = await this.getProviderConfig();

      // Write configuration
      fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
      console.log('✅ Created configuration file');

      // Create manifest file
      this.createManifestFile(configDir);

      // Copy templates
      await this.copyTemplates(configDir);

      console.log('\n🎉 Setup complete!');
      console.log('\nNext steps:');
      if (!fs.readFileSync(configFile, 'utf8').includes('your_notion_integration_token_here')) {
        console.log('1. ✅ Notion credentials configured');
        console.log('2. Customize status mapping in .vc4pm/config.json (optional)');
        console.log('3. Customize templates in .vc4pm/templates/ (optional)');
      } else {
        console.log('1. Add your Notion credentials to .vc4pm/config.json');
        console.log('2. Customize status mapping in .vc4pm/config.json (optional)');
        console.log('3. Customize templates in .vc4pm/templates/ (optional)');
      }
      
      // Show IDE-specific instructions
      this.showIDEInstructions(ideChoice);

      this.rl.close();
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      this.rl.close();
      process.exit(1);
    }
  }

  async getProviderConfig() {
    console.log('📋 Task Management Provider');
    console.log('Currently supported: Notion\n');

    // Load config from example file and copy only Notion
    const exampleConfigPath = path.join(__dirname, '..', '.vc4pm', 'config.example.json');
    let config;
    
    if (fs.existsSync(exampleConfigPath)) {
      const exampleContent = fs.readFileSync(exampleConfigPath, 'utf8');
      const fullConfig = JSON.parse(exampleContent);
      
      // Create config with only Notion provider
      config = {
        "workflow": fullConfig.workflow,
        "providers": {
          "default": "notion",
          "available": {
            "notion": fullConfig.providers.available.notion
          }
        }
      };
      
      console.log('✅ Loaded configuration template');
    } else {
      console.log('⚠️  Config example not found, using fallback configuration');
      config = {
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
    }

    // Optional API credentials setup
    const setupCredentials = await this.askQuestion(
      'Configure API credentials now? (optional, you can add them later in .vc4pm/config.json) (y/N): '
    );

    if (setupCredentials.toLowerCase() === 'y') {
      console.log('\n🔑 Notion Configuration');
      const apiKey = await this.askQuestion('Notion Integration Token (optional, you may add this later in config.json): ');
      const databaseId = await this.askQuestion('Notion Database ID (optional, you may add this later in config.json): ');

      if (apiKey) {
        config.providers.available.notion.config.apiKey = apiKey;
      }
      if (databaseId) {
        config.providers.available.notion.config.databaseId = databaseId;
      }

      if (apiKey && databaseId) {
        console.log('✅ API credentials configured');
      } else {
        console.log('⚠️  You can add missing credentials later in .vc4pm/config.json');
      }
    } else {
      console.log('⚠️  Remember to add your API credentials to .vc4pm/config.json');
    }


    return config;
  }

  async copyTemplates(configDir) {
    const templatesDir = path.join(configDir, 'templates');
    const sourceTemplatesDir = path.join(__dirname, '..', 'templates');
    const exampleConfigPath = path.join(__dirname, '..', '.vc4pm', 'config.example.json');

    // Copy config example if it exists
    if (fs.existsSync(exampleConfigPath)) {
      const exampleDestPath = path.join(configDir, 'config.example.json');
      fs.copyFileSync(exampleConfigPath, exampleDestPath);
      console.log('✅ Copied config.example.json for reference');
    }

    if (!fs.existsSync(sourceTemplatesDir)) {
      console.log('⚠️  Source templates not found, skipping template copy');
      return;
    }

    // Create templates directory
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
    }

    // Copy templates recursively
    this.copyDirectory(sourceTemplatesDir, templatesDir);
    console.log('✅ Copied templates for local customization');
  }

  copyDirectory(source, destination) {
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
    }

    const items = fs.readdirSync(source);
    
    for (const item of items) {
      const sourcePath = path.join(source, item);
      const destPath = path.join(destination, item);
      
      if (fs.statSync(sourcePath).isDirectory()) {
        this.copyDirectory(sourcePath, destPath);
      } else {
        fs.copyFileSync(sourcePath, destPath);
      }
    }
  }

  async getIDEConfiguration() {
    console.log('🛠️  Development Environment');
    console.log('Which AI-powered editor will you use with VC4PM?\n');
    console.log('1. Claude Code');
    console.log('2. Cursor');
    console.log('3. VS Code (with MCP extension)');
    console.log('4. Zed (experimental MCP)');
    console.log('5. Continue.dev');
    console.log('6. Manual MCP configuration\n');

    const choice = await this.askQuestion('Select option (1-6): ');
    
    switch (choice) {
      case '1':
        return 'claude-code';
      case '2':
        return 'cursor';
      case '3':
        return 'vscode';
      case '4':
        return 'zed';
      case '5':
        return 'continue';
      case '6':
      default:
        return 'manual';
    }
  }

  showIDEInstructions(ideChoice) {
    console.log('\n📖 Setup Instructions:');
    console.log('=======================');

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
        console.log('✅ Ready! Try: "Create a task for adding user authentication"');
        break;

      case 'cursor':
        console.log('\n🟡 Cursor:');
        console.log('1. Install the MCP extension for Cursor');
        console.log('2. Add to your Cursor MCP configuration:');
        console.log('   {');
        console.log('     "mcpServers": {');
        console.log('       "vc4pm": {');
        console.log('         "command": "vc4pm-server"');
        console.log('       }');
        console.log('     }');
        console.log('   }');
        console.log('3. Run Cursor from your project directory');
        break;

      case 'vscode':
        console.log('\n🔵 VS Code (with MCP extension):');
        console.log('1. Install an MCP extension for VS Code');
        console.log('2. Add to your MCP configuration:');
        console.log('   {');
        console.log('     "mcp.servers": {');
        console.log('       "vc4pm": {');
        console.log('         "command": "vc4pm-server",');
        console.log('         "cwd": "${workspaceFolder}"');
        console.log('       }');
        console.log('     }');
        console.log('   }');
        break;

      case 'zed':
        console.log('\n🟢 Zed (experimental MCP support):');
        console.log('1. Update to latest Zed version with MCP support');
        console.log('2. Add to your Zed configuration:');
        console.log('   {');
        console.log('     "assistant": {');
        console.log('       "mcp_servers": {');
        console.log('         "vc4pm": {');
        console.log('           "command": "vc4pm-server"');
        console.log('         }');
        console.log('       }');
        console.log('     }');
        console.log('   }');
        break;

      case 'continue':
        console.log('\n🟣 Continue.dev:');
        console.log('1. Install Continue VS Code extension');
        console.log('2. Add to your continue_config.json:');
        console.log('   {');
        console.log('     "mcpServers": {');
        console.log('       "vc4pm": {');
        console.log('         "command": "vc4pm-server"');
        console.log('       }');
        console.log('     }');
        console.log('   }');
        break;

      case 'manual':
      default:
        console.log('\n🔧 Manual MCP Configuration:');
        console.log('Basic configuration for any MCP-compatible editor:');
        console.log('- Command: "vc4pm-server"');
        console.log('- Working directory: project root with .vc4pm/config.json');
        console.log('- See complete documentation for your editor');
        break;
    }
    
    console.log('\n📚 For detailed setup instructions, see:');
    console.log('https://github.com/christophe-bazin/vibe-coding-4pm/blob/master/docs/advanced-usage.md#development-environment-integration');
  }

  createManifestFile(configDir) {
    const manifestPath = path.join(configDir, 'manifest.json');
    const manifest = {
      spec_version: '1.0',
      type: 'mcp-server',
      connection: {
        type: 'http',
        url: `http://localhost:${process.env.VC4PM_PORT || 65432}/mcp`
      },
      protocol: {
        type: 'json-rpc-2.0',
        methods: {
          call_tool: {
            name: 'tools/call',
            request_format: {
              params: {
                name: '{tool_name}',
                arguments: '${tool_arguments_object}'
              }
            }
          },
          list_tools: 'tools/list'
        },
        headers: {
          Accept: 'application/json, text/event-stream'
        }
      },
      tools: [
        { name: 'execute_task', description: 'Execute task', inputSchema: { type: 'object', properties: { taskId: { type: 'string' } }, required: ['taskId'] } },
        { name: 'create_task', description: 'Create new task using appropriate workflow template', inputSchema: { type: 'object', properties: { title: { type: 'string' }, taskType: { type: 'string' }, description: { type: 'string' }, adaptedWorkflow: { type: 'string', description: 'Optional: custom workflow template' }, provider: { type: 'string', description: 'Optional: provider to use (notion, linear, github)' } }, required: ['title', 'taskType', 'description'] } },
        { name: 'get_task', description: 'Get task info', inputSchema: { type: 'object', properties: { taskId: { type: 'string' }, provider: { type: 'string', description: 'Optional: provider to use' } }, required: ['taskId'] } },
        { name: 'update_task', description: 'Update task title, type and/or status', inputSchema: { type: 'object', properties: { taskId: { type: 'string' }, title: { type: 'string' }, taskType: { type: 'string' }, status: { type: 'string' }, provider: { type: 'string', description: 'Optional: provider to use' } }, required: ['taskId'] } },
        { name: 'get_task_template', description: 'Get task template for adaptation', inputSchema: { type: 'object', properties: { taskType: { type: 'string' } }, required: ['taskType'] } },
        { name: 'analyze_todos', description: 'Analyze todos', inputSchema: { type: 'object', properties: { taskId: { type: 'string' }, includeHierarchy: { type: 'boolean' } }, required: ['taskId'] } },
        { name: 'update_todos', description: 'Batch update todos.', inputSchema: { type: 'object', properties: { taskId: { type: 'string' }, updates: { type: 'array' } }, required: ['taskId', 'updates'] } },
        { name: 'generate_summary', description: 'Generate summary', inputSchema: { type: 'object', properties: { taskId: { type: 'string' } }, required: ['taskId'] } },
        { name: 'get_summary_template', description: 'Get summary template', inputSchema: { type: 'object', properties: { taskId: { type: 'string' } }, required: ['taskId'] } },
        { name: 'append_summary', description: 'Append AI-adapted summary to task.', inputSchema: { type: 'object', properties: { taskId: { type: 'string' }, adaptedSummary: { type: 'string' } }, required: ['taskId', 'adaptedSummary'] } },
        { name: 'read_notion_page', description: 'Read a Notion page and its directly linked pages', inputSchema: { type: 'object', properties: { pageId: { type: 'string' }, includeLinkedPages: { type: 'boolean', default: true }, provider: { type: 'string', description: 'Optional: provider to use' } }, required: ['pageId'] } },
      ]
    };

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('✅ Created API manifest file (.vc4pm/manifest.json)');
  }

  askQuestion(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }
}

// Run setup if called directly
if (require.main === module) {
  const setup = new VC4PMSetup();
  setup.setup().catch((error) => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });
}

module.exports = VC4PMSetup;