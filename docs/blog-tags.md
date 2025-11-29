# Blog Tags System

A comprehensive tagging system for blog posts. Tags are more granular than categories and help readers discover related content by specific technology, concept, or topic.

---

## Tag Categories

### AI & LLM Technologies

#### Core AI Concepts
- `llm` - Large Language Models in general
- `chatgpt` - Specific to ChatGPT
- `claude` - Specific to Anthropic's Claude
- `prompt-engineering` - Crafting effective prompts
- `context-engineering` - Managing and optimizing context
- `tokens` - Token concepts and management
- `context-window` - Context window limitations and strategies
- `hallucinations` - AI hallucinations and accuracy issues
- `embeddings` - Vector embeddings and semantic search
- `rag` - Retrieval-Augmented Generation
- `fine-tuning` - Model fine-tuning vs prompting
- `inference` - Model inference and runtime behavior

#### AI Implementation
- `ai-testing` - Testing AI/LLM outputs
- `ai-validation` - Validation methodologies for AI tools
- `human-in-the-loop` - Human oversight and validation
- `ai-tools` - Building tools with AI
- `automation` - Automating workflows with AI
- `ai-integration` - Integrating AI into existing systems

---

### UX & Design

- `ux-research` - User experience research
- `usability-testing` - Usability testing and evaluation
- `heuristic-evaluation` - Heuristic evaluation methodology
- `figma` - Figma-related content
- `figma-plugins` - Building Figma plugins
- `design-documentation` - Documentation for design systems
- `component-documentation` - UI component documentation

---

### Development & Technical

#### General Development
- `api` - API integration and usage
- `documentation` - Technical documentation
- `developer-tools` - Tools for developers
- `code-generation` - AI-assisted code generation
- `plugin-development` - Building plugins and extensions

#### Methodologies
- `testing-methodology` - Testing approaches and frameworks
- `5x5-testing` - The 5x5 testing framework (consistency + accuracy)
- `consistency-testing` - Testing for consistent outputs
- `accuracy-validation` - Validating accuracy of results
- `scalability` - Scaling solutions across teams

---

### Professional Skills

#### Learning & Growth
- `learning-in-public` - Sharing learning journeys publicly
- `imposter-syndrome` - Dealing with imposter syndrome
- `expertise` - Building and demonstrating expertise
- `skill-development` - Developing new skills
- `continuous-learning` - Ongoing learning strategies
- `career-growth` - Career development and progression

#### Work Practices
- `accountability` - Ownership and responsibility
- `decision-making` - Making informed decisions
- `quality-assurance` - Ensuring quality in outputs
- `risk-management` - Managing risks in work
- `professional-development` - Professional growth strategies

---

### Team & Collaboration

- `knowledge-sharing` - Sharing knowledge with team
- `teaching` - Teaching concepts to others
- `team-enablement` - Empowering team members
- `collaboration` - Collaborative work practices
- `documentation` - Creating useful documentation
- `reusable-solutions` - Building reusable tools/templates
- `pair-programming` - Collaborative coding

---

### Mindset & Philosophy

- `vulnerability` - Professional vulnerability
- `honesty` - Intellectual honesty
- `ego-management` - Managing ego in learning
- `growth-mindset` - Growth vs fixed mindset
- `be-right-vs-get-it-right` - Choose learning over appearing knowledgeable
- `failure` - Learning from failures
- `lessons-learned` - Specific lessons from experience

---

### Industry & Context

- `tech-industry` - Tech industry observations
- `workplace` - Workplace dynamics
- `job-security` - Job security concerns
- `ai-impact` - AI's impact on work/jobs
- `knowledge-work` - Knowledge work evolution
- `future-of-work` - Future of work considerations

---

### Specific Concepts & Frameworks

- `context-injection` - Context injection technique
- `over-fitting` - Over-fitting in AI/ML
- `source-material` - Working with quality source material
- `curation` - Curating information for AI
- `template-building` - Building reusable templates
- `meta-tools` - Tools that build tools

---

## Current Post Tag Assignments

### "Context is King"
**Tags:** `llm`, `claude`, `context-engineering`, `prompt-engineering`, `figma`, `figma-plugins`, `api`, `documentation`, `context-injection`, `teaching`, `knowledge-sharing`, `reusable-solutions`, `template-building`, `meta-tools`

### "When Your AI Breakthrough Doesn't Save Anyone Time"
**Tags:** `llm`, `ai-testing`, `ai-validation`, `testing-methodology`, `5x5-testing`, `consistency-testing`, `accuracy-validation`, `ux-research`, `heuristic-evaluation`, `human-in-the-loop`, `hallucinations`, `quality-assurance`, `accountability`, `scalability`, `lessons-learned`

### "The AI Expert Who Doesn't Know What a Token Is"
**Tags:** `llm`, `tokens`, `context-window`, `fine-tuning`, `inference`, `imposter-syndrome`, `vulnerability`, `learning-in-public`, `honesty`, `ego-management`, `be-right-vs-get-it-right`, `expertise`, `professional-development`, `growth-mindset`, `workplace`

### "You're the One Who Clicks Submit"
**Tags:** `llm`, `ai-testing`, `ai-validation`, `accountability`, `ux-research`, `heuristic-evaluation`, `hallucinations`, `human-in-the-loop`, `quality-assurance`, `risk-management`, `testing-methodology`, `5x5-testing`, `decision-making`, `lessons-learned`

---

## Tag Usage Guidelines

### How Many Tags Per Post?

- **Minimum:** 5 tags
- **Optimal:** 8-12 tags
- **Maximum:** 15 tags

Too few tags limits discoverability. Too many dilutes relevance.

### Tag Selection Criteria

1. **Is it mentioned explicitly?** - Tag should appear in the content
2. **Is it a core concept?** - Should be central to the post, not tangential
3. **Would readers search for this?** - Consider discovery and filtering
4. **Does it add value?** - Avoid redundant tags that don't help categorization

### Tag Hierarchy

Tags work in a hierarchy with categories:

```
Category (broad) → Tag (specific)
AI & Automation → llm → claude (increasingly specific)
```

### Creating New Tags

When creating new tags:
1. Use lowercase with hyphens (kebab-case)
2. Keep them concise (1-3 words)
3. Make them searchable and intuitive
4. Avoid abbreviations unless widely known
5. Check existing tags for duplicates first

---

## Implementation Examples

### Frontmatter Format

```yaml
---
title: "Context is King"
date: "2025-11-26"
primaryCategory: "AI & Automation"
secondaryCategories: ["Methodologies & Frameworks", "Team Collaboration"]
tags: 
  - llm
  - context-engineering
  - figma-plugins
  - documentation
  - teaching
  - reusable-solutions
  - meta-tools
---
```

### Tag Cloud Display
Consider displaying tags by frequency or grouping by tag category for better UX.

### Related Posts
Use tags to generate "Related Posts" sections:
- Posts sharing 3+ tags = highly related
- Posts sharing 1-2 tags = somewhat related

---

## Tag Maintenance

### Quarterly Review
- Identify underused tags (< 2 posts) and consider removing
- Merge synonymous tags
- Add new tags for emerging themes

### Tag Analytics
Track which tags:
- Drive the most engagement
- Help users find content
- Need better definitions

---

## Reserved Tag Patterns

### Avoid These Patterns
- ❌ `ai-ml-llm` - Too broad, use specific tags
- ❌ `stuff` - Not descriptive
- ❌ `misc` - Defeats the purpose of tagging
- ❌ `AI` - Use lowercase: `ai`
- ❌ `prompt_engineering` - Use hyphens: `prompt-engineering`

### Good Tag Examples
- ✅ `context-engineering` - Specific, searchable, descriptive
- ✅ `5x5-testing` - Specific methodology
- ✅ `learning-in-public` - Clear concept
- ✅ `human-in-the-loop` - Industry-standard term

---

## Search & Discovery Features

### Tag Combinations
Enable filtering by multiple tags:
- `llm` + `testing-methodology` = AI testing posts
- `ux-research` + `ai-tools` = UX research automation posts
- `learning-in-public` + `imposter-syndrome` = Professional growth posts

### Tag Pages
Create dedicated pages for each tag showing:
- All posts with that tag
- Tag description
- Related tags

### Tag Autocomplete
Implement autocomplete when creating new posts to:
- Ensure consistent tag usage
- Prevent typos
- Suggest related tags
