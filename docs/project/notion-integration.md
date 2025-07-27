# Notion Integration

## Setup Requirements

### 1. Notion Integration Creation

1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Fill in basic information:
   - **Name**: "Development Workflow MCP"
   - **Logo**: Optional
   - **Associated workspace**: Select your workspace

4. Configure capabilities:
   - ✅ **Read content**
   - ✅ **Update content** 
   - ✅ **Insert content**
   - ❌ User information (not needed)

5. Save and copy the **Internal Integration Token**

### 2. Environment Configuration

```bash
# Add to your environment
export NOTION_API_KEY="secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

For development:
```bash
# Create .env file (don't commit to git)
echo "NOTION_API_KEY=your_token_here" > .env
```

### 3. Notion Database Setup

Create a database with these properties:

#### Required Properties
- **Title** (Title): Task name
- **Status** (Select): Must match your config.json statuses
- **Type** (Select): Must match your config.json taskTypes

#### Recommended Properties
- **Priority** (Select): High, Medium, Low
- **Assignee** (Person): Who's working on it
- **Due Date** (Date): Deadline
- **Tags** (Multi-select): Additional categorization

#### Status Options Setup
In your Status property, create options that match your `config.json`:
- Check the `statuses` array in your configuration
- Default configuration uses: "Not Started", "In Progress", "Test", "Done"
- Colors are optional but help visual organization

#### Type Options Setup
In your Type property, create options that match the `taskTypes` in your config:
- Check the `taskTypes` array in your configuration  
- Default configuration uses: "feature", "bug", "refactor"

### 4. Page Sharing

**Critical Step**: Share your database with the integration

1. Open your database in Notion
2. Click **Share** button (top right)
3. Click **Invite**
4. Search for your integration name
5. Select **Can edit**
6. Click **Invite**

Without this step, the MCP server cannot access your tasks.

## Configuration Alignment

### Config.json Synchronization

Your `config.json` must match your Notion setup:

```json
{
  "board": {
    "statuses": ["your", "notion", "status", "names"]
  },
  "taskTypes": ["your", "task", "types"]
}
```

See the actual `config.json` file for current default values.

### Status Property Name

The MCP server expects a property named **"Status"** (case-sensitive). If you use a different name, you'll need to update the server code or rename your property.

### Verification Steps

1. **Test API Access**:
```bash
# Test with curl (replace YOUR_TOKEN and PAGE_ID)
curl -X GET \
  'https://api.notion.com/v1/pages/YOUR_PAGE_ID' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Notion-Version: 2022-06-28'
```

2. **Check Property Names**:
```bash
# List database properties
curl -X GET \
  'https://api.notion.com/v1/databases/YOUR_DATABASE_ID' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Notion-Version: 2022-06-28'
```

## Common Integration Issues

### Permission Errors
**Error**: `object_not_found` or `unauthorized`

**Solutions**:
- Verify integration is shared with database/page
- Check API token is correct
- Ensure token has required capabilities
- Confirm workspace access

### Property Not Found
**Error**: Property "Status" doesn't exist

**Solutions**:
- Check property name spelling (case-sensitive)
- Verify property type is "Select"
- Ensure all status options exist
- Check database schema matches config

### Invalid Status Values
**Error**: Status "xyz" is not a valid option

**Solutions**:
- Add missing status to Notion select options
- Update config.json to match Notion options
- Check for typos in status names
- Verify exact string matching

### URL Parsing Issues
**Error**: Invalid Notion URL format

**Solutions**:
- Use full Notion URLs, not shortened ones
- Ensure URL includes page ID
- Check URL format: `https://notion.so/page-id`
- Test with different URL formats if needed

## URL Formats Supported

The server supports these Notion URL formats:

```
https://www.notion.so/workspace/Page-Title-1234567890abcdef
https://notion.so/1234567890abcdef123456789012345
https://www.notion.so/1234567890abcdef?v=12345
```

### URL Extraction Examples

```typescript
// These all extract the same page ID
parseNotionUrl("https://www.notion.so/My-Task-123abc");
parseNotionUrl("https://notion.so/123abc");
parseNotionUrl("https://notion.so/workspace?p=123abc");
```

## API Rate Limits

Notion API has rate limits:
- **3 requests per second** per integration
- **Burst capacity** for short spikes
- **Retry-After** headers on limit exceeded

### Handling in Code
```typescript
// Built-in retry logic
try {
  await this.notion.pages.update(params);
} catch (error) {
  if (error.code === 'rate_limited') {
    // Exponential backoff retry
    await this.retryWithBackoff(() => 
      this.notion.pages.update(params)
    );
  }
}
```

## Security Best Practices

### Token Management
- **Never commit** API tokens to version control
- **Use environment variables** for production
- **Rotate tokens** periodically
- **Limit token scope** to minimum required

### Data Handling
- **No logging** of sensitive task content
- **Validate inputs** before API calls
- **Sanitize outputs** from Notion
- **Handle errors** gracefully without exposing internals

### Network Security
- **Use HTTPS** for all API calls (Notion enforces this)
- **Validate SSL certificates**
- **Consider proxy/firewall** rules if needed

## Monitoring and Debugging

### Logging Strategy
```typescript
// Good: Log operations without sensitive data
console.log(`Updating task ${taskId} to status ${newStatus}`);

// Bad: Never log tokens or detailed content
console.log(`API call with token ${apiToken}`); // ❌
```

### Error Tracking
- Monitor API response times
- Track rate limit hits
- Log permission errors
- Alert on integration failures

### Health Checks
```bash
# Simple integration health check
curl -X GET \
  'https://api.notion.com/v1/users/me' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Notion-Version: 2022-06-28'
```

## Development Workflow

### Local Testing
1. Create test database in Notion
2. Share with integration
3. Use test page IDs for development
4. Validate all status transitions work

### Staging Environment
1. Separate Notion workspace for staging
2. Different integration token
3. Test with realistic data
4. Verify before production deployment

### Production Deployment
1. Production Notion workspace
2. Secure token management
3. Monitoring and alerting setup
4. Backup/recovery procedures

## Troubleshooting Guide

### Quick Diagnostics
```bash
# Test basic connectivity
node -e "
const { Client } = require('@notionhq/client');
const notion = new Client({ auth: process.env.NOTION_API_KEY });
notion.users.me().then(console.log).catch(console.error);
"
```

### Common Error Codes
- `400`: Bad request (check parameters)
- `401`: Unauthorized (check token)
- `403`: Forbidden (check permissions)
- `404`: Not found (check page/database exists and is shared)
- `429`: Rate limited (implement backoff)
- `500`: Notion server error (retry later)

### Debug Mode
Enable detailed logging for development:
```typescript
// Add to config for debugging
{
  "debug": true,
  "logLevel": "verbose"
}
```