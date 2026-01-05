---
trigger: always_on
---

# Tech Stack Standards
-   **Framework:** Astro (Islands Architecture).
-   **UI:** React + TailwindCSS (v3, `theme` config only).
-   **Language:** TypeScript (Strict).
-   **State:** Nanostores.
-   **E2E Testing:** Playwright + MSW (via `tests/msw-setup.ts`).

## Data Architecture
-   **Firestore Arrays:** Firestore does **not** support nested arrays (e.g., `number[][]`). Use an array of objects instead: `Array<{ indices: number[] }>`.
-   **Contextual Matching:** When mapping complex data (like ingredients to steps), prioritize **AI-powered contextual analysis** over regex/heuristics to correctly handle plurals, shorthand names, and pronouns.
