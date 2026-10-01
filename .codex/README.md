# Codex guidance and workflows

- `AGENTS-template.md` is a starting point for a repository-root `AGENTS.md`. It is a template and is not loaded as repository guidance by itself.
- `skills/<name>/SKILL.md` contains reusable workflows. Invoke one explicitly with `$<name>` (for example, `$plan-feature`). Skills can also be selected automatically when their description matches a request.
- The former Claude command files are stored as skills because Codex does not interpret `.codex/commands/*.md` as custom slash commands.
- Keep repository-wide instructions in the root `AGENTS.md`; keep task-specific workflows in skills. Use portable wording and avoid relying on Claude-only tools or variables.
