# Use Hooks for Lifecycle Automation

Hooks enable you to execute custom shell commands at key lifecycle points during agent sessions. Hooks provide deterministic, code-driven automation that runs regardless of how the agent is prompted.

## What Are Hooks?

Hooks are automated triggers that run at specific points in an agent's lifecycle. They allow you to:

- Enforce security policies
- Automate code quality workflows
- Create audit trails
- Inject project context
- Validate changes before they're applied

Hooks run custom shell scripts that have access to the current session context, file changes, and tool invocations.

## Hook Lifecycle Events

Hooks can run at eight different lifecycle points:

| Event              | When It Fires               | Use Case                              |
| ------------------ | --------------------------- | ------------------------------------- |
| `SessionStart`     | When a chat session begins  | Initialize context, load project info |
| `UserPromptSubmit` | When user submits a prompt  | Validate input, add context           |
| `PreToolUse`       | Before a tool executes      | Validate/block dangerous commands     |
| `PostToolUse`      | After a tool completes      | Process results, update state         |
| `PreCompact`       | Before context is compacted | Archive data, save state              |
| `SubagentStart`    | When a subagent is invoked  | Prepare subagent context              |
| `SubagentStop`     | When a subagent completes   | Process subagent results              |
| `Stop`             | When session ends           | Cleanup, logging, analytics           |

## Configure Hooks

Hooks are defined in a `hooks.json` configuration file in your workspace:

Create `.github/hooks.json`:

```json
{
  "hooks": [
    {
      "event": "SessionStart",
      "command": ["bash", "scripts/hooks/session-start.sh"],
      "timeout": 5000,
      "continueOnError": true
    },
    {
      "event": "PreToolUse",
      "command": ["bash", "scripts/hooks/pre-tool-use.sh"],
      "timeout": 2000,
      "continueOnError": false
    },
    {
      "event": "Stop",
      "command": ["bash", "scripts/hooks/session-stop.sh"],
      "timeout": 5000,
      "continueOnError": true
    }
  ]
}
```

### Hook Properties

| Property          | Type    | Description                              |
| ----------------- | ------- | ---------------------------------------- |
| `event`           | string  | Lifecycle event to hook into             |
| `command`         | array   | Command to execute (command + args)      |
| `timeout`         | number  | Timeout in milliseconds (default: 10000) |
| `continueOnError` | boolean | Continue if hook fails (default: true)   |

## Hook Event Details

### SessionStart

Fires when a chat session begins. Use to initialize context or load project information.

**Input:**

```json
{
  "sessionId": "session-123",
  "userId": "user-456",
  "workspaceFolder": "/path/to/project",
  "agentName": "Code Assistant"
}
```

**Output:**

```json
{
  "status": "success",
  "context": {
    "projectName": "my-app",
    "teamName": "engineering"
  }
}
```

**Example: Load Project Context**

```bash
#!/bin/bash
# scripts/hooks/session-start.sh

# Load project metadata
PROJECT_INFO=$(jq -r '.workspaceFolder' | xargs -I {} cat {}/package.json)

# Return context to be included in session
echo "{"
echo "  \"status\": \"success\","
echo "  \"context\": $PROJECT_INFO"
echo "}"
```

### UserPromptSubmit

Fires when the user submits a prompt. Use to validate input or add context.

**Input:**

```json
{
  "prompt": "Write a new test",
  "sessionId": "session-123",
  "context": {
    "selectedFile": "src/utils/helpers.ts"
  }
}
```

**Output:**

```json
{
  "status": "success",
  "action": "allow",
  "modifiedPrompt": "Write a comprehensive test for src/utils/helpers.ts"
}
```

**Actions:**

- `allow` - Accept the prompt
- `deny` - Reject the prompt
- `modify` - Accept but modify the prompt

### PreToolUse

Fires before a tool executes. Use to validate commands or block dangerous operations.

**Input:**

```json
{
  "tool": "terminal",
  "command": "rm -rf /",
  "args": [],
  "sessionId": "session-123"
}
```

**Output:**

```json
{
  "status": "success",
  "action": "deny",
  "reason": "Dangerous command detected"
}
```

**Actions:**

- `allow` - Execute the tool
- `deny` - Block execution
- `ask` - Ask user for approval
- `approve` - Auto-approve with notification

**Example: Block Dangerous Commands**

```bash
#!/bin/bash
# scripts/hooks/pre-tool-use.sh

COMMAND=$(jq -r '.command' < /dev/stdin)

# Block destructive commands
if [[ $COMMAND =~ ^(rm|rmdir|mkfs|dd).*-rf ]]; then
  echo "{"
  echo "  \"status\": \"success\","
  echo "  \"action\": \"deny\","
  echo "  \"reason\": \"Recursive deletion blocked for safety\""
  echo "}"
  exit 0
fi

# Block production deployments without approval
if [[ $COMMAND =~ deploy.*production ]]; then
  echo "{"
  echo "  \"status\": \"success\","
  echo "  \"action\": \"ask\","
  echo "  \"reason\": \"Production deployment requires approval\""
  echo "}"
  exit 0
fi

# Allow other commands
echo "{"
echo "  \"status\": \"success\","
echo "  \"action\": \"allow\""
echo "}"
```

### PostToolUse

Fires after a tool completes. Use to process results or update state.

**Input:**

```json
{
  "tool": "code-formatter",
  "exitCode": 0,
  "stdout": "Formatted 5 files",
  "stderr": "",
  "duration": 1234
}
```

**Output:**

```json
{
  "status": "success",
  "action": "continue",
  "metadata": {
    "formattedFiles": 5
  }
}
```

### PreCompact

Fires before context is compacted (summarized for efficiency). Use to save important data.

**Input:**

```json
{
  "sessionId": "session-123",
  "tokensUsed": 5000,
  "conversationLength": 42
}
```

**Output:**

```json
{
  "status": "success",
  "archiveData": {
    "decisions": ["Use React hooks over class components"],
    "codeReviewNotes": ["Check error handling"]
  }
}
```

### SubagentStart

Fires when a subagent is invoked. Use to prepare context for the subagent.

**Input:**

```json
{
  "parentSessionId": "session-123",
  "subagentName": "testing-specialist",
  "task": "Write tests for UserService"
}
```

**Output:**

```json
{
  "status": "success",
  "context": {
    "testFramework": "Jest",
    "coverageTarget": 80
  }
}
```

### SubagentStop

Fires when a subagent completes. Use to aggregate results from subagents.

**Input:**

```json
{
  "parentSessionId": "session-123",
  "subagentName": "testing-specialist",
  "result": "Created 15 test cases",
  "exitCode": 0
}
```

**Output:**

```json
{
  "status": "success",
  "action": "continue",
  "parentContext": {
    "testsAdded": 15
  }
}
```

### Stop

Fires when the chat session ends. Use for cleanup, logging, or analytics.

**Input:**

```json
{
  "sessionId": "session-123",
  "duration": 1800000,
  "messagesCount": 12,
  "toolsUsed": ["terminal", "code-formatter"],
  "exitCode": 0
}
```

**Output:**

```json
{
  "status": "success",
  "action": "log",
  "analytics": {
    "sessionDuration": "30m",
    "productivity": "high"
  }
}
```

**Example: Session Analytics**

```bash
#!/bin/bash
# scripts/hooks/session-stop.sh

SESSION_ID=$(jq -r '.sessionId')
DURATION=$(jq -r '.duration')
MESSAGES=$(jq -r '.messagesCount')

# Log to analytics service
curl -X POST https://analytics.example.com/sessions \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"duration\": $DURATION,
    \"messages\": $MESSAGES,
    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
  }"

echo "{"
echo "  \"status\": \"success\","
echo "  \"action\": \"log\""
echo "}"
```

## Hook Response Format

All hooks must return valid JSON with the following structure:

```json
{
  "status": "success|error",
  "action": "allow|deny|ask|continue|modify|log",
  "reason": "Optional explanation",
  "data": "Optional data to return",
  "exitCode": 0
}
```

### Status Values

- `success` - Hook executed successfully
- `error` - Hook encountered an error

### Action Values (Event-Specific)

| Event            | Valid Actions             |
| ---------------- | ------------------------- |
| SessionStart     | continue                  |
| UserPromptSubmit | allow, deny, modify       |
| PreToolUse       | allow, deny, ask, approve |
| PostToolUse      | continue                  |
| PreCompact       | continue                  |
| SubagentStart    | continue                  |
| SubagentStop     | continue                  |
| Stop             | continue, log             |

## Common Hook Use Cases

### Security Policy Enforcement

Prevent unauthorized operations:

```bash
#!/bin/bash
# Block access to sensitive directories

COMMAND=$(jq -r '.command')

# Prevent modifying secrets
if [[ $COMMAND =~ \.env|\.secrets|password ]]; then
  echo "{"
  echo "  \"status\": \"success\","
  echo "  \"action\": \"ask\","
  echo "  \"reason\": \"This operation involves sensitive data\""
  echo "}"
  exit 0
fi
```

### Code Quality Automation

Run formatters and linters automatically:

```bash
#!/bin/bash
# Lint and format after code generation

TOOL=$(jq -r '.tool')

if [[ $TOOL == "code-generator" ]]; then
  # Run formatter
  npm run format
  # Run linter
  npm run lint

  echo "{"
  echo "  \"status\": \"success\","
  echo "  \"action\": \"continue\","
  echo "  \"metadata\": {"
  echo "    \"formatted\": true,"
  echo "    \"linted\": true"
  echo "  }"
  echo "}"
fi
```

### Audit Trails

Log all significant operations:

```bash
#!/bin/bash
# Log tool usage for compliance

TOOL=$(jq -r '.tool')
SESSION=$(jq -r '.sessionId')
COMMAND=$(jq -r '.command')
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Append to audit log
echo "$TIMESTAMP | $SESSION | $TOOL | $COMMAND" >> logs/audit.log

echo "{"
echo "  \"status\": \"success\","
echo "  \"action\": \"allow\""
echo "}"
```

### Context Injection

Automatically add project context:

```bash
#!/bin/bash
# Inject project standards at session start

WORKSPACE=$(jq -r '.workspaceFolder')

# Read project standards
STANDARDS=$(cat "$WORKSPACE/.github/copilot-instructions.md")

echo "{"
echo "  \"status\": \"success\","
echo "  \"action\": \"continue\","
echo "  \"context\": {"
echo "    \"standards\": $STANDARDS"
echo "  }"
echo "}"
```

## Best Practices

| Practice                 | Rationale                                          |
| ------------------------ | -------------------------------------------------- |
| Keep hooks fast          | Long-running hooks slow down the agent             |
| Handle errors gracefully | Use `continueOnError: true` for non-critical hooks |
| Log operations           | Create audit trails for security and debugging     |
| Test thoroughly          | Validate hooks work correctly before deploying     |
| Use appropriate events   | Choose the right lifecycle event for your use case |
| Document behavior        | Help team members understand what hooks do         |
| Version control          | Commit hooks to your repository                    |

## Troubleshooting Hooks

### Hook Not Executing

1. Verify `hooks.json` is in the correct location
2. Check that the command path is correct
3. Ensure the script has execute permissions: `chmod +x scripts/hooks/*.sh`
4. Review Chat diagnostics for loading errors

### Hook Timing Out

1. Increase the `timeout` value
2. Optimize the script for performance
3. Check for blocking I/O or network calls
4. Consider running long operations in the background

### Hook Blocking Valid Operations

1. Review the hook logic
2. Check the `continueOnError` setting
3. Consider using `"ask"` action instead of `"deny"`
4. Add logging to understand why operations are blocked

## Related Resources

- [Customize AI in Visual Studio Code](https://code.visualstudio.com/docs/copilot/customization/overview)
- [Create custom instructions](https://code.visualstudio.com/docs/copilot/customization/custom-instructions)
- [Create custom agents](https://code.visualstudio.com/docs/copilot/customization/custom-agents)
- [Add and manage MCP servers](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)
