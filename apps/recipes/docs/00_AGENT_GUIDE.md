# Agent Documentation Guide

## Purpose

This directory (`/docs`) serves as the central knowledge base for the project. All documentation, plans, audits, and research should be stored here to maintain a clean project root and ensure context is easily discoverable.

## Directory Structure

- **`docs/project-management/`**
  - **Purpose**: High-level planning, progress tracking, and status reports.
  - **Examples**: `implementation_plan.md`, `task.md`, `phase-completion-reports.md`, `walkthrough.md`.
  - **Action**: Check here to understand the current project state and recent history.

- **`docs/technical/`**
  - **Purpose**: Technical specifications, system architecture, code quality criteria, and audit reports.
  - **Examples**: `code-quality-criteria.md`, `design-system.md`, `security-audit.md`.
  - **Action**: Refer to these when writing code to ensure adherence to standards.

- **`docs/research/`**
  - **Purpose**: Exploratory work, technology comparisons, and decision logs.
  - **Examples**: `cms-comparison.md`, `library-research.md`.
  - **Action**: Store findings here before making architectural decisions.

- **`docs/guides/`**
  - **Purpose**: Instructions for users and developers.
  - **Examples**: `how-to-blog.md`, `setup-guide.md`.
  - **Action**: Create or update guides here when adding new user-facing features or workflows.

## Rules for Agents

1.  **Always Check `docs/` First**: Before asking the user for context, check if relevant documentation exists here.
2.  **Check Feedback**: Run the `/check-feedback` slash command or `npm run sync:feedback` to read the latest bug reports in `docs/feedback/`.
3.  **Keep Root Clean**: Do not create markdown files in the project root unless explicitly requested (e.g., `README.md`).
4.  **Update Plans**: When changing plans, update `docs/project-management/implementation_plan.md` instead of creating new scattered files.
5.  **Naming Conventions**: Use `kebab-case` for filenames (e.g., `new-feature-plan.md`).
6.  **Timestamps**: For periodic reports (like audits), append the date (e.g., `code-quality-audit-2025-11-27.md`).
