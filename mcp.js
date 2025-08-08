#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load configuration from .vc4pm/config.json
function loadConfig() {
  const configPath = path.join(process.cwd(), '.vc4pm', 'config.json');
  
  if (!fs.existsSync(configPath)) {
    console.error('No .vc4pm/config.json found. Run: vc4pm --help for setup instructions.');
    process.exit(1);
  }
  
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Set environment variables for the server
    process.env.WORKFLOW_CONFIG = JSON.stringify(config.workflow);
    process.env.PROVIDERS_CONFIG = JSON.stringify(config.providers);
    
    return config;
  } catch (e) {
    console.error('Error loading config:', e.message);
    process.exit(1);
  }
}

// Sanitize JSON from AI
function sanitizeJson(jsonStr) {
  return jsonStr
    .replace(/\\!/g, '!')      // Remove \! 
    .replace(/\\'/g, "'")      // Remove \'
    .replace(/\n/g, '\\n')     // Escape real newlines
    .replace(/\t/g, '\\t')     // Escape real tabs
    .replace(/\r/g, '\\r');    // Escape real carriage returns
}

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage: node mcp.js <tool> [options]');
  console.log('');
  console.log('Options:');
  console.log('  JSON format: node mcp.js create_task \'{"title":"test","taskType":"Bug"}\'');
  console.log('  Named args:  node mcp.js create_task --title "Hello World" --type Feature --desc "Description"');
  console.log('  With file:   node mcp.js create_task --title "Test" --type Bug --workflow-file template.md');
  process.exit(1);
}

const tool = args[0];
let mcpArgs = {};

// Parse arguments
if (args.length === 2 && !args[1].startsWith('--')) {
  // JSON format
  const jsonArgs = args[1];
  try {
    mcpArgs = JSON.parse(jsonArgs);
  } catch (e) {
    const sanitizedJson = sanitizeJson(jsonArgs);
    try {
      mcpArgs = JSON.parse(sanitizedJson);
    } catch (e2) {
      console.error('JSON parsing failed:');
      console.error('Original:', jsonArgs.substring(0, 200));
      console.error('Sanitized:', sanitizedJson.substring(0, 200));
      console.error('Error:', e2.message);
      process.exit(1);
    }
  }
} else {
  // Named arguments format
  for (let i = 1; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];
    
    if (!key.startsWith('--') || !value) {
      console.error(`Invalid argument format: ${key} ${value || ''}`);
      process.exit(1);
    }
    
    const cleanKey = key.replace('--', '');
    
    // Map common argument names to MCP parameter names
    switch (cleanKey) {
      case 'title':
        mcpArgs.title = value;
        break;
      case 'type':
        mcpArgs.taskType = value;
        break;
      case 'desc':
      case 'description':
        mcpArgs.description = value;
        break;
      case 'workflow-file':
        if (fs.existsSync(value)) {
          mcpArgs.adaptedWorkflow = fs.readFileSync(value, 'utf8');
        } else {
          console.error(`Workflow file not found: ${value}`);
          process.exit(1);
        }
        break;
      case 'workflow':
        mcpArgs.adaptedWorkflow = value;
        break;
      default:
        mcpArgs[cleanKey] = value;
    }
  }
}

// Load config first
const config = loadConfig();

// Start MCP server directly
const serverPath = path.join(__dirname, 'dist', 'server.js');
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'inherit'],
  cwd: __dirname
});

// MCP protocol messages
const initMessage = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: { tools: {} },
    clientInfo: { name: "mcp-generic", version: "1.0.0" }
  }
};

const toolMessage = {
  jsonrpc: "2.0",
  id: 2,
  method: "tools/call",
  params: {
    name: tool,
    arguments: mcpArgs
  }
};

// Send initialization
server.stdin.write(JSON.stringify(initMessage) + '\n');

// Wait then send tool call
setTimeout(() => {
  server.stdin.write(JSON.stringify(toolMessage) + '\n');
}, 1000);

// Handle responses
let responses = 0;
let toolResultReceived = false;

server.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  lines.forEach(line => {
    try {
      const response = JSON.parse(line);
      responses++;
      
      // Check if this is our tool result (has id: 2)
      if (response.id === 2 && !toolResultReceived) {
        toolResultReceived = true;
        
        if (response.result && response.result.content) {
          console.log(response.result.content[0].text);
        } else if (response.error) {
          console.error('Error:', response.error.message);
        }
        
        // Give a moment for any final output, then kill
        setTimeout(() => server.kill(), 100);
      }
    } catch (e) {
      // Ignore non-JSON lines (logs from server)
    }
  });
});

// Cleanup timeout
setTimeout(() => {
  if (!toolResultReceived) {
    console.log('Timeout reached, killing server...');
  }
  server.kill();
}, 30000);