---
description: Audit cooking mode mobile layout across different recipe types
---

# Cooking Mode Layout Audit Workflow

This workflow tests cooking mode layout on mobile viewports across different recipe archetypes to ensure layout fixes work universally.

## Prerequisites

- Local dev server running (`npm run dev`)
- At least 3 test recipes available:
  - **Simple**: 2-3 steps, no timers (e.g., Scrambled Eggs)
  - **Medium**: 5-7 steps, 1-2 timers (e.g., Pasta dish)
  - **Complex**: 7+ steps, multiple timers, substeps (e.g., Shake Shack Burger)

## Steps

### 1. Prepare Test Environment

```bash
# Ensure dev server is running
cd apps/recipes
npm run dev
```

### 2. Run Layout Audit Test Suite

// turbo

```bash
# Run the cooking mode layout audit tests
npx playwright test tests/cooking-mode-layout-audit.spec.ts --headed
```

This test will:

- Test each recipe archetype at mobile viewport (375x667)
- Capture screenshots for all steps
- Measure fixed UI overhead vs content area
- Validate minimum accessibility requirements
- Generate a comparison report

### 3. Review Generated Screenshots

Screenshots are saved to: `test-results/cooking-mode-layout-audit/`

For each recipe, review:

- **Header overhead**: Does timeline scale appropriately?
- **Timer displays**: Are dual timers present? Do they persist across steps?
- **Content visibility**: Can you read instructions without scrolling excessively?
- **Preview cards**: Is "Next Step" text readable?
- **Ingredients button**: Does it overlap content?

### 4. Analyze Metrics

Check the test output for layout health metrics:

| Metric               | Pass Threshold | Notes                               |
| -------------------- | -------------- | ----------------------------------- |
| Content area         | >50% viewport  | Actual instruction space            |
| Fixed UI overhead    | <50% viewport  | Header + footer + floating elements |
| Preview contrast     | ≥4.5:1         | WCAG AA compliance                  |
| Touch target spacing | ≥8px           | Between interactive elements        |

### 5. Identify Universal vs. Recipe-Specific Issues

Compare results across all three archetypes:

**Universal issues** (appear in ALL recipes):

- Fix these first
- Example: Ingredients button always overlaps

**Recipe-specific issues** (only in complex recipes):

- Use dynamic/adaptive solutions
- Example: Timeline too large only when 7+ steps

**Non-issues** (don't appear in any recipe):

- Remove from fix list

### 6. Document Findings

Update `/Users/emilioharrison/.gemini/antigravity/brain/<conversation-id>/cooking_mode_mobile_layout_analysis.md` with:

- Comparison table across recipe types
- Universal issues to fix
- Adaptive layout recommendations
- Updated priority list

## Expected Output

- Screenshots for 3 recipes × ~5 steps each = ~15 screenshots
- Metrics comparison table
- List of universal issues
- List of adaptive layout opportunities
