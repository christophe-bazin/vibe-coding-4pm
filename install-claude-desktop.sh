#!/bin/bash

# Installation script for Claude Desktop MCP configuration
# This script generates Claude Desktop compatible config from the main config file

set -e

CONFIG_FILE="mcp-config.example.json"
OUTPUT_FILE="claude-desktop-config.json"

echo "🔧 Installing MCP configuration for Claude Desktop..."

# Check if source config exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Error: $CONFIG_FILE not found"
    echo "💡 Make sure you're running this from the notion-vibe-coding directory"
    exit 1
fi

# Parse the config and convert WORKFLOW_CONFIG object to JSON string
echo "📝 Generating Claude Desktop compatible configuration..."

node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('$CONFIG_FILE', 'utf8'));

// Convert WORKFLOW_CONFIG object to JSON string for Claude Desktop
const workflowConfig = config.mcpServers['notion-vibe-coding'].env.WORKFLOW_CONFIG;
config.mcpServers['notion-vibe-coding'].env.WORKFLOW_CONFIG = JSON.stringify(workflowConfig);

// Write the converted config
fs.writeFileSync('$OUTPUT_FILE', JSON.stringify(config, null, 2));
console.log('✅ Configuration generated successfully');
"

echo ""
echo "🎉 Claude Desktop configuration ready!"
echo ""
echo "📋 Next steps:"
echo "1. Copy the content of $OUTPUT_FILE"
echo "2. Paste it into your Claude Desktop MCP configuration"
echo "3. Update the API keys and database ID with your values"
echo ""
echo "📄 Configuration content:"
echo "----------------------------------------"
cat "$OUTPUT_FILE"
echo "----------------------------------------"
echo ""
echo "💡 Tip: You can copy this directly with:"
echo "   cat $OUTPUT_FILE | pbcopy  (macOS)"
echo "   cat $OUTPUT_FILE | xclip -selection clipboard  (Linux)"