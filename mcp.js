#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load environment variables from MCP config
function loadEnvFromMcpConfig() {
  const configPath = path.join(__dirname, '.claude', 'mcp-config.json');
  
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const serverConfig = config.mcpServers['notion-vibe-coding'];
      
      if (serverConfig && serverConfig.env) {
        process.env.NOTION_API_KEY = serverConfig.env.NOTION_API_KEY;
        process.env.NOTION_DATABASE_ID = serverConfig.env.NOTION_DATABASE_ID;
        process.env.WORKFLOW_CONFIG = JSON.stringify(serverConfig.env.WORKFLOW_CONFIG);
      }
    } catch (e) {
      console.error('Error loading MCP config:', e.message);
    }
  }
}

loadEnvFromMcpConfig();

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage: node mcp.js <tool> [json_args]');
  console.log('Example: node mcp.js create_task \'{"title":"test","taskType":"Bug","description":"desc"}\'');
  process.exit(1);
}

const [tool, jsonArgs = '{}'] = args;
let mcpArgs;

try {
  mcpArgs = JSON.parse(jsonArgs);
} catch (e) {
  // Try with JSON sanitization for common bash escaping issues
  const sanitized = jsonArgs
    .replace(/\\!/g, '!')     // Fix escaped exclamation marks
    .replace(/\\"/g, '"')     // Fix escaped quotes  
    .replace(/\\\\/g, '\\')   // Fix double backslashes
    .replace(/\\'/g, "'");    // Fix escaped single quotes
    
  try {
    mcpArgs = JSON.parse(sanitized);
  } catch (e2) {
    console.error('Invalid JSON arguments:', jsonArgs);
    process.exit(1);
  }
}

// Start MCP server
const server = spawn('npm', ['run', 'start:mcp'], {
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
}, 500);

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
      // Ignore non-JSON lines
    }
  });
});

// Cleanup with longer timeout for long-running operations
setTimeout(() => {
  if (!toolResultReceived) {
    console.log('Timeout reached, killing server...');
  }
  server.kill();
}, 30000); // 30 seconds timeout for hierarchical execution