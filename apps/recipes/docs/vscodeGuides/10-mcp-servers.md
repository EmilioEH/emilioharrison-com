# Add and Manage MCP Servers

MCP and tools provide a gateway to external services and specialized tools through Model Context Protocol (MCP). This extends the agent's capabilities beyond code and the terminal, and enable it to interact with databases, APIs, and other development tools. MCP Apps let you define rich user experiences, like dashboards or forms, to facilitate complex interactions.

## What Is MCP?

The Model Context Protocol (MCP) is a standard for connecting AI agents to external tools, databases, and services. Instead of limiting the AI to built-in capabilities, MCP servers extend what the AI can do by providing access to specialized tools.

### Common MCP Server Examples

- **Database Tools**: Query and manage databases
- **API Clients**: Fetch data from external APIs
- **Project Management**: Interact with issue trackers and project boards
- **DevOps Tools**: Deploy, monitor, and manage infrastructure
- **Document Systems**: Search and access documentation
- **Code Quality**: Run linters, formatters, and analysis tools

## Install and Configure MCP Servers

### From the Gallery

VS Code provides a gallery of pre-configured MCP servers:

1. Open Chat (Cmd+Shift+L)
2. Click the Settings icon (gear) → Configure Chat
3. Select "Add MCP Server"
4. Browse the gallery and select a server
5. Configure required credentials

### Manual Installation

You can also manually configure MCP servers by editing your configuration file.

Create or edit `./.mcp/mcp.json` in your workspace:

```json
{
  "servers": {
    "sqlite": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-sqlite", "--db-path", "./data.db"]
    },
    "postgres": {
      "command": "node",
      "args": ["./custom-postgres-server.js"],
      "env": {
        "DATABASE_URL": "postgresql://user:password@localhost/dbname"
      }
    },
    "github-api": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

### MCP Server Configuration Schema

| Property   | Type    | Description                                  |
| ---------- | ------- | -------------------------------------------- |
| `command`  | string  | Path to the server executable or npm command |
| `args`     | array   | Command-line arguments passed to the server  |
| `env`      | object  | Environment variables for the server         |
| `timeout`  | number  | Timeout in milliseconds (default: 30000)     |
| `disabled` | boolean | Whether to disable this server               |

## Common MCP Servers

### SQLite Server

Query local SQLite databases:

```json
{
  "sqlite": {
    "command": "npx",
    "args": ["@modelcontextprotocol/server-sqlite", "--db-path", "./app.db"]
  }
}
```

Use in chat: "Query the users table" or "Count records by status"

### PostgreSQL Server

Connect to PostgreSQL databases:

```json
{
  "postgres": {
    "command": "npx",
    "args": ["@modelcontextprotocol/server-postgres"],
    "env": {
      "PG_CONNECTION_STRING": "postgresql://user:pass@localhost/mydb"
    }
  }
}
```

### GitHub API Server

Interact with GitHub repositories:

```json
{
  "github": {
    "command": "npx",
    "args": ["@modelcontextprotocol/server-github"],
    "env": {
      "GITHUB_PERSONAL_ACCESS_TOKEN": "${GH_TOKEN}"
    }
  }
}
```

Use in chat: "List open pull requests", "Comment on issue #42"

### File System Server

Read and search files in your workspace:

```json
{
  "filesystem": {
    "command": "npx",
    "args": ["@modelcontextprotocol/server-filesystem", "--root-dir", "${workspaceFolder}"]
  }
}
```

Use in chat: "Find all TODO comments", "Search for usage of function X"

## MCP Server Capabilities

MCP servers can provide three types of capabilities:

### Tools

Functions the AI can call to take actions:

```json
{
  "tools": [
    {
      "name": "query-database",
      "description": "Execute a SQL query against the database",
      "inputSchema": {
        "type": "object",
        "properties": {
          "query": { "type": "string" }
        }
      }
    }
  ]
}
```

### Resources

Data or documents the AI can read and reference:

```json
{
  "resources": [
    {
      "uri": "database://tables",
      "name": "Database Tables",
      "description": "Schema information for all database tables"
    }
  ]
}
```

### Prompts

Pre-configured prompts that guide the AI for specific tasks:

```json
{
  "prompts": [
    {
      "name": "optimize-query",
      "description": "Optimize a SQL query for performance"
    }
  ]
}
```

## Manage MCP Servers

### View Connected Servers

In the Chat view, click Settings (gear icon) → Diagnostics to see:

- All installed and configured servers
- Connection status
- Available tools per server
- Any configuration errors

### Enable/Disable Servers

Temporarily disable a server in `mcp.json`:

```json
{
  "servers": {
    "experimental-server": {
      "disabled": true,
      "command": "node",
      "args": ["./experimental-server.js"]
    }
  }
}
```

### Update Server Configuration

Modify `mcp.json` to change server settings:

```json
{
  "servers": {
    "postgres": {
      "command": "node",
      "args": ["./postgres-server.js"],
      "env": {
        "DB_HOST": "production.example.com",
        "DB_PORT": "5432"
      },
      "timeout": 60000
    }
  }
}
```

Reload the chat window (Ctrl+Shift+L) to apply changes.

## Trust Model

MCP servers require trust for security:

1. **System MCP Servers**: Pre-approved by VS Code
2. **Organization MCP Servers**: Approved by your organization's policies
3. **Custom/Third-party**: Require explicit user approval

### Approve an MCP Server

When connecting a new server:

1. Review the server's requested permissions
2. Understand what tools and resources it will access
3. Approve or deny the connection
4. Grant any required environment variables or credentials

## Use MCP Servers in Chat

Once configured, use MCP server tools naturally in conversation:

```
User: "Query the users table and show me active accounts"

AI: I'll query your database for active user accounts.
[Calls: database.query tool with SELECT query]
```

### Example Interactions

**Database Queries:**

```
What's the distribution of users by country?
```

**API Integrations:**

```
Create a new GitHub issue titled "Fix login bug" in the engineering-team repo
```

**File Operations:**

```
Search all Python files for imports of the deprecated module
```

## Environment Variables

MCP servers often require sensitive credentials. Provide them securely:

### Using Workspace Settings

```json
{
  "servers": {
    "github": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

### Using Environment File

Create a `.env.mcp` file (not committed to version control):

```bash
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
DATABASE_URL=postgresql://user:pass@localhost/db
API_KEY=sk_xxxxxxxxxxxxxxxx
```

### Using System Environment

Set environment variables in your terminal before launching VS Code:

```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
export DATABASE_URL=postgresql://user:pass@localhost/db
code .
```

## Sync MCP Configuration Across Devices

Store your MCP configuration in version control:

1. Commit `.mcp/mcp.json` to your repository
2. Exclude sensitive data (use environment variables)
3. Team members automatically get the same server configuration
4. Credentials are loaded from team's secret management system

Example workflow:

```bash
# Version control the configuration
git add .mcp/mcp.json
git commit -m "Add production database MCP server"

# Don't commit credentials
echo ".mcp/.env" >> .gitignore
```

## Troubleshooting MCP Servers

### Server Not Connecting

1. Check that the command is executable
2. Verify all required environment variables are set
3. Review server output in the Chat diagnostics view
4. Check network connectivity for remote servers

### Tool Not Available

1. Verify the server is enabled in `mcp.json`
2. Check the Chat diagnostics view for server status
3. Ensure the server has loaded successfully
4. Review server documentation for available tools

### Permission Denied

1. Verify the server process has necessary permissions
2. Check file system access for file-based servers
3. Verify database credentials and connection string
4. Review application-level access controls

### Performance Issues

1. Increase the timeout in configuration
2. Optimize queries or API calls
3. Consider running servers on separate machines
4. Monitor server resource usage

## Advanced: Create Custom MCP Servers

Build your own MCP server to extend capabilities:

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

const server = new Server({
  name: 'my-custom-server',
  version: '1.0.0',
})

// Define tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'custom-action',
      description: 'Does something useful',
      inputSchema: {
        type: 'object',
        properties: {
          param: { type: 'string' },
        },
      },
    },
  ],
}))

// Define resources
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: 'custom://resource',
      name: 'My Resource',
      description: 'A useful resource',
    },
  ],
}))

// Start the server
const transport = new StdioServerTransport()
await server.connect(transport)
```

## Related Resources

- [Model Context Protocol (MCP) Specification](https://modelcontextprotocol.io/)
- [MCP Server Examples](https://github.com/modelcontextprotocol/servers)
- [Customize AI in Visual Studio Code](https://code.visualstudio.com/docs/copilot/customization/overview)
- [Create custom instructions](https://code.visualstudio.com/docs/copilot/customization/custom-instructions)
- [Create custom agents](https://code.visualstudio.com/docs/copilot/customization/custom-agents)
