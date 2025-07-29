#!/usr/bin/env node

const { spawn } = require('child_process');

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
  console.error('Invalid JSON arguments:', jsonArgs);
  process.exit(1);
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
server.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  
  lines.forEach(line => {
    try {
      const response = JSON.parse(line);
      responses++;
      
      if (responses === 2) { // Second response is our tool result
        if (response.result && response.result.content) {
          console.log(response.result.content[0].text);
        } else if (response.error) {
          console.error('Error:', response.error.message);
        }
        server.kill();
      }
    } catch (e) {
      // Ignore non-JSON lines
    }
  });
});

// Cleanup
setTimeout(() => server.kill(), 5000);