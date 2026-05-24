# QAC Skill

Teaches your AI agent to generate QAC-compliant commit messages automatically. Once installed, the agent adds the four mandatory trailers (Agent, Mode, What, Why) to every commit without being asked.

## Installation by tool

### Claude Code

Add to your project's `CLAUDE.md`:

```markdown
@skill/providers/claude-code.md
```

Or copy the file directly into your project:

```bash
cp path/to/qac-spec/skill/providers/claude-code.md .claude/qac-commits.md
```

Then add to `CLAUDE.md`:

```markdown
@.claude/qac-commits.md
```

### Cursor

Copy the rule file into your project:

```bash
mkdir -p .cursor/rules
cp path/to/qac-spec/skill/providers/cursor.mdc .cursor/rules/qac-commits.mdc
```

The rule uses `alwaysApply: true` — it activates on every interaction without configuration.

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

### Other agents

Any agent that reads Markdown instruction files can use `skill/SKILL.md` directly — it contains the full rules in a provider-agnostic format.

## Provider files

| File | Tool | Activation |
|------|------|------------|
| `providers/claude-code.md` | Claude Code | via CLAUDE.md @-import |
| `providers/cursor.mdc` | Cursor | `alwaysApply: true` |
| `providers/kiro.md` | Kiro | `inclusion: always` |
| `providers/copilot.md` | GitHub Copilot | append to copilot-instructions.md |
| `providers/windsurf.md` | Windsurf | append to .windsurfrules |
| `SKILL.md` | Any | provider-agnostic canonical |

## Customization

Each provider file hardcodes the agent name (`cursor-ai`, `claude-code`, etc.). To use a custom agent name, edit the `Agent:` value in the provider file after copying it to your project.

To adjust What/Why generation guidelines or add project-specific examples, edit the copied file directly — changes stay in your project and do not affect the spec source.
