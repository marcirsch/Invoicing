---
name: commit
description: Create a focused Git commit from the requested work after reviewing the relevant changes.
disable-model-invocation: true
---

Create a commit only when the user explicitly asks for one. Inspect `git status` and the relevant diff first. Stage only files related to the requested work; do not stage unrelated changes.

Write a concise, atomic commit message describing the change.

Use a conventional type such as `feat`, `fix`, or `docs` when it fits the repository's commit style. Do not create a Git tag unless the user explicitly requests one.
