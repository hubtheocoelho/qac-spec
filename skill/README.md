# QAC Skill

A skill that teaches AI agents to generate QAC-compliant commit messages automatically.

## What it does

When the agent is about to commit, the skill instructs it to:

1. Determine the agent name and mode (`hitl` or `autonomous`)
2. Analyze staged changes to generate the `What` trailer (effect of the change)
3. Identify the condition and impact to generate the `Why` trailer
4. Assemble the full commit message with all four trailers
5. Present for confirmation before executing (in `hitl` mode)

## Installation

### Claude Code

Add `skill/SKILL.md` to your project's steering, or reference it via a CLAUDE.md include.

### Cursor / Kiro

Add `skill/SKILL.md` as a rule file in your IDE settings.

### skills.sh

```bash
npx skills add <your-github-user>/qac-spec
```

## Usage

Once installed, the skill activates automatically when the agent commits. No manual invocation required.

## Compatibility

The skill format (YAML frontmatter + Markdown) is compatible with:

- Claude Code (steering files)
- Cursor (rules)
- Kiro (steering)
- Any agent that reads Markdown instruction files

## Customization

Edit `skill/SKILL.md` to:

- Change the default agent name
- Adjust What/Why generation guidelines for your project's conventions
- Add project-specific examples
