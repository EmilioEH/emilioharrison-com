---
trigger: always_on
---

# User Interface Standards (Mandatory for UI Changes)

## Core Principals
-   **Source of Truth:** You MUST strictly follow the design system defined in `apps/recipes/docs/technical/design-system.md`.
-   **Validation:** When creating or modifying UI components, verify they match the specific tokens (colors, spacing, shadows, typography) defined in the design system.
-   **No Magic Values:** Do not invent new styles or use arbitrary pixel values. Use the existing Tailwind classes and theme variables defined in the system.
