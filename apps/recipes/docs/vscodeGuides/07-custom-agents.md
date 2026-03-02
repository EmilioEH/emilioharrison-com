# Create Custom Agents in VS Code

Custom agents enable you to create specialized AI personas for specific roles or tasks. Instead of a general-purpose AI assistant, a custom agent has a defined purpose, set of tools, and language model preferences. Different tasks require different capabilities, so custom agents let you optimize the AI experience for your specific workflow.

## What Is a Custom Agent?

A custom agent is described in a Markdown file that defines its behavior, capabilities, tools, and language model preferences. Custom agents consist of a set of instructions and tools that are configured to work together for a specific purpose.

For example, you might create custom agents for:

- **Database Administrator**: Has access to database tools and SQL query builders
- **Frontend Specialist**: Has access to UI components and CSS frameworks
- **DevOps Engineer**: Has access to deployment and infrastructure tools
- **Security Reviewer**: Has access to security scanning and vulnerability tools

## Create a Custom Agent

Create a custom agent by adding an agent definition to your workspace. Custom agents are typically defined in:

1. **`.github/AGENTS.md`** - Workspace-wide agents
2. **Project-specific agent files** - Custom agents for specific projects or features

### Agent File Format

Custom agents use YAML frontmatter followed by markdown instructions:

```markdown
---
name: Frontend Specialist
description: Specializes in React, Vue, or Angular component development
tools: [browser, documentation, component-library]
model: gpt-4o
user-invokable: true
disable-model-invocation: false
---

# Frontend Specialist Agent

You are an expert front-end developer specializing in modern web frameworks.

## Responsibilities

- Build responsive, accessible UI components
- Apply design system principles
- Optimize performance and bundle size

## Guidelines

- Use semantic HTML
- Implement proper ARIA labels for accessibility
- Follow CSS naming conventions (BEM or CSS modules)
- Include unit tests for all components
```

### Agent Properties

| Property                   | Type    | Description                                                 |
| -------------------------- | ------- | ----------------------------------------------------------- |
| `name`                     | string  | Display name for the agent                                  |
| `description`              | string  | What the agent specializes in (shown in agent picker)       |
| `tools`                    | array   | List of tools the agent can access                          |
| `agents`                   | array   | Other agents this agent can delegate to (subagents)         |
| `model`                    | string  | Language model to use (defaults to workspace default)       |
| `user-invokable`           | boolean | Whether user can select this agent manually (default: true) |
| `disable-model-invocation` | false   | Whether AI can invoke this agent as a subagent              |

## Define Handoffs

Handoffs allow one agent to delegate work to another agent. This is useful for creating modular workflows where each agent handles a specific part of a complex task.

### Handoff Configuration

Define handoffs by specifying which agents can be invoked by the current agent:

```markdown
---
name: Project Architect
description: Designs system architecture and coordinates with specialized agents
agents:
  - label: 'Frontend Development'
    agent: frontend-specialist
    prompt: 'Implement the UI components for this design'
    send: true
  - label: 'Backend Development'
    agent: backend-specialist
    prompt: 'Implement the API endpoints for this design'
    send: true
  - label: 'Database Design'
    agent: database-admin
    prompt: 'Design the database schema for this feature'
    send: true
model: gpt-4o
---

# Project Architect

You are a system architect responsible for coordinating development across the full stack.

## Workflow

1. Analyze requirements and design the system architecture
2. Break down work into frontend, backend, and database tasks
3. Delegate to specialized agents for implementation
4. Review and integrate the results
```

### Handoff Properties

| Property | Type    | Description                                   |
| -------- | ------- | --------------------------------------------- |
| `label`  | string  | Display name for the handoff option           |
| `agent`  | string  | ID of the agent to delegate to                |
| `prompt` | string  | Initial prompt to send to the delegated agent |
| `send`   | boolean | Auto-send prompt when agent is selected       |
| `model`  | string  | Optional model override for this handoff      |

## Agent Skills Integration

Combine custom agents with [Agent Skills](https://code.visualstudio.com/docs/copilot/customization/agent-skills) to provide specialized workflows. Agent Skills can be shared across multiple agents and even used in other Copilot tools.

```markdown
---
name: Testing Specialist
description: Writes comprehensive tests for your code
tools: [testing-framework, code-analyzer]
skills: [unit-testing-skill, integration-testing-skill, performance-testing-skill]
---

# Testing Specialist

You are an expert test engineer focused on code quality and reliability.

## Test Coverage

- Unit tests for business logic
- Integration tests for API endpoints
- E2E tests for critical user journeys
- Performance tests for bottlenecks

## Skills

This agent uses specialized testing skills:

- `unit-testing-skill`: Write Jest unit tests
- `integration-testing-skill`: Write integration tests with databases
- `performance-testing-skill`: Benchmark and profile code
```

## Create Dropdown Agent Pickers

You can customize how agents appear in the VS Code interface by grouping them in dropdowns:

```markdown
---
name: Dropdown Label
description: Shows a group of related agents
dropdown: true
agents:
  - agent: frontend-specialist
  - agent: backend-specialist
  - agent: fullstack-developer
---

# Development Team

This group contains specialized agents for different aspects of development.
```

## Define Tool Priority

Control the order and importance of tools available to an agent:

```markdown
---
name: Backend Specialist
description: Specializes in server-side development
tools:
  - api-client
  - database-query
  - logging-tools
  - testing-framework
  - code-formatter
---
```

Tools are listed in priority order. The AI will consider higher-priority tools first when deciding how to approach a task.

## Shared Agents Across Teams

Share custom agents across your team by:

1. **Storing in version control**: Commit agent definitions to `.github/AGENTS.md` in your repository
2. **Team documentation**: Reference agent definitions in your team's development guides
3. **Standardization**: Create organization-wide agent templates for common roles

### Example: Organization-Wide Agents

Create a shared `.github/AGENTS.md` file with agents tailored to your organization:

```markdown
---
name: Company Code Reviewer
description: Reviews code following company standards and best practices
tools: [code-analyzer, security-scanner, documentation-checker]
user-invokable: true
---

# Code Reviewer

Reviews code for compliance with company standards.

## Review Checklist

- [ ] Follows coding guidelines
- [ ] Has proper error handling
- [ ] Includes unit tests
- [ ] Documentation is updated
- [ ] No security vulnerabilities
- [ ] Performance is optimized
```

## Best Practices for Custom Agents

| Practice                       | Rationale                                               |
| ------------------------------ | ------------------------------------------------------- |
| Clear purpose                  | Each agent should have a specific, well-defined role    |
| Specific tools                 | Give agents only the tools they need for their purpose  |
| Handoffs for complex workflows | Use subagents to break down complex tasks               |
| Document responsibilities      | Clearly describe what the agent should and shouldn't do |
| Version control                | Commit agents to your repository                        |
| Team alignment                 | Ensure custom agents match your team's workflow         |
| Regular review                 | Update agents as tools and processes evolve             |

## Troubleshooting Custom Agents

### Agent Not Appearing in Picker

- Verify the agent definition syntax is correct
- Check that `user-invokable: true` is set
- Ensure the agent file is in a recognized location (`.github/AGENTS.md`)
- Check the Chat diagnostics view for syntax errors

### Handoff Not Working

- Verify both agents are properly defined
- Check that the delegated agent has `disable-model-invocation: false`
- Ensure tools are configured correctly
- Review Chat diagnostics for error messages

### Agent Using Wrong Tools

- Verify the `tools` array is correctly formatted
- Check that tool names match available tools
- Review tool documentation for correct usage
- Clear cache and reload VS Code if changes aren't taking effect

## Advanced: Custom Agent File Structure

For complex organizations, you can organize agents in multiple files:

```
.github/
  AGENTS.md                 # Main agent definitions
  agents/
    architecture.md         # Architecture specialists
    security.md             # Security team agents
    operations.md           # DevOps agents
```

Reference agents from other files using full paths:

```markdown
---
name: Project Lead
agents:
  - agent: ./agents/architecture.md#cloud-architect
  - agent: ./agents/security.md#security-reviewer
---
```

## Related Resources

- [Customize AI in Visual Studio Code](https://code.visualstudio.com/docs/copilot/customization/overview)
- [Create custom instructions](https://code.visualstudio.com/docs/copilot/customization/custom-instructions)
- [Use Agent Skills](https://code.visualstudio.com/docs/copilot/customization/agent-skills)
- [Create reusable prompt files](https://code.visualstudio.com/docs/copilot/customization/prompt-files)
- [Add and manage MCP servers](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)
