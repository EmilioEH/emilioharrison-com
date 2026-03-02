# Customize AI in Visual Studio Code

AI models have broad general knowledge but don't know your codebase or team practices. Think of the AI as a skilled new team member: it writes great code, but doesn't know your conventions, architecture decisions, or preferred libraries. Customization is how you share that context, so responses match your coding standards, project structure, and workflows.

This article covers the customization options in VS Code: custom instructions, prompt files, custom agents, agent skills, MCP servers, and language models.

## Quick Reference

| Customization           | Purpose                                                 | When to Use                                         |
| ----------------------- | ------------------------------------------------------- | --------------------------------------------------- |
| Always-on instructions  | Project-wide coding standards and architectural context | Automatically included in every request             |
| File-based instructions | Language-specific or location-specific conventions      | Applied based on file patterns or descriptions      |
| Reusable prompt files   | Common tasks you run repeatedly                         | When you invoke a slash command                     |
| Agent skills            | Multi-step workflow with scripts and resources          | When the task matches the skill description         |
| Custom agents           | Specialized AI persona with tool restrictions           | When you select it or another agent delegates to it |
| MCP servers             | Connect to external APIs or databases                   | When the task matches a tool description            |
| Hooks                   | Automate tasks at agent lifecycle points                | When the agent reaches a matching lifecycle event   |

Tip: Prompt files vs custom agents: Prompt files are best for single, repeatable tasks invoked as slash commands (for example, scaffolding a component). Custom agents are persistent personas that control which tools are available and can orchestrate subagents for multi-step workflows.

## Custom Instructions

[Custom instructions](https://code.visualstudio.com/docs/copilot/customization/custom-instructions) enable you to define common guidelines and rules that automatically influence how AI generates code and handles other development tasks. Instead of manually including context in every chat prompt, specify custom instructions in a Markdown file to ensure consistent AI responses that align with your coding practices and project requirements.

VS Code supports two types of custom instructions:

- **Always-on instructions:** Automatically applied to every chat session.
- **File-based instructions:** Applied based on file path patterns or based on the instruction description

Use custom instructions to:

- Document how to work with your code, such as coding standards, preferred technologies, or project requirements
- Provide project-wide context that helps the AI understand the project's goal, architecture, and file structure
- Specify task-specific guidelines, such as how to write tests, documentation, or perform code reviews

## Agent Skills

[Agent Skills](https://code.visualstudio.com/docs/copilot/customization/agent-skills) enable you to give the AI specialized capabilities and workflows through folders containing instructions, scripts, and resources. These skills are loaded on-demand based on the task at hand. Agent Skills is an [open standard](https://agentskills.io/) that works across multiple AI agents, including VS Code, GitHub Copilot CLI, and GitHub Copilot coding agent.

Use Agent Skills to:

- Create reusable capabilities that work across different GitHub Copilot tools
- Define specialized workflows for testing, debugging, or deployment processes
- Share capabilities with the AI community using the open standard
- Include scripts, examples, and other resources alongside instructions

## Prompt Files

[Prompt files](https://code.visualstudio.com/docs/copilot/customization/prompt-files), also known as slash commands, let you simplify prompting for common tasks by encoding them as standalone Markdown files that you can invoke directly in chat. Each prompt file includes task-specific context and guidelines about how the task should be performed.

Use prompt files to:

- Simplify prompting for common tasks, such as scaffolding a new component, running and fixing tests, or preparing a pull request
- Override default behavior of a custom agent, such as creating a minimal implementation plan, or generating mockups for API calls

## Custom Agents

[Custom agents](https://code.visualstudio.com/docs/copilot/customization/custom-agents) enable you to let the AI assume different personas for specific roles or tasks, like a database administration, front-end development, or planning. A custom agent is described in a Markdown file that defines its behavior, capabilities, tools, and language model preferences.

Use custom agents to:

- Create specialist custom agents that focus on a specific task or role, giving them only the relevant context and tools
- Create modular workflows by orchestrating multiple specialized agents, where each agent handles a specific part of the process
- Help optimize context usage for complex tasks by running custom agents as [subagents](https://code.visualstudio.com/docs/copilot/agents/subagents)

## MCP and Tools

[MCP and tools](https://code.visualstudio.com/docs/copilot/customization/mcp-servers) provide a gateway to external services and specialized tools through Model Context Protocol (MCP). This extends the agent's capabilities beyond code and the terminal, and enable it to interact with databases, APIs, and other development tools. MCP Apps let you define rich user experiences, like dashboards or forms, to facilitate complex interactions.

Use MCP and tools to:

- Connect database tools to query and analyze data without leaving your development environment
- Integrate with external APIs to fetch real-time information or perform actions

## Hooks

[Hooks](https://code.visualstudio.com/docs/copilot/customization/hooks) enable you to execute custom shell commands at key lifecycle points during agent sessions. Hooks provide deterministic, code-driven automation that runs regardless of how the agent is prompted.

Use hooks to:

- Enforce security policies by blocking dangerous commands before they execute
- Automate code quality workflows by running formatters and linters after file edits
- Create audit trails of all tool invocations for compliance
- Inject project context into agent sessions automatically

## Language Models

[Language models](https://code.visualstudio.com/docs/copilot/customization/language-models) let you choose from different AI models optimized for specific tasks. You can switch between models to get the best performance for code generation, reasoning, or specialized tasks like vision processing. Bring your own API key to access more models or have more control over model hosting.

Use different language models to:

- Use a fast model for quick code suggestions and simple refactoring tasks
- Switch to a more capable model for complex architectural decisions or detailed code reviews
- Bring your own API key to access experimental models or use locally hosted models

## Set Up Your Project for AI

Implement AI customizations incrementally. Start with the basics and add more as needed.

1. **Initialize your project:** Type `/init` in chat to analyze your workspace and generate a `.github/copilot-instructions.md` file with coding standards and project context tailored to your codebase. Review and refine the generated instructions.

2. **Add targeted rules:** Create file-based `*.instructions.md` files to apply specific rules for different parts of your codebase, such as language conventions or framework patterns.

3. **Automate repetitive tasks:** Create prompt files for common workflows like component generation, code reviews, or documentation. Add MCP servers to connect external services like issue trackers or databases.

4. **Create specialized workflows:** Build custom agents for specific roles or project phases. Package reusable capabilities as agent skills to share across tools and minimize context usage.

## Troubleshoot Customization Issues

If your customization files aren't being applied or are causing unexpected behavior, use the chat customization diagnostics view to identify problems.

Select Configure Chat (gear icon) > Diagnostics in the Chat view to see all loaded custom agents, prompt files, instruction files, and skills along with any errors. Check for issues like syntax errors, invalid configurations, or problems loading resources.

Learn more about [troubleshooting AI in VS Code](https://code.visualstudio.com/docs/copilot/troubleshooting).

## Related Resources

- [Create custom instructions](https://code.visualstudio.com/docs/copilot/customization/custom-instructions)
- [Use Agent Skills](https://code.visualstudio.com/docs/copilot/customization/agent-skills)
- [Create reusable prompt files](https://code.visualstudio.com/docs/copilot/customization/prompt-files)
- [Create custom agents](https://code.visualstudio.com/docs/copilot/customization/custom-agents)
- [Choose language models](https://code.visualstudio.com/docs/copilot/customization/language-models)
- [Add and manage MCP servers](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)
- [Use hooks for lifecycle automation](https://code.visualstudio.com/docs/copilot/customization/hooks)
