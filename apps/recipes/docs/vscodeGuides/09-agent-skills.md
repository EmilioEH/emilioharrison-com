# Use Agent Skills

Agent Skills enable you to give the AI specialized capabilities and workflows through folders containing instructions, scripts, and resources. These skills are loaded on-demand based on the task at hand. Agent Skills is an [open standard](https://agentskills.io/) that works across multiple AI agents, including VS Code, GitHub Copilot CLI, and GitHub Copilot coding agent.

## What Are Agent Skills?

Agent Skills are reusable, modular capabilities that extend what the AI can do. Unlike custom instructions which provide static guidelines, Agent Skills include scripts, resources, and workflows that the AI can execute to complete specialized tasks.

Agent Skills are designed to be:

- **Portable**: Work across different Copilot tools (VS Code, CLI, Web)
- **Composable**: Multiple skills can work together in a single session
- **Versioned**: Skills can be versioned and evolved independently
- **Discoverable**: The AI automatically discovers relevant skills for a task

## How Agent Skills Differ from Custom Instructions

| Aspect          | Custom Instructions               | Agent Skills                              |
| --------------- | --------------------------------- | ----------------------------------------- |
| **Purpose**     | Project guidelines and standards  | Specialized workflows and capabilities    |
| **Scope**       | Always applied globally           | Loaded on-demand for specific tasks       |
| **Content**     | Guidelines, patterns, preferences | Instructions + scripts + resources        |
| **Execution**   | Influence AI responses            | Execute scripts and workflows             |
| **Sharing**     | Organization/project specific     | Shared via open standard (agentskills.io) |
| **Reusability** | Within a single project           | Across teams and projects                 |

## Create a Skill

Agent Skills are folders containing a `SKILL.md` file and supporting resources.

### Skill Folder Structure

```
my-testing-skill/
  SKILL.md              # Skill definition and instructions
  examples/
    unit-test.test.ts   # Example test file
    test-coverage.md    # Coverage guidelines
  resources/
    jest.config.js      # Shared configuration
    test-templates.ts   # Reusable test patterns
  scripts/
    run-tests.sh        # Test execution script
    generate-coverage   # Coverage report script
```

### SKILL.md Format

The `SKILL.md` file describes the skill, its capabilities, and how the AI should use it.

```markdown
---
name: Unit Testing with Jest
description: Write comprehensive unit tests using Jest and React Testing Library
tags: [testing, jest, quality-assurance]
user-invokable: true
disable-model-invocation: false
---

# Unit Testing Skill

This skill provides expertise in writing unit tests for JavaScript/TypeScript projects using Jest and React Testing Library.

## What This Skill Does

- Generates unit tests for functions and components
- Follows the Arrange-Act-Assert pattern
- Includes edge cases and error scenarios
- Provides realistic examples from your codebase

## How to Use

Invoke this skill when you need to:

- Write tests for new functions
- Increase test coverage
- Test React components
- Mock dependencies

### Example Usage
```

/test myFunction

````

## Key Patterns

### Unit Test Structure

```typescript
describe('functionName', () => {
  it('should do something', () => {
    // Arrange
    const input = ...;

    // Act
    const result = functionName(input);

    // Assert
    expect(result).toBe(...);
  });
});
````

### Component Testing

```typescript
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should render with required props', () => {
    render(<MyComponent prop="value" />);
    expect(screen.getByText('expected text')).toBeInTheDocument();
  });
});
```

## Best Practices

- Test behavior, not implementation
- Use descriptive test names
- Keep tests focused (one assertion per test when possible)
- Mock external dependencies
- Aim for meaningful coverage (not just lines covered)

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)

````

### SKILL.md Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Skill display name |
| `description` | string | What the skill does |
| `tags` | array | Search tags (e.g., testing, security, performance) |
| `user-invokable` | boolean | Whether user can explicitly invoke this skill |
| `disable-model-invocation` | boolean | Whether AI can automatically use this skill |

## Built-In Agent Skills

VS Code includes several built-in skills:

- **Testing**: Write unit, integration, and E2E tests
- **Security**: Security scanning and vulnerability analysis
- **Performance**: Code profiling and optimization
- **Documentation**: Generate API docs and guides
- **Refactoring**: Code restructuring and improvements

Access these built-in skills automatically based on task context.

## Load Skills Based on Levels

Skills can define multiple levels of capability:

```markdown
---
name: Database Migrations
description: Create and manage database migrations
levels:
  - level: basic
    description: Simple schema changes
  - level: advanced
    description: Complex migrations with data transformations
---

## Basic Level: Simple Migrations

```sql
-- Add a new column
ALTER TABLE users ADD COLUMN age INT;
````

## Advanced Level: Complex Migrations

```sql
-- Rename column with data transformation
ALTER TABLE users RENAME COLUMN user_name TO username;
UPDATE users SET username = LOWER(username);
```

```

## Use Skills with Slash Commands

Invoke skills using slash commands in chat:

```

/test-calculator.test.ts
/generate-api-docs services/user.ts
/optimize-performance src/components/DataTable.tsx

````

The AI automatically loads relevant skills based on the task.

## Share Skills Across Your Organization

### Publish Skills

Share skills via the [Agent Skills Registry](https://agentskills.io/):

1. Create a well-documented skill folder
2. Include examples and test cases
3. Add metadata (tags, version)
4. Publish to the registry

### Use Shared Skills

Reference published skills in your workspace:

```json
{
  "agentSkills": [
    "unit-testing-with-jest",
    "react-component-testing",
    "typescript-migrations"
  ]
}
````

### Organization Skills

Create organization-specific skills in a shared repository:

```
skills/
  backend/
    database-migrations/
      SKILL.md
    api-design/
      SKILL.md
  frontend/
    react-patterns/
      SKILL.md
    accessibility/
      SKILL.md
```

## Examples: Common Skills

### Testing Skill

```markdown
---
name: Unit Test Generation
description: Generate comprehensive unit tests
tags: [testing, jest, quality]
---

# Unit Test Generation

Generate well-structured unit tests that cover:

- Happy path scenarios
- Edge cases
- Error handling
- Mocked dependencies

Use the Arrange-Act-Assert pattern.
```

### Security Skill

```markdown
---
name: Security Audit
description: Scan code for security vulnerabilities
tags: [security, vulnerability, audit]
---

# Security Audit Skill

Identify security issues:

- Input validation gaps
- SQL injection risks
- XSS vulnerabilities
- Authentication/authorization flaws
```

### Documentation Skill

```markdown
---
name: API Documentation
description: Generate comprehensive API documentation
tags: [documentation, api, reference]
---

# API Documentation

Generate OpenAPI/Swagger specs:

- Endpoint descriptions
- Request/response schemas
- Example payloads
- Error codes and messages
```

## Skill Discovery and Matching

The AI automatically discovers relevant skills based on:

1. **Task context**: What the user is trying to do
2. **File type**: Language, framework, or technology
3. **Tags**: Metadata about the skill's purpose
4. **Scope**: Whether the skill is system, organization, or project-level

When you ask for help with testing, the system automatically loads testing skills. When you ask about security, security skills are loaded.

## Best Practices

| Practice         | Rationale                                       |
| ---------------- | ----------------------------------------------- |
| Clear purpose    | Each skill should address a specific capability |
| Include examples | Show concrete usage patterns                    |
| Comprehensive    | Include edge cases and best practices           |
| Well-documented  | Help teams understand and extend skills         |
| Versioned        | Track changes and allow rollback                |
| Tested           | Validate scripts and workflows work correctly   |
| Discoverable     | Use descriptive names and tags                  |

## Standard Agent Skills

The Agent Skills standard includes predefined skill categories:

| Category      | Purpose                                      |
| ------------- | -------------------------------------------- |
| Testing       | Test generation and quality assurance        |
| Security      | Security analysis and vulnerability scanning |
| Performance   | Performance profiling and optimization       |
| Documentation | Document generation and maintenance          |
| Refactoring   | Code restructuring and improvements          |
| Deployment    | Build, test, and deployment workflows        |

## Troubleshooting Skills

### Skill Not Being Used

- Verify the `SKILL.md` file is properly formatted
- Check that `disable-model-invocation: false` is set
- Review tags to ensure they match common task descriptions
- Check Chat diagnostics for loading errors

### Script Not Executing

- Verify scripts have proper permissions
- Check that paths are correct
- Ensure required tools are installed
- Review script output in the Chat view

### Skill Conflicts

If multiple skills apply to the same task:

- The AI chooses based on relevance scoring
- More specific skills take precedence
- You can explicitly select a skill using `/skillname`

## Advanced: Extend Built-In Skills

Extend built-in skills with organization-specific patterns:

```markdown
---
name: Company-Standard Unit Tests
extends: unit-testing
description: Unit tests following company standards
tags: [testing, company-standard]
---

# Company-Standard Unit Tests

This skill extends the base testing skill with company-specific patterns:

## Company Requirements

- 80% minimum coverage
- JSDoc comments for all test utilities
- Mocks in separate files
- Test data in fixtures/
```

## Related Resources

- [Agent Skills Standard](https://agentskills.io/)
- [Customize AI in Visual Studio Code](https://code.visualstudio.com/docs/copilot/customization/overview)
- [Create custom instructions](https://code.visualstudio.com/docs/copilot/customization/custom-instructions)
- [Create custom agents](https://code.visualstudio.com/docs/copilot/customization/custom-agents)
- [Create reusable prompt files](https://code.visualstudio.com/docs/copilot/customization/prompt-files)
