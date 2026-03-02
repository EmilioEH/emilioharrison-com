```prompt
---
name: Improve Code
description: Improve the code quality of an existing feature — refactor, harden, optimize without changing behavior
agent: improve
argument-hint: What should be improved? (e.g., cooking mode code quality, grocery list error handling)
---

I want to improve the code quality for an existing feature in the recipes app.

**Target area:** ${1:describe the feature or area to improve}

Assess the code for type safety, error handling, performance, structure, and test coverage. Show me a prioritized list of improvements grouped by severity (🔴 must fix, 🟡 should fix, 🟢 nice to have).

Don't make changes yet — just show me the plan so I can approve the scope.

```
