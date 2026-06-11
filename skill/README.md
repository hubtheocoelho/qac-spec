# QAC Skill

Teaches your AI agent to generate QAC-compliant commit messages automatically. Once installed, the agent adds the four mandatory trailers (Agent, Mode, What, Why) to every commit without being asked.

## Installation by tool

### Claude Code

**As a native Agent Skill** (recommended) — Claude Code discovers skills in `.claude/skills/` and activates them from the `description` in the frontmatter whenever a commit is about to happen:

```bash
mkdir -p .claude/skills/qac-commits
cp path/to/qac-spec/skill/SKILL.md .claude/skills/qac-commits/SKILL.md
```

For all your projects instead of one, install to `~/.claude/skills/qac-commits/SKILL.md`.

**As an always-on rule** — copy the provider file into your project and import it from `CLAUDE.md`, so the rule is loaded in every session regardless of context:

```bash
cp path/to/qac-spec/skill/providers/claude-code.md .claude/qac-commits.md
```

Then add to `CLAUDE.md`:

```markdown
@.claude/qac-commits.md
```

### Cursor

Cursor supports two formats. Use whichever matches your project setup:

**New format** — `.cursor/rules/*.mdc` (Cursor 0.44+):

```bash
mkdir -p .cursor/rules
cp path/to/qac-spec/skill/providers/cursor.mdc .cursor/rules/qac-commits.mdc
```

**Legacy format** — `.cursorrules` in the project root:

```bash
cp path/to/qac-spec/skill/providers/cursorrules.md .cursorrules
```

Both use `alwaysApply: true` behavior — the rule activates on every interaction without additional configuration.

### Kiro

Copy the steering file into your project:

```bash
mkdir -p .kiro/steering
cp path/to/qac-spec/skill/providers/kiro.md .kiro/steering/qac-commits.md
```

The file uses `inclusion: always` — Kiro loads it automatically in every session.

### GitHub Copilot

Append to your project's `.github/copilot-instructions.md` (create it if it doesn't exist):

```bash
cat path/to/qac-spec/skill/providers/copilot.md >> .github/copilot-instructions.md
```

### Windsurf

Append to your project's `.windsurfrules` (create it if it doesn't exist):

```bash
cat path/to/qac-spec/skill/providers/windsurf.md >> .windsurfrules
```

### AGENTS.md (Codex, Jules, and other compatible tools)

For any tool that reads the [AGENTS.md](https://agents.md) convention, append the generic provider to your project's `AGENTS.md` (create it if it doesn't exist):

```bash
cat path/to/qac-spec/skill/providers/agents.md >> AGENTS.md
```

The file uses an `<agent name>` placeholder — replace it with your tool's name, or leave it for the agent to fill in with its own identity.

### Other agents

Any agent that reads Markdown instruction files can use `skill/SKILL.md` directly — it contains the full rules in a provider-agnostic format.

## Provider files

| File | Tool | Activation |
|------|------|------------|
| `SKILL.md` | Claude Code (skill) / any | `.claude/skills/qac-commits/`, on-demand by description — also the provider-agnostic canonical |
| `providers/claude-code.md` | Claude Code (rule) | via CLAUDE.md @-import, always loaded |
| `providers/cursor.mdc` | Cursor (0.44+) | `.cursor/rules/`, `alwaysApply: true` |
| `providers/cursorrules.md` | Cursor (legacy) | `.cursorrules` at project root |
| `providers/kiro.md` | Kiro | `inclusion: always` |
| `providers/copilot.md` | GitHub Copilot | append to copilot-instructions.md |
| `providers/windsurf.md` | Windsurf | append to .windsurfrules |
| `providers/agents.md` | AGENTS.md-compatible tools | append to AGENTS.md at project root |

## Customization

Each provider file hardcodes the agent name (`cursor-ai`, `claude-code`, etc.). To use a custom agent name, edit the `Agent:` value in the provider file after copying it to your project.

To adjust What/Why generation guidelines or add project-specific examples, edit the copied file directly — changes stay in your project and do not affect the spec source.
