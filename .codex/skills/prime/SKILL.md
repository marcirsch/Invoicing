---
name: prime
description: Summarize a repository's purpose, structure, conventions, technology, and current Git state when the user asks for a codebase overview.
---

# Prime: Load Project Context

## Objective

Build comprehensive understanding of the codebase by analyzing structure, documentation, and key files.

## Process

### 1. Analyze Project Structure

List tracked files when the repository is under Git.

Inspect the directory structure using available tools, excluding generated and dependency directories where practical.

### 2. Read Core Documentation

- Read the PRD.md or similar specification if present
- Read `AGENTS.md` if present
- Read README files at project root and major directories
- Read relevant architecture documentation
- Inspect database configuration or schema only if the project uses a database

### 3. Identify Key Files

Based on the structure, identify and read:
- Main entry points (main.py, index.ts, app.py, etc.)
- Core configuration files (pyproject.toml, package.json, tsconfig.json)
- Key model/schema definitions
- Important service or controller files

### 4. Understand Current State

Check recent activity with `git log -10 --oneline` when available.

Check current branch and status with Git when available.

When the repository has phased plans or checklists, use Git history and the current implementation to identify the active phase. Treat plan checkmarks as claims to verify, not as the only evidence of completion. Compare relevant commits and current code with the phase acceptance criteria, and report the next phase that lacks implementation evidence. If the evidence is ambiguous or the user explicitly identifies the phase, state that and follow the user's direction.

## Output Report

Provide a concise summary covering:

### Project Overview
- Purpose and type of application
- Primary technologies and frameworks
- Current version/state

### Architecture
- Overall structure and organization
- Key architectural patterns identified
- Important directories and their purposes

### Tech Stack
- Languages and versions
- Frameworks and major libraries
- Build tools and package managers
- Testing frameworks

### Core Principles
- Code style and conventions observed
- Documentation standards
- Testing approach

### Current State
- Active branch
- Recent changes or development focus
- Any immediate observations or concerns

**Make this summary easy to scan - use bullet points and clear headers.**
