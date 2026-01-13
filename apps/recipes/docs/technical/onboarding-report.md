# Chefboard Onboarding Demo Report

## 1. Overview

The **Onboarding Demo** is a curated, mobile-first introduction to the Chefboard ecosystem. It is designed to bridge the gap between initial login and active usage by guiding users through installation and demonstrating core value propositions through interactive, simulated experiences.

## 2. Included Features & Flow

The onboarding journey is structured into three primary phases:

### A. Environment Validation

- **Desktop Check**: Detects the user agent and screen width. If the user is on a desktop, it displays the `DesktopBlocker`, encouraging them to switch to mobile for the intended experience.
- **Installation Guidance**: Detects if the app is running in a browser or as a Progressive Web App (PWA). If in a browser, the `InstallInstructions` component provides tailored steps for iOS (Share → Add to Home Screen) and Android (Menu → Install).

### B. Interactive Demos (`OnboardingDemo.tsx`)

Rather than static images, the onboarding uses live UI simulations to "show, not tell":

1.  **Welcome**: A high-fidelity logo pulse animation to establish brand identity.
2.  **AI Import**: A simulated typing and parsing animation showing a URL transforming into a structured recipe card.
3.  **Week Planning**: A calendar simulation where recipes "slide" into place to show how the weekly schedule works.
4.  **Cooking Mode**: A step-by-step navigation demo featuring progress tracking and simulated timers.
5.  **Family Sync**: A real-time sync simulation showing avatars and shared data updates.

### C. Completion & Persistence

- Once the user finishes the tutorial, a request is sent to the `/api/user/onboarding` endpoint.
- This persistence layer updates the user's profile in **Firestore**, settting `hasOnboarded: true` to ensure the tutorial only appears once per account.

## 3. Technology Stack

The onboarding system leverages the following technologies:

| Category             | Technology                                              | Usage in Onboarding                                                            |
| :------------------- | :------------------------------------------------------ | :----------------------------------------------------------------------------- |
| **Framework**        | [Astro 5](https://astro.build/)                         | Shell, API routing, and server-side logic.                                     |
| **Component Model**  | [React 19](https://react.dev/)                          | Encapsulates the multi-step flow and interactive demo logic.                   |
| **Animation Engine** | [Framer Motion](https://www.framer.com/motion/)         | Powers all demo transitions, staggered list reveals, and physics-based pulses. |
| **Styling**          | [TailwindCSS](https://tailwindcss.com/)                 | Provides responsive utility classes and consistent sizing.                     |
| **UI Primitive**     | [shadcn/ui](https://ui.shadcn.com/)                     | Standardized Buttons, Badges, and Sheets for a native-app feel.                |
| **Icons**            | [Lucide React](https://lucide.dev/)                     | Consistent, stroke-based iconography for tutorial steps.                       |
| **Backend**          | [Firestore](https://firebase.google.com/docs/firestore) | Persistent storage for user onboarding status.                                 |

## 4. Architectural Implementation

- **SPA Logic**: The onboarding flow is managed as a state-driven SPA within the `OnboardingFlow` component, preventing unnecessary page reloads.
- **Islands Architecture**: Only the onboarding components are hydrated with JavaScript, maintaining fast initial load times for the rest of the page.
- **Layout Primitives**: Uses `<Stack>` and `<Inline>` primitives to ensure spacing is consistent with the rest of the application's design system.
