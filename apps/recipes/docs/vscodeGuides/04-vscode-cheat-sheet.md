# GitHub Copilot in VS Code Cheat Sheet

GitHub Copilot in Visual Studio Code provides AI-powered features to help you write code faster and with less effort. This cheat sheet provides a quick overview of the features for GitHub Copilot in Visual Studio Code.

Tip: If you don't yet have a Copilot subscription, you can use Copilot for free by signing up for the [Copilot Free plan](https://github.com/github-copilot/signup) and get a monthly limit of inline suggestions and chat interactions.

## Essential Keyboard Shortcuts

- **⌃⌘I** - Open the Chat view
- **⌘I** - Enter voice chat prompt in Chat view
- **⌘N** - Start a new chat session in Chat view
- **⇧⌘I** - Switch to using agents in Chat view
- **⌘I** - Start inline chat in the editor or terminal
- **⌘I (hold)** - Start inline voice chat
- **Tab** - Accept inline suggestion or navigate to the next edit suggestion
- **Escape** - Dismiss inline suggestion

## Access AI in VS Code

Start a chat conversation using natural language:

- **Chat view (⌃⌘I):** Keep an ongoing chat conversation in the Secondary Side Bar
- **Inline chat in the editor or terminal (⌘I):** Ask questions while you're in the flow
- **Quick Chat (⇧⌥⌘L):** Ask quick questions without leaving your current task

AI in the [editor](https://code.visualstudio.com/docs/copilot/ai-powered-suggestions):

- **Inline suggestions:** Get suggestions as you type, press Tab to accept a suggestion
- **Edit context menu actions:** Access common AI actions like explaining or fixing code, generating tests, or reviewing a text selection
- **Code actions:** Get editor code actions (lightbulb) to fix linting and compiler errors

Task-specific [smart actions](https://code.visualstudio.com/docs/copilot/copilot-smart-actions) across VS Code:

- Generate commit messages and pull request titles and descriptions
- Fix testing errors
- Semantic file search suggestions

## Chat Experience in VS Code

Start a natural language chat conversation to get help with coding tasks. For example, ask to explain a block of code or a programming concept, refactor a piece of code, or implement a new feature. Get more information about using [Copilot Chat](https://code.visualstudio.com/docs/copilot/chat/copilot-chat).

| Shortcut   | Description                                                   |
| ---------- | ------------------------------------------------------------- |
| ⌃⌘I        | Open the Chat view in the Secondary Side Bar                  |
| ⌘I         | Start inline chat to open chat in the editor or terminal      |
| ⇧⌥⌘L       | Open Quick Chat without interrupting your workflow            |
| ⌘N         | Start a new chat session in the Chat view                     |
| unassigned | Toggle between different agents in the Chat view              |
| ⌥⌘.        | Show the model picker to select a different AI model for chat |

### Chat Interface Elements

- **Context window control:** Visual indicator in the chat input box showing context window usage. Hover for total token count and a breakdown by category.
- **Add Context...:** Attach different types of context to your chat prompt.
- **/-command:** Use slash commands for common tasks or invoke a reusable chat prompt.
- **#-mention:** Reference common tools or chat variables to provide context within your prompt.
- **@-mention:** Reference chat participants to handle domain-specific requests.
- **Edit ( ):** Edit a previous chat prompt and revert changes.
- **History ( ):** Access your history of chat sessions.
- **Queue or steer:** Send a follow-up message while a request is running. Choose to queue the message, steer the current request, or stop and send immediately.
- **Voice ( ):** Enter a chat prompt by using speech (voice chat). The chat response is read out aloud.

### Rendering Options

- **KaTeX:** Render mathematical equations in chat responses. Enable with `chat.math.enabled`. Right-click on a math expression to copy the source expression.
- **Mermaid:** Render Mermaid diagrams in chat responses. Enable with `mermaid-chat.enabled`. Right-click on a diagram to copy the source code.

### Tips

- Use `#`-mentions to add more context to your chat prompt.
- Use `/` commands and `@` participants to get more precise and relevant answers.
- Be specific, keep it simple, and ask follow-up questions to get the best results.
- Choose an agent that fits your needs: Ask, Edit, Agent, or create a custom agent.

## Add Context to Your Prompt

Get more relevant responses by providing [context to your chat prompt](https://code.visualstudio.com/docs/copilot/chat/copilot-chat-context). Choose from different context types, such as files, symbols, editor selections, source control commits, test failures, and more.

| Context Type            | Description                                                                                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add Context             | Open a Quick Pick to select relevant context for your chat prompt. Choose from different context types, such as workspace files, symbols, current editor selection, terminal selection, and more. |
| Drag & drop files       | Drag & drop a file from the Explorer or Search view, or drag an editor tab onto the Chat view.                                                                                                    |
| Drag & drop folders     | Drag & drop a folder onto the Chat view to attach the files within it.                                                                                                                            |
| Drag & drop problem     | Drag & drop an item from the Problems panel.                                                                                                                                                      |
| #<file\|folder\|symbol> | Type #, followed by a file, folder, or symbol name, to add it as chat context.                                                                                                                    |
| #-mention               | Type #, followed by a chat tool to add a specific context type or tool.                                                                                                                           |

## Chat Tools

Use [tools](https://code.visualstudio.com/docs/copilot/agents/agent-tools) in chat to accomplish specialized tasks while processing a user request. Examples of such tasks are listing the files in a directory, editing a file in your workspace, running a terminal command, getting the output from the terminal, and more.

VS Code provides built-in tools, and you can extend chat with tools from [MCP servers](https://code.visualstudio.com/docs/copilot/customization/mcp-servers) and [extensions](https://code.visualstudio.com/api/extension-guides/ai/tools).

### Available Tools

| Tool                     | Purpose                                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------------------------- |
| #changes                 | List of source control changes                                                                            |
| #codebase                | Perform a code search in the current workspace to automatically find relevant context for the chat prompt |
| #createAndRunTask        | Create and run a new task in the workspace                                                                |
| #createDirectory         | Create a new directory in the workspace                                                                   |
| #createFile              | Create a new file in the workspace                                                                        |
| #edit (tool set)         | Enable modifications in the workspace                                                                     |
| #editFiles               | Apply edits to files in the workspace                                                                     |
| #editNotebook            | Make edits to a notebook                                                                                  |
| #extensions              | Search for and ask about VS Code extensions                                                               |
| #fetch                   | Fetch the content from a given web page                                                                   |
| #fileSearch              | Search for files in the workspace by using glob patterns and returns their path                           |
| #getNotebookSummary      | Get the list of notebook cells and their details                                                          |
| #getProjectSetupInfo     | Provide instructions and configuration for scaffolding different types of projects                        |
| #getTaskOutput           | Get the output from running a task in the workspace                                                       |
| #getTerminalOutput       | Get the output from running a terminal command in the workspace                                           |
| #githubRepo              | Perform a code search in a GitHub repo                                                                    |
| #installExtension        | Install a VS Code extension                                                                               |
| #listDirectory           | List files in a directory in the workspace                                                                |
| #new                     | Scaffold a new VS Code workspace, preconfigured with debug and run configurations                         |
| #newJupyterNotebook      | Scaffold a new Jupyter notebook given a description                                                       |
| #newWorkspace            | Create a new workspace                                                                                    |
| #openSimpleBrowser       | Open the integrated browser and preview a locally-deployed web app                                        |
| #problems                | Add workspace issues and problems from the Problems panel as context                                      |
| #readFile                | Read the content of a file in the workspace                                                               |
| #readNotebookCellOutput  | Read the output from a notebook cell execution                                                            |
| #runCell                 | Run a notebook cell                                                                                       |
| #runCommands (tool set)  | Enable running commands in the terminal and reading the output                                            |
| #runInTerminal           | Run a shell command in the integrated terminal                                                            |
| #runNotebooks (tool set) | Enable running notebook cells                                                                             |
| #runTask                 | Run an existing task in the workspace                                                                     |
| #runTasks (tool set)     | Enable running tasks in the workspace and reading the output                                              |
| #runSubagent             | Run a task in an isolated subagent context                                                                |
| #runTests                | Run unit tests in the workspace                                                                           |
| #runVscodeCommand        | Run a VS Code command                                                                                     |
| #search (tool set)       | Enable searching for files in the current workspace                                                       |
| #searchResults           | Get the search results from the Search view                                                               |
| #selection               | Get the current editor selection (only available when text is selected)                                   |
| #terminalLastCommand     | Get the last run terminal command and its output                                                          |
| #terminalSelection       | Get the current terminal selection                                                                        |
| #testFailure             | Get unit test failure information                                                                         |
| #textSearch              | Find text in files                                                                                        |
| #todos                   | Track implementation and progress of a chat request with a todo list                                      |
| #usages                  | Combination of "Find All References", "Find Implementation", and "Go to Definition"                       |
| #VSCodeAPI               | Ask about VS Code functionality and extension development                                                 |

## Slash Commands

Slash commands are shortcuts to specific functionality within the chat. You can use them to quickly perform actions, like fixing issues, generating tests, or explaining code.

| Command         | Purpose                                                                         |
| --------------- | ------------------------------------------------------------------------------- |
| /doc            | Generate code documentation comments from editor inline chat                    |
| /explain        | Explain a code block, file, or programming concept                              |
| /fix            | Ask to fix a code block or resolve compiler or linting errors                   |
| /tests          | Generate tests for all or only the selected methods and functions in the editor |
| /setupTests     | Get help setting up a testing framework for your code                           |
| /clear          | Start a new chat session in the Chat view                                       |
| /debug          | Show the Chat Debug view to inspect the chat logs for troubleshooting           |
| /new            | Scaffold a new VS Code workspace or file                                        |
| /newNotebook    | Scaffold a new Jupyter notebook based on your requirements                      |
| /init           | Generate or update workspace instructions                                       |
| /plan           | Create a detailed implementation plan for a complex coding task                 |
| /search         | Generate a search query for the Search view                                     |
| /startDebugging | Generate a launch.json debug configuration file and start a debugging session   |
| /agents         | Configure your custom agents                                                    |
| /hooks          | Configure your hooks                                                            |
| /instructions   | Configure your custom instructions                                              |
| /prompts        | Configure your reusable prompt files                                            |
| /skills         | Configure your agent skills                                                     |
| /<skill name>   | Run an agent skill in chat                                                      |
| /<prompt name>  | Run a reusable prompt in chat                                                   |

## Chat Participants

Use chat participants to handle domain-specific requests in chat. Chat participants are prefixed with `@` and can be used to ask questions about specific topics.

| Participant | Purpose                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------- |
| @github     | Use the @github participant to ask questions about GitHub repositories, issues, pull requests, and more       |
| @terminal   | Use the @terminal participant to ask questions about the integrated terminal or shell commands                |
| @vscode     | Use the @vscode participant to ask questions about VS Code features, settings, and the VS Code extension APIs |
| @workspace  | Use the @workspace participant to ask questions about the current workspace                                   |

## Use Agents

When using [agents](https://code.visualstudio.com/docs/copilot/agents/local-agents), you can use natural language to specify a high-level task, and let AI autonomously reason about the request, plan the work needed, and apply the changes to your codebase. Agents use a combination of code editing and tool invocation to accomplish the task you specified.

| Shortcut                       | Description                                                                                     |
| ------------------------------ | ----------------------------------------------------------------------------------------------- |
| ⇧⌘I                            | Switch to using agents in the Chat view                                                         |
| Tools ( )                      | Configure which tools are available when using agents                                           |
| Auto-approve tools             | Enable auto-approval of all tools when using agents (`chat.tools.autoApprove`)                  |
| Auto-approve terminal commands | Enable auto-approval of terminal commands when using agents (`chat.tools.terminal.autoApprove`) |
| MCP                            | Configure MCP servers to extend agent capabilities and tools                                    |
| Third-party agents             | Use agents from external providers like Claude Agent (Preview) and OpenAI Codex                 |
| Claude Agent (Preview)         | Start a Claude Agent session powered by Anthropic's Claude Agent SDK                            |

### Tips

- Add extra tools when using agents to extend its capabilities.
- Configure custom agents to define how the agent should operate.
- Define custom instructions to guide agents on how to generate and structure code.
- Try third-party agents like Claude Code or OpenAI Codex for alternative agentic coding experiences.

## Planning

Use the [plan agent](https://code.visualstudio.com/docs/copilot/agents/planning) in VS Code chat to create detailed implementation plans before starting complex coding tasks. Hand off the approved plan to an implementation agent to start coding.

| Feature    | Description                                                                                                                                     |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan agent | Select the Plan agent from the agents dropdown or use the /plan slash command to create a detailed implementation plan for complex coding tasks |
| Todo list  | View a todo list to track progress on complex tasks                                                                                             |

## Customize Your Chat Experience

Customize your chat experience to generate responses that match your coding style, tools, and developer workflow:

- **[Custom instructions](https://code.visualstudio.com/docs/copilot/customization/custom-instructions):** Define common guidelines or rules for tasks like generating code, performing code reviews, or generating commit messages.
- **[Reusable prompt files](https://code.visualstudio.com/docs/copilot/customization/prompt-files):** Define reusable prompts for common tasks like generating code or performing a code review.
- **[Custom agents](https://code.visualstudio.com/docs/copilot/customization/custom-agents):** Define how chat operates, which tools it can use, and how it interacts with the codebase.

### Tips

- Define language-specific instructions to get more accurate generated code for each language.
- Store your instructions in your workspace to easily share them with your team.
- Define reusable prompt files for common tasks to save time and help team members get started quickly.

## Editor AI Features

As you're coding in the editor, you can use Copilot to generate inline suggestions as you're typing. Invoke Inline Chat to ask questions and get help from Copilot, while staying in the flow of coding.

| Feature                  | Description                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------- |
| Inline suggestions       | Start typing in the editor and get inline suggestions that match your coding style     |
| Code comments            | Provide an inline suggestions prompt by writing instructions in a code comment         |
| ⌘I                       | Start editor inline chat to send a chat request directly from the editor               |
| F2                       | Get AI-powered suggestions when renaming symbols in your code                          |
| Context menu actions     | Use the editor context menu to access common AI actions                                |
| Code Actions (lightbulb) | Select the Code Action (lightbulb) in the editor for fixing linting or compiler errors |

### Tips

- Use meaningful method or function names to get better inline suggestions quicker.
- Select a code block to scope your Inline Chat prompt or attach relevant context.
- Use the editor context menu options to access common AI-powered actions directly from the editor.

## Source Control and Issues

Use AI to analyze the changes in your commits and pull requests and provide suggestions for commit messages and pull request descriptions.

| Feature                        | Description                                                                                               |
| ------------------------------ | --------------------------------------------------------------------------------------------------------- |
| #changes                       | Add the current source control changes as context in your chat prompt                                     |
| Commit as context              | Add a commit from the source control history as context in your chat prompt                               |
| Commit message                 | Generate a commit message for the current changes in a source control commit                              |
| Merge conflicts (Experimental) | Get help resolving Git merge conflicts with AI                                                            |
| Pull request description       | Generate a pull request title and description that correspond with the changes in your pull request       |
| @github                        | Use the @github participant in chat to ask about issues, pull requests, and more across your repositories |

## Review Code (Experimental)

Use AI to do a quick review pass of a code block or perform a review of uncommitted changes in your workspace.

| Feature                    | Description                                                                                                    |
| -------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Review Selection (Preview) | Select a block of code, and select Generate Code > Review from the editor context menu for a quick review pass |
| Code Review                | Select the Code Review button in the Source Control view for a deeper review of all uncommitted changes        |

## Search and Settings

Get semantically relevant search results in the Search view or help with searching for settings in the Settings editor.

| Feature                   | Description                                            |
| ------------------------- | ------------------------------------------------------ |
| Settings search           | Include semantic search results in the Settings editor |
| Semantic search (Preview) | Include semantic search results in the Search view     |

## Generate Tests

VS Code can generate tests for functions and methods in your codebase by using slash commands in chat.

| Command                      | Description                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------- |
| /tests                       | Generate tests for all or only the selected methods and functions in the editor |
| /setupTests                  | Get help setting up a testing framework for your code                           |
| /fixTestFailure              | Ask Copilot for suggestions on how to fix failing tests                         |
| Test coverage (Experimental) | Generate tests for functions and methods that are not yet covered by tests      |

### Tips

- Provide details about the testing frameworks or libraries to use.

## Debug and Fix Problems

Use Copilot to help fix coding problems and to get help with configuring and starting debugging sessions in VS Code.

| Command                        | Description                                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| /fix                           | Ask Copilot for suggestions on how to fix a block of code or how to resolve any compiler or linting errors |
| /fixTestFailure                | Ask Copilot for suggestions on how to fix failing tests                                                    |
| /startDebugging (Experimental) | Generate a launch.json debug configuration file and start a debugging session from the Chat view           |
| copilot-debug command          | Terminal command to help you debug your programs                                                           |

### Tips

- Provide additional information about the type of fix you need.
- Watch for Copilot Code Actions in the editor that indicate suggestions for fixing problems.

## Scaffold a New Project

Copilot can help you create a new project by generating a scaffold of the project structure, or generate a notebook based on your requirements.

| Feature      | Description                                                                                                 |
| ------------ | ----------------------------------------------------------------------------------------------------------- |
| Agent        | Use agents and use a natural language prompt to create a new project or file                                |
| /new         | Use the /new command in the Chat view to scaffold a new project or a new file                               |
| /newNotebook | Use the /newNotebook command in the Chat view to generate a new Jupyter notebook based on your requirements |

## Terminal

Get help about shell commands and how to resolve errors when running commands in the terminal.

| Feature            | Description                                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------------- |
| ⌘I                 | Start terminal inline chat to use natural language for asking about shell commands and the terminal             |
| @terminal          | Use the @terminal participant in the Chat view to ask questions about the integrated terminal or shell commands |
| @terminal /explain | Use the /explain command in the Chat view to explain something from the terminal                                |

## Python and Notebook Support

You can use chat to help you with Python programming tasks in the Native Python REPL and in Jupyter notebooks.

| Feature          | Description                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------- |
| Generate ⌘I      | Start Inline Chat in a notebook to generate a codeblock or Markdown block                   |
| #                | Attach variables from the Jupyter kernel in your chat prompt to get more relevant responses |
| Native REPL + ⌘I | Start Inline Chat in the Native Python REPL and run the generated commands                  |
| ⌃⌘I              | Open the Chat view and use agents to make notebook edits                                    |
| /newNotebook     | Use the /newNotebook command in the Chat view to generate a new Jupyter notebook            |

## Next Steps

- [Tutorial: Get started with AI features in VS Code](https://code.visualstudio.com/docs/copilot/getting-started)
