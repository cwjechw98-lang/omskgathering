# Code Audit Task  
## Full UI + UX Stabilization for Web Card Game

---

# Role

You are acting as:

- Senior Frontend Engineer
- UX Designer
- UI Auditor
- Codebase Analyst

Your task is to perform a **full UI and UX audit of an existing browser-based card game**, detect inconsistencies, and stabilize the interface.

This task focuses on:

• Interface stability  
• Data consistency  
• Responsive layout  
• Interaction logic  

You must **not add new gameplay features**.

---

# Project Context

The project is a **web-based card game**.

The repository contains:

- game source code
- Markdown documentation
- logs and project structure
- card definitions
- UI logic for battles

The project is deployed on **GitHub Pages**.

Recent changes introduced inconsistencies caused by automated edits using a low-quality model.

Your task is to **systematically analyze and fix the project**.

---

# Global Rules

You MUST follow these rules:

Do NOT:

- add new gameplay mechanics
- redesign the game
- modify game balance
- invent new systems

You MAY:

- fix UI issues
- fix UX inconsistencies
- fix broken assets
- fix layout problems
- stabilize interaction behavior

When documentation conflicts with the code:

> Markdown documentation should be treated as the **source of truth**.

---

# Stage 1 — Codebase Analysis

Analyze the repository structure.

Identify:

- where card data is stored
- where UI rendering happens
- how battle logic interacts with the interface
- where images and assets are loaded
- which CSS layout system is used

Find implementation of:

- card catalog
- battle interface
- card rendering
- UI layout
- responsive behavior

Create a report:
/docs/ui-ux-audit-report.md

The report must contain:

- structural problems
- UI inconsistencies
- UX inconsistencies
- missing assets
- layout issues
- broken interactions

⚠️ Do NOT fix anything yet.

---

# Stage 2 — Card Data Consistency

Known issue:

The **catalog shows fewer cards than actually exist in the game**.

You must:

1. Locate the canonical card data source.

Possible locations:

- JSON
- JavaScript objects
- Markdown files
- embedded data structures

2. Compare:

- number of cards defined in the game
- number of cards displayed in the catalog

3. Fix:

- missing card rendering
- incorrect filtering
- broken card IDs
- indexing issues

Result:

> The catalog must display **100% of the cards present in the game**.

---

# Stage 3 — Image Loading Audit

Some card images fail to load.

Check:

- asset directory structure
- relative paths
- filename case sensitivity
- GitHub Pages path resolution

Fix:

- broken asset paths
- incorrect references
- missing files

Result:

> Every card must display its image.

---

# Stage 4 — UI Layout Audit

Analyze all interface screens.

Detect:

- overlapping elements
- clipped components
- incorrect stacking layers
- broken layout containers
- elements leaving viewport

Pay special attention to:

- battle screen
- card layout
- control buttons
- status indicators
- health bars

---

# Stage 5 — UX Interaction Audit

Analyze **player interaction flow**.

Focus on:

### Battle UX

Check that:

- cards are clearly visible
- health bars remain visible
- active elements are understandable
- player actions are accessible

Detect problems such as:

- blocked buttons
- hidden information
- unclear turn state
- confusing card states

### Interaction Logic

Verify that:

- click areas work correctly
- elements remain interactive
- hover / tap behavior is correct
- UI feedback is clear

---

# Stage 6 — Responsive Behavior Audit

Test the interface on multiple resolutions.

## Mobile

360×640  
375×812  
414×896

## Tablet

768×1024

## Laptop

1366×768  
1440×900

## Desktop

1920×1080

## 4K

3840×2160

Detect:

- elements leaving screen
- unreadable UI
- broken scaling
- overlapping components

---

# Stage 7 — UI Stabilization

Fix layout issues.

Possible fixes:

- CSS grid improvements
- flexbox adjustments
- positioning corrections
- z-index hierarchy
- responsive breakpoints

Goal:

> Interface must remain stable across all resolutions.

---

# Stage 8 — UX Stabilization

Fix interaction issues.

Ensure that:

- actions remain accessible
- important information stays visible
- player decisions are understandable
- UI feedback exists for actions

Do NOT redesign the game.

Only stabilize existing UX.

---

# Stage 9 — Final Report

After completing fixes create:
/docs/ui-ux-fix-report.md

The report must include:

- list of detected issues
- list of applied fixes
- modified files
- layout adjustments
- UX stabilization changes

---

# Success Criteria

The task is complete when:

- all cards appear in the catalog
- all card images load
- UI elements do not overlap
- interface works on all tested resolutions
- player actions remain accessible
- battle interface is stable

---

# Critical Rule

Always follow this order:

1. Audit
2. Analysis
3. Fix

Never skip the audit phase.

---

# Repository Access

Repository:
github
