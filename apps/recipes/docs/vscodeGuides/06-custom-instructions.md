# Custom Instructions for VS Code Copilot

Custom instructions enable you to define common guidelines and rules that automatically influence how AI generates code and handles other development tasks. Add instructions to your workspace to ensure consistent AI responses that align with your team's coding standards and project requirements.

## What Are Custom Instructions?

Custom instructions are markdown files that contain guidelines and rules for how the AI should work with your codebase. Instead of manually including context in every chat prompt, you can define custom instructions once and have them automatically applied to every chat session.

VS Code recognizes two types of custom instructions:

1. **Always-on instructions** (`.github/copilot-instructions.md`)
   - Applied to every chat session automatically
   - Workspace-wide coding standards and project context
   - Created in the `.github` folder

2. **File-based instructions**
   - Applied based on file path patterns
   - Applied based on the instruction description
   - Created as `.instructions.md` files in your workspace

## Custom Instruction File Types

### Always-On Instructions

The `.github/copilot-instructions.md` file is automatically applied to every chat session. This file contains project-wide coding standards, architectural patterns, and guidelines that you want the AI to always consider.

Create a file at `.github/copilot-instructions.md` with your coding standards and project context:

```markdown
# My Project Guidelines

## Code Style

- Use TypeScript for all new code
- Follow Prettier formatting rules
- Use 2-space indentation

## Architecture

- Use React functional components with hooks
- Implement custom hooks for reusable logic
- Follow the feature folder structure

## Testing

- Write unit tests using Jest and React Testing Library
- Aim for 80% code coverage
```

### File-Based Instructions

File-based instructions are applied based on file path patterns or the instruction description. Create `.instructions.md` files in different folders to apply different rules to different parts of your codebase.

Place `.instructions.md` files throughout your project structure. The closest instruction file to the current file being edited will be used, with fallback to parent directories and then the root `.github/copilot-instructions.md`.

Example file structure:

```
.github/
  copilot-instructions.md    # Root instructions for the whole workspace
src/
  frontend/
    .instructions.md         # Front-end specific instructions
  backend/
    .instructions.md         # Backend specific instructions
  database/
    .instructions.md         # Database specific instructions
```

### Specialized Instruction Files

VS Code supports additional instruction files for specific purposes:

| File               | Purpose                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| `AGENTS.md`        | Define [custom agents](https://code.visualstudio.com/docs/copilot/customization/custom-agents) in YAML format |
| `SKILLS.md`        | Define [agent skills](https://code.visualstudio.com/docs/copilot/customization/agent-skills) in YAML format   |
| `CLAUDE.md`        | Define instructions when working with Claude models                                                           |
| `.instructions.md` | File-specific or folder-specific instructions                                                                 |

## Instruction Format

Custom instructions use markdown format with emphasis on clarity and actionable guidance:

```markdown
# [Project/Component Name] Guidelines

## [Category]

- [Guideline 1]
- [Guideline 2]

## [Category]

- [Guideline 1]
- [Guideline 2]

### [Subcategory]

[Detailed explanation or examples]
```

## Effective Custom Instruction Practices

### Keep Instructions Short and Self-Contained

Avoid dumping your entire codebase documentation into custom instructions. The AI has limited context, so focus on the most impactful standards and conventions.

Include the reasoning behind rules. Explain not just what the AI should do, but why it's important:

```markdown
# Guidelines

## Use TypeScript Strict Mode

✅ DO: Enable strict mode for type safety
❌ DON'T: Leave strict mode disabled

WHY: Strict mode catches type errors at compile time, reducing bugs and improving maintainability.
```

### Show Preferred and Avoided Patterns

Include concrete code examples for both patterns you want to encourage and patterns to avoid:

````markdown
## React Component Structure

✅ DO: Use functional components with hooks

```tsx
function MyComponent() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>{count}</button>
}
```
````

❌ DON'T: Use class components

```tsx
class MyComponent extends React.Component {
  state = { count: 0 }
  render() {
    return (
      <button onClick={() => this.setState({ count: this.state.count + 1 })}>
        {this.state.count}
      </button>
    )
  }
}
```

````

### Reference Your Architecture

For complex projects, reference your architecture documentation rather than including full details:

```markdown
## Architecture

Refer to [docs/architecture.md](../docs/architecture.md) for the system design.

Key patterns:
- Use dependency injection for service layer
- Implement repository pattern for data access
- Separate business logic from presentation
````

### Include Required Dependencies and Tools

List the technologies and libraries your project uses:

```markdown
## Tech Stack

- Framework: React 18
- Language: TypeScript
- Build tool: Vite
- Testing: Vitest, Playwright
- Package manager: npm

## Required Packages

Always use these for common tasks:

- Form handling: React Hook Form
- State management: Nanostores
- API client: Fetch API (no axios)
```

### Define Conventions for File Organization

Help the AI understand your project's structure:

```markdown
## File Organization
```

src/
├── components/ # React components
├── pages/ # Page components (routing)
├── hooks/ # Custom React hooks
├── lib/ # Utilities and helpers
├── services/ # Business logic services
└── types/ # TypeScript type definitions

```

Always place new components in `src/components/` unless it's a page component.
```

### Specify Security and Privacy Rules

Include any security or privacy considerations:

```markdown
## Security Guidelines

- Never log sensitive user data (passwords, tokens, PII)
- Always validate user input before processing
- Use environment variables for secrets, never hardcode them
- Sanitize user-generated content before rendering HTML

## API Integration

- Always use HTTPS for external API calls
- Include proper error handling and timeouts
- Add request/response logging for debugging
```

## Apply Instructions Based on File Description

You can create instructions that are applied based on the description of the file being edited. This allows the AI to understand the purpose and role of different files in your project.

For example, if you have multiple files with similar structures but different purposes, you can apply different instructions based on the file's purpose:

```markdown
## File Descriptions and Instructions

### API Route Files

For files in `src/pages/api/`:

- Use async/await for asynchronous operations
- Return proper HTTP status codes
- Include error handling for all scenarios
- Log requests for debugging

### Test Files

For files in `tests/`:

- Use descriptive test names that start with "should"
- Arrange-Act-Assert pattern
- Mock external dependencies
- Aim for 100% code coverage
```

## Sharing Instructions Across Your Organization

You can share custom instructions at the organization level using VS Code settings or by including instructions in a shared git repository.

### Repository-Level Sharing

Store `.github/copilot-instructions.md` in your repository so all team members automatically get the same instructions when they clone the project.

### Organization-Level Sharing

To share instructions across multiple repositories in your organization:

1. Create a shared repository or documentation site with organization-wide guidelines
2. Reference that documentation in your `.github/copilot-instructions.md` files
3. Include organization-wide patterns and standards
4. Override or extend organization guidelines with project-specific instructions

### Priority and Override Rules

When multiple instruction files apply:

1. File-based `.instructions.md` in the same folder (highest priority)
2. `.instructions.md` in parent directories
3. Root `.github/copilot-instructions.md`
4. Organization-wide instructions (lowest priority)

## Generate Instructions with `/init`

VS Code provides a `/init` command that analyzes your workspace and generates custom instructions automatically:

1. Open the Chat view
2. Type `/init` and press Enter
3. VS Code analyzes your project structure, dependencies, and code patterns
4. A `.github/copilot-instructions.md` file is generated with relevant guidelines
5. Review, refine, and commit the generated file to your repository

The generated instructions include:

- Detected technology stack and frameworks
- Code style patterns found in your codebase
- Project structure and file organization
- Dependencies and version information
- Architectural patterns

## Best Practices Summary

| Practice           | Rationale                                                        |
| ------------------ | ---------------------------------------------------------------- |
| Keep it concise    | Limited context window; focus on high-impact standards           |
| Be specific        | Vague guidelines are less helpful than concrete examples         |
| Include examples   | Show both preferred and avoided patterns                         |
| Document the why   | Explain reasoning behind rules for better adherence              |
| Version control    | Commit `.github/copilot-instructions.md` to your repository      |
| Review regularly   | Update instructions as your project evolves                      |
| Use multiple files | Place folder-specific instructions close to the code they affect |

## Related Resources

- [Customize AI in Visual Studio Code](https://code.visualstudio.com/docs/copilot/customization/overview)
- [Create custom agents](https://code.visualstudio.com/docs/copilot/customization/custom-agents)
- [Use Agent Skills](https://code.visualstudio.com/docs/copilot/customization/agent-skills)
- [Create reusable prompt files](https://code.visualstudio.com/docs/copilot/customization/prompt-files)
