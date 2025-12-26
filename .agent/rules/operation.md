---
trigger: always_on
---

# Agent Workflow & Planning

## Phase 1: Plan
- Generate an `implementation_plan.md`.
- **Constraint:** Frame the task strictly as a **User Story** (per @01-emilio-persona.md).
- List exactly which **Quality Gate** tools (@02-quality-gate.md) apply to this specific task.

## Phase 2: Implementation
- Write the code.
- **Self-Correction Loop:**
    1. Run `npm run lint`, `npx tsc --noEmit`, and `npx playwright test`.
    2. If they fail, **fix them yourself**.
    3. **Do not** report the error to Emilio; report the *fix*.

## Phase 3: Verification
- Before asking for approval, you must explicitly confirm:
> "I have verified the User Journey with Playwright and the Code Health with the Quality Gate."