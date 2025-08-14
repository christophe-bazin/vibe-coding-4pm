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

      // Get provider configuration
      const config = await this.getProviderConfig();

      // Write configuration
      fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
      console.log('✅ Created configuration file');

      // Copy templates
      await this.copyTemplates(configDir);

      console.log('\n🎉 Setup complete!');
      console.log('\nNext steps:');
      console.log('1. Add your API keys to .vc4pm/config.json');
      console.log('2. Customize templates in .vc4pm/templates/ (optional)');
      console.log('3. Start using VC4PM with your AI assistant');

      this.rl.close();
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      this.rl.close();
      process.exit(1);
    }
  }

  async getProviderConfig() {
    console.log('📋 Provider Configuration');
    console.log('Currently supported: Notion\n');

    const provider = await this.askQuestion('Select provider (notion): ');
    const selectedProvider = provider.toLowerCase() || 'notion';

    if (selectedProvider !== 'notion') {
      console.log('⚠️  Only Notion is currently supported. Using Notion...');
    }

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
          "defaultStatus": "notStarted"
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

    const customizeStatusMapping = await this.askQuestion(
      'Customize status mapping? (y/N): '
    );

    if (customizeStatusMapping.toLowerCase() === 'y') {
      console.log('\nCustomizing status mapping...');
      const notStarted = await this.askQuestion('Status for "notStarted" (Not Started): ');
      const inProgress = await this.askQuestion('Status for "inProgress" (In Progress): ');
      const test = await this.askQuestion('Status for "test" (Test): ');
      const done = await this.askQuestion('Status for "done" (Done): ');

      if (notStarted) config.workflow.statusMapping.notStarted = notStarted;
      if (inProgress) config.workflow.statusMapping.inProgress = inProgress;
      if (test) config.workflow.statusMapping.test = test;
      if (done) config.workflow.statusMapping.done = done;
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