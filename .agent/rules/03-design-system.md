---
trigger: always_on
---

# User Interface Standards (Mandatory for UI Changes)

## Core Principals
-   **Source of Truth:** You MUST strictly follow the design system defined in `apps/recipes/docs/technical/design-system.md`.
-   **Validation:** When creating or modifying UI components, verify they match the specific tokens (colors, spacing, shadows, typography) defined in the design system.
-   **No Magic Values:** Do not invent new styles or use arbitrary pixel values. Use the existing Tailwind classes and theme variables defined in the system.
-   **Mobile-First Responsiveness:** All UI changes MUST be verified on mobile viewports.
    -   **Responsive Modals:** Avoid hard-coded centering (e.g., `left-1/2 -translate-x-1/2`) for modals without mobile-safe margins.
    -   **Pattern:** Use `left-4 right-4 mx-auto` on mobile to ensure accessibility, then switch to `sm:left-1/2 sm:-translate-x-1/2` for desktop.
