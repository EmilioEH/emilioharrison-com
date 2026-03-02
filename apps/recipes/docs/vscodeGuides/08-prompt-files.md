# Create Reusable Prompt Files

Prompt files, also known as slash commands, let you simplify prompting for common tasks by encoding them as standalone Markdown files that you can invoke directly in chat. Each prompt file includes task-specific context and guidelines about how the task should be performed.

## What Are Prompt Files?

Prompt files are Markdown files that contain a reusable prompt with YAML frontmatter configuration. Instead of typing out the same complex prompt repeatedly, you can create a prompt file and invoke it with a slash command in chat.

For example, instead of manually typing out detailed instructions for scaffolding a new React component every time you need one, you can create a prompt file called `scaffold-component.md` and invoke it with `/scaffold-component` in chat.

## Create a Prompt File

Prompt files are stored in specific locations within your workspace:

1. **`.github/prompts/`** - Workspace-wide prompt files
2. **Project-specific directories** - Prompts for specific parts of your codebase

### Prompt File Format

Prompt files use YAML frontmatter followed by markdown instructions:

````markdown
---
name: Scaffold React Component
description: Creates a new React component with hooks and PropTypes
argument-hint: Component name and description
agent: frontend-specialist
model: gpt-4o
tools: [code-formatter, component-library]
---

# Scaffold a New React Component

Create a well-structured React component that follows our team's conventions.

## Component Structure

```tsx
import { useState } from 'react'
import PropTypes from 'prop-types'
import styles from './Component.module.css'

export function MyComponent({ prop1, prop2 }) {
  const [state, setState] = useState(null)

  return <div className={styles.container}>{/* Component content */}</div>
}

MyComponent.propTypes = {
  prop1: PropTypes.string.isRequired,
  prop2: PropTypes.number,
}
```
````

## Guidelines

- Use functional components with hooks
- Include PropTypes for type checking
- Create accompanying CSS modules for styling
- Include JSDoc comments for exported components

```

### Prompt File Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Display name for the prompt (shown in slash command list) |
| `description` | string | What this prompt does (shown in slash command tooltip) |
| `argument-hint` | string | Hint text describing expected arguments (e.g., "Component name") |
| `agent` | string | Custom agent to use for this prompt (optional) |
| `model` | string | Language model to use (overrides default) |
| `tools` | array | Specific tools available for this prompt |

## Prompt File Locations

Store prompt files in recognized locations so VS Code can discover them:

### Workspace-Wide Prompts

Create prompts in `.github/prompts/` for organization-wide reusable tasks:

```

.github/
prompts/
scaffold-component.md
write-tests.md
code-review.md
documentation.md

```

### Project-Specific Prompts

Create prompts in project folders for context-specific tasks:

```

src/
frontend/
.prompts/
scaffold-page.md
fix-style-bugs.md
backend/
.prompts/
scaffold-api-route.md
write-migrations.md

````

## Using Variables in Prompt Files

Prompt files support variables that are substituted when invoked:

```markdown
---
name: Generate Documentation
description: Creates comprehensive documentation for a module
argument-hint: Module name
---

# Generate Documentation for ${1:moduleName}

Create detailed documentation for the ${1:moduleName} module.

## Documentation Structure

### Overview
Describe what ${1:moduleName} does and its purpose.

### API Reference
Document all exported functions and classes.

### Usage Examples
Include 2-3 practical examples of using ${1:moduleName}.

### Related Modules
List related modules that work with ${1:moduleName}.
````

### Available Variables

| Variable                | Description                               |
| ----------------------- | ----------------------------------------- |
| `${1:placeholder}`      | Positional argument with placeholder hint |
| `${2:placeholder}`      | Second positional argument                |
| `${workspaceFolder}`    | Path to workspace root                    |
| `${relativeFile}`       | Relative path to current file             |
| `${selection}`          | Currently selected text                   |
| `${input:variableName}` | User input (prompts user if not provided) |

## Common Prompt File Examples

### Scaffold a New Component

```markdown
---
name: Create Component
description: Scaffold a new React component
argument-hint: Component name (e.g., Button, Modal)
---

# Create a New React Component

Scaffold a new functional React component named ${1:ComponentName}.

## Requirements

- Use functional component syntax
- Include PropTypes for prop validation
- Create accompanying test file
- Use CSS modules for styling
- Add JSDoc comment block
```

### Write Tests for a Function

```markdown
---
name: Write Tests
description: Generate unit tests for JavaScript functions
argument-hint: Function name
---

# Write Comprehensive Unit Tests

Write unit tests for the ${1:functionName} function using Jest.

## Test Coverage

- [ ] Happy path (normal inputs)
- [ ] Edge cases (boundary values)
- [ ] Error cases (invalid inputs)
- [ ] Mocked dependencies

## Test Structure

Use the Arrange-Act-Assert pattern for each test case.
```

### Prepare a Code Review

```markdown
---
name: Code Review
description: Prepare code changes for review
argument-hint: Feature branch or PR number
---

# Prepare Code Review for ${1:featureName}

Review the ${1:featureName} changes following our code review checklist.

## Review Checklist

- [ ] Follows coding standards
- [ ] Tests added for new features
- [ ] No breaking changes
- [ ] Documentation updated
- [ ] Performance implications considered
- [ ] Security issues addressed
```

## Invoke Prompt Files in Chat

### Using Slash Commands

Once you create a prompt file, you can invoke it using a slash command in chat:

1. Type `/` in the Chat view to see available prompts
2. Search for your prompt by name
3. Select the prompt from the list
4. Provide any required arguments

Example interaction:

```
/scaffold-component LoginForm

---
(AI generates a React component named LoginForm)
```

### With Custom Agents

Specify which agent should handle a prompt file:

```markdown
---
name: Code Review
description: Review code changes
agent: senior-developer
---
```

When you invoke `/code-review`, the specified agent handles the task.

## Tool Priority in Prompt Files

Specify which tools are available for a prompt:

```markdown
---
name: Fix TypeScript Errors
description: Resolve TypeScript compilation errors
tools:
  - code-analyzer
  - type-checker
  - import-resolver
---
```

Tools are listed in priority order. Higher-priority tools are considered first.

## Organizing Prompts for Your Team

### Group Related Prompts

Use consistent naming to group related prompts:

```
testing/
  write-unit-tests.md
  write-integration-tests.md
  write-e2e-tests.md

documentation/
  generate-readme.md
  write-api-docs.md
  create-changelog.md

code-quality/
  code-review.md
  find-issues.md
  refactor-code.md
```

### Share Prompts in Version Control

Commit prompt files to your repository so your team can use them:

```bash
.github/
  prompts/
    # Shared across the team
    scaffold-component.md
    write-tests.md
    code-review.md
```

### Document Custom Prompts

Include usage documentation in your team's development guide:

```markdown
## Available Prompts

### `/scaffold-component [name]`

Creates a new React component with the given name.

**Example**: `/scaffold-component LoginForm`

### `/write-tests [file]`

Generates unit tests for the specified file.

**Example**: `/write-tests src/utils/validators.ts`
```

## Best Practices

| Practice                 | Rationale                                           |
| ------------------------ | --------------------------------------------------- |
| Clear, descriptive names | Users should understand what each prompt does       |
| Include arguments        | Prompts should be parameterized for reuse           |
| Specific guidelines      | Include concrete examples, not generic instructions |
| Keep focused             | Each prompt should address a single task            |
| Version control          | Commit prompts to your repository                   |
| Team documentation       | Document available prompts for your team            |
| Regular updates          | Keep prompts aligned with evolving standards        |

## Troubleshooting Prompt Files

### Prompt Not Appearing in Slash Menu

- Verify the `.md` file is in a recognized location (`.github/prompts/` or `.prompts/`)
- Check that the `name` property is set in frontmatter
- Ensure file naming follows conventions (lowercase with hyphens)
- Clear cache and reload VS Code

### Variables Not Substituting

- Use correct syntax: `${1:hint}` for arguments
- Use `${workspaceFolder}` for workspace path
- Use `${selection}` for selected text
- Check that variable syntax matches requirements

### Agent or Model Not Applied

- Verify agent/model names match defined agents/models
- Check Chat diagnostics for configuration errors
- Ensure custom agents are properly defined in `.github/AGENTS.md`

## Advanced: Conditional Prompts

For complex workflows, reference other prompt files or create chains of prompts:

```markdown
---
name: Complete Feature
description: Run a series of prompts to implement a feature
---

# Implement a Complete Feature

This prompt coordinates multiple steps:

1. First, run `/scaffold-component` to create the UI
2. Then, run `/scaffold-api-route` to create the backend
3. Finally, run `/write-tests` to add test coverage
```

## Related Resources

- [Customize AI in Visual Studio Code](https://code.visualstudio.com/docs/copilot/customization/overview)
- [Create custom instructions](https://code.visualstudio.com/docs/copilot/customization/custom-instructions)
- [Create custom agents](https://code.visualstudio.com/docs/copilot/customization/custom-agents)
- [Use Agent Skills](https://code.visualstudio.com/docs/copilot/customization/agent-skills)
