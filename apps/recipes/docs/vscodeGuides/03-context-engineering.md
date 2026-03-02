# Context Engineering in VS Code

This guide shows you how to set up a context engineering workflow in VS Code using custom instructions, custom agents, and prompt files.

Context engineering is a systematic approach to providing AI agents with targeted project information to improve the quality and accuracy of generated code. By curating essential project context through custom instructions, implementation plans, and coding guidelines, you enable AI to make better decisions, improve accuracy, and maintain persistent knowledge across interactions.

Tip: VS Code chat provides a [built-in plan agent](https://code.visualstudio.com/docs/copilot/agents/planning) to help you create detailed implementation plans before starting complex coding tasks. If you don't want to create a custom planning workflow, you can use the plan agent to generate implementation plans quickly.

## Context Engineering Workflow

The high-level workflow for context engineering in VS Code consists of the following steps:

1. **Curate project-wide context:** Use custom instructions to include relevant documentation (for example, architecture, design, contributor guidelines) as context to all agent interactions.
2. **Generate implementation plan:** Create a planning persona by using a custom agent and a prompt to generate a detailed feature implementation plan.
3. **Generate implementation code:** Use custom instructions to generate code based on the implementation plan that adheres to your coding guidelines.

As you work through the steps, you can iterate and refine the output with follow-up prompts in the chat.

## Step 1: Curate Project-Wide Context

To ground the AI agent in the specifics of the project, collect key project information like product vision, architecture, and other relevant documentation and add it as chat context via custom instructions. By using custom instructions, you ensure that the agent consistently has access to this context and doesn't have to re-learn it for each chat interaction.

**Why this helps:** The agent could find this information in the codebase, but it might be buried in comments or scattered across multiple files. By providing a concise summary of the most important information, you help the agent to always have critical context available for decision-making.

### Create Project Documentation Files

1. Describe relevant project documentation in Markdown files in the repository, for example create `PRODUCT.md`, `ARCHITECTURE.md`, and `CONTRIBUTING.md` files.

   Tip: If you have an existing codebase, you can use AI to generate these project documentation files. Make sure to review and refine the generated documentation files to ensure accuracy and completeness.
   - `Generate an ARCHITECTURE.md (max 2 page) file that describes the overall architecture of the project.`
   - `Generate a PRODUCT.md (max 2 page) file that describes the product functionality of the project.`
   - `Generate a CONTRIBUTING.md (max 1 page) file that describes developer guidelines and best practices for contributing to the project.`

2. Create a `.github/copilot-instructions.md` instructions file at the root of your repository.

   The instructions in this file are automatically included in all chat interactions as context for the AI agent.

3. Provide a high-level overview for the agent with the project context and guidelines. Reference relevant supporting documentation files by using Markdown links.

   Example `.github/copilot-instructions.md` file:

   ```markdown
   # [Project Name] Guidelines

   - [Product Vision and Goals](../PRODUCT.md): Understand the high-level vision and objectives of the product to ensure alignment with business goals.
   - [System Architecture and Design Principles](../ARCHITECTURE.md): Overall system architecture, design patterns, and design principles that guide the development process.
   - [Contributing Guidelines](../CONTRIBUTING.md): Overview of the project's contributing guidelines and collaboration practices.

   Suggest to update these documents if you find any incomplete or conflicting information during your work.
   ```

   Tip: Start small, keeping the initial project-wide context concise and focused on the most critical information. If uncertain, focus on high-level architecture and only add new rules to address errors or incorrect behavior the agent makes repeatedly (for example, using the wrong shell command, ignoring certain files).

## Step 2: Create Implementation Plan

Once you have the project-specific context in place, you can use AI to prompt the creation of an implementation plan for a new feature or bug fix. Generating an implementation plan is an iterative process that might require multiple rounds of refinement to ensure it's complete and accurate.

With a [custom agent](https://code.visualstudio.com/docs/copilot/customization/custom-agents) for planning, you can create a dedicated persona with planning-specific guidelines and tools (for example, read-only access to the codebase). They can also capture specific workflows for brainstorming, researching, and collaborating for your project and team.

Tip: Once you create custom agents, treat them as living documents. Refine and improve them over time based on any mistakes or shortcomings you observe in the agent's behavior.

### Create a Planning Document Template

1. Create a planning document template `plan-template.md` that defines the structure and sections of the implementation plan document.

   By using a template, you ensure that the agent collects all necessary information and presents it in a consistent format. This also helps improve the quality of the code that is generated from the plan.

   Example `plan-template.md` file:

   ```markdown
   ---
   title: [Short descriptive title of the feature]
   version: [optional version number]
   date_created: [YYYY-MM-DD]
   last_updated: [YYYY-MM-DD]
   ---

   # Implementation Plan: <feature>

   [Brief description of the requirements and goals of the feature]

   ## Architecture and design

   Describe the high-level architecture and design considerations.

   ## Tasks

   Break down the implementation into smaller, manageable tasks using a Markdown checklist format.

   ## Open questions

   Outline 1-3 open questions or uncertainties that need to be clarified.
   ```

2. Create a planning [agent](https://code.visualstudio.com/docs/copilot/customization/custom-agents) `.github/agents/plan.agent.md`

   The planning agent defines a planning persona and instructs the agent not to perform implementation tasks, but to focus on creating the implementation plan. You can specify [handoffs](https://code.visualstudio.com/docs/copilot/customization/custom-agents#_handoffs) to transition to an implementation agent after the plan is complete.

   To create a custom agent, run the Chat: New Custom Agent command in the Command Palette.

   If you want to access GitHub issues for context, make sure to install the [GitHub MCP server](https://github.com/mcp).

   You might want to configure the `model` metadata property to use a language model that is optimized for reasoning and deep understanding.

## Step 3: Generate Implementation Code

After you have generated and refined the implementation plan, you can now use AI to implement the feature by generating code from the implementation plan.

1. For smaller tasks, you can directly implement the feature by prompting the agent to generate code based on the implementation plan.

2. For larger or complex features, you can switch to Agent and prompt it to save the implementation plan to a file (for example, `<my-feature>-plan.md`) or add it as comment to the mentioned GitHub issue. You can then open a new chat and reference the implementation plan file in your prompt to reset the chat context.

3. You can now instruct the agent to implement the feature based on the implementation plan you created in the previous step.

   For example, enter a chat prompt like `implement #<my-plan>.md`, which references the implementation plan file.

   Tip: Agent is optimized for executing multi-step tasks and figuring out how to best accomplish a goal based on the plan and your project context. You only need to provide the plan file or reference it in your prompt.

4. For a more customized workflow, create a [custom agent](https://code.visualstudio.com/docs/copilot/customization/custom-agents) `.github/agents/implement.agent.md` specialized in implementing code based on a plan.

## Best Practices and Common Patterns

### Context Management Principles

- **Start small and iterate:** Begin with minimal project context and gradually add detail based on observed AI behavior. Avoid context overload that can dilute focus.
- **Keep context fresh:** Regularly audit and update your project documentation (using the agent) as the codebase evolves. Stale context leads to outdated or incorrect suggestions.
- **Use progressive context building:** Start with high-level concepts and progressively add detail rather than overwhelming the AI with comprehensive information upfront.
- **Maintain context isolation:** Keep different types of work (planning, coding, testing, debugging) in separate chat sessions to prevent context mixing and confusion.

### Documentation Strategies

- **Create living documents:** Treat your custom instructions, custom agents, and templates as evolving resources. Refine them based on observed AI mistakes or shortcomings.
- **Focus on decision-making context:** Prioritize information that helps AI make better architectural and implementation decisions rather than exhaustive technical details.
- **Use consistent patterns:** Establish and document coding conventions, naming patterns, and architectural decisions to help AI generate consistent code.
- **Reference external knowledge:** Link to relevant external documentation, APIs, or standards that the AI should consider when generating code.

### Workflow Optimization

- **Handoffs between agents:** Use [handoffs](https://code.visualstudio.com/docs/copilot/customization/custom-agents#_handoffs) to create guided transitions and implement end-to-end development workflows between planning, implementation, and review agents.
- **Implement feedback loops:** Continuously validate that AI understands your context correctly. Ask clarifying questions and course-correct early when misunderstandings occur.
- **Use incremental complexity:** Build features incrementally, validating each step before adding complexity. This prevents compounding errors and maintains working code.
- **Separate concerns:** Use different agents for different activities (planning versus implementation versus review) to maintain focused, relevant context.
- **Version your context:** Use git to track changes to your context engineering setup, allowing you to revert problematic changes and understand what works best.

### Anti-Patterns to Avoid

- **Context dumping:** Avoid providing excessive, unfocused information that doesn't directly help with decision-making.
- **Inconsistent guidance:** Ensure all documentation aligns with your chosen architectural patterns and coding standards.
- **Neglecting validation:** Don't assume AI correctly understands your context. Always test understanding before proceeding with complex implementations.
- **One-size-fits-all:** Different team members or project phases may need different context configurations. Be flexible in your approach.

### Measuring Success

A successful context engineering setup should result in:

- **Reduced back-and-forth:** Less need to correct or redirect AI responses
- **Consistent code quality:** Generated code follows established patterns and conventions
- **Faster implementation:** Less time spent explaining context and requirements
- **Better architectural decisions:** AI suggests solutions that align with project goals and constraints

### Scaling Context Engineering

- **For teams:** Share context engineering setups through version control and establish team conventions for maintaining shared context.
- **For large projects:** Consider creating context hierarchies with project-wide, module-specific, and feature-specific context layers using [instructions files](https://code.visualstudio.com/docs/copilot/customization/custom-instructions).
- **For long-term projects:** Establish regular context review cycles to keep documentation current and remove outdated information.
- **For multiple projects:** Create reusable templates and patterns that can be adopted across different codebases and domains.

By following these practices and continuously refining your approach, you'll develop a context engineering workflow that enhances AI-assisted development while maintaining code quality and project consistency.

## Related Resources

Learn more about customizing AI in VS Code:

- [Instructions files](https://code.visualstudio.com/docs/copilot/customization/custom-instructions)
- [Custom agents](https://code.visualstudio.com/docs/copilot/customization/custom-agents)
- [Prompt files](https://code.visualstudio.com/docs/copilot/customization/prompt-files)
