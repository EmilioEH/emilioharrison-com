# Blog Categories

Based on existing content analysis, the following category system organizes blog posts about tech work experiences, lessons learned, new concepts, ideas, and methodologies.

---

## Category Structure

### 1. **AI & Automation**

Posts focused on working with AI tools, LLMs, and automation in professional contexts.

**Topics include:**

- Prompt engineering and context injection
- LLM testing methodologies
- AI tool development and validation
- Practical AI implementation strategies
- Human-in-the-loop workflows

**Example posts:**

- "Context is King" (context engineering)
- "When Your AI Breakthrough Doesn't Save Anyone Time" (testing LLM outputs)
- "You're the One Who Clicks Submit" (accountability with AI tools)

---

### 2. **Lessons Learned**

Reflective posts sharing specific lessons from real work experiences, mistakes, and breakthroughs.

**Topics include:**

- Personal failure modes and recoveries
- Unexpected insights from projects
- What worked vs. what didn't
- Practical wisdom from the trenches

**Example posts:**

- "When Your AI Breakthrough Doesn't Save Anyone Time" (testing before shipping)
- "You're the One Who Clicks Submit" (ownership and accountability)

---

### 3. **Professional Growth**

Posts about navigating career challenges, imposter syndrome, learning in public, and skill development.

**Topics include:**

- Dealing with rapidly changing technology
- Admitting knowledge gaps
- Building expertise vs. performing expertise
- Vulnerability in professional contexts
- Career adaptation strategies

**Example posts:**

- "The AI Expert Who Doesn't Know What a Token Is" (intellectual honesty, learning in public)

---

### 4. **Methodologies & Frameworks**

Posts introducing specific approaches, frameworks, or systematic methods for solving problems.

**Topics include:**

- Testing methodologies (e.g., 5x5 testing threshold)
- Context engineering approaches
- Process documentation
- Scalable team solutions
- Tool-building strategies

**Example posts:**

- "Context is King" (context injection methodology)
- "When Your AI Breakthrough Doesn't Save Anyone Time" (5x5 testing framework)

---

### 5. **UX & Research**

Posts related to user experience research, design, evaluation, and UX-specific AI applications.

**Topics include:**

- Heuristic evaluation
- UX research automation
- Design documentation tools
- Figma plugins and workflows

**Example posts:**

- "When Your AI Breakthrough Doesn't Save Anyone Time" (heuristic evaluation with LLMs)
- "Context is King" (Figma plugin development)

---

### 6. **Team Collaboration**

Posts about knowledge sharing, teaching, cross-functional work, and building team capabilities.

**Topics include:**

- Teaching technical concepts to non-technical colleagues
- Building tools that empower others
- Documenting reusable solutions
- Fostering collaborative learning

**Example posts:**

- "Context is King" (teaching coworkers, building reusable templates)

---

## Categorization Guidelines

### Primary vs. Secondary Categories

- Each post should have **one primary category** (the main focus)
- Posts can have **1-2 secondary categories** for cross-cutting themes

### How to Choose the Primary Category

1. **What's the main takeaway?** If someone reads just one section, what concept should they get?
2. **What triggered the post?** Was it a specific methodology, a lesson learned, or a professional challenge?
3. **What problem does it solve?** Technical implementation, personal growth, team dynamics?

### Category Assignment Examples

| Post Title                                         | Primary Category    | Secondary Category         |
| -------------------------------------------------- | ------------------- | -------------------------- |
| Context is King                                    | AI & Automation     | Methodologies & Frameworks |
| When Your AI Breakthrough Doesn't Save Anyone Time | Lessons Learned     | Methodologies & Frameworks |
| The AI Expert Who Doesn't Know What a Token Is     | Professional Growth | -                          |
| You're the One Who Clicks Submit                   | Lessons Learned     | AI & Automation            |

---

## Implementation in Frontmatter

Add categories to blog post frontmatter:

```yaml
---
title: 'Post Title'
date: 'YYYY-MM-DD'
primaryCategory: 'AI & Automation'
secondaryCategories: ['Methodologies & Frameworks']
tags: ['LLMs', 'testing', 'prompt engineering']
---
```

---

## Future Category Candidates

As the blog grows, consider adding:

- **Code Quality** - Posts about refactoring, clean code, technical debt
- **Product Thinking** - Posts about product strategy, user needs, feature decisions
- **Industry Analysis** - Posts analyzing trends, tools, or market shifts
- **Career Advice** - Posts specifically offering career guidance and navigation

---

## Notes

- Categories should remain high-level and evergreen
- Use tags for specific technologies, tools, or granular topics
- Review category effectiveness quarterly to ensure they remain useful
- Categories should help readers find related content, not create artificial boundaries
