# Contributing to QAC

QAC is a specification. Contributions that change the spec are subject to a higher bar than contributions that improve documentation or tooling.

## Types of contributions

### Documentation and examples

Pull requests that fix typos, improve clarity, add examples, or correct technical errors are welcome and reviewed quickly.

### Tooling (enforcement hook, skill)

The hook and skill are reference implementations — they demonstrate how to apply the spec, but the spec itself is the authoritative source. PRs that improve correctness, portability, or agent compatibility are welcome.

### Specification changes

Changes to SPECIFICATION.md require a clear rationale: what problem the current spec fails to address, why the proposed change solves it without introducing new gaps, and whether the change is backward-compatible.

Changes that add new trailer keys, modify allowed Mode values, or alter required ordering are considered breaking changes and will be discussed before merging.

## Process

1. Open an issue describing the problem or improvement before opening a PR
2. Reference the issue in the PR
3. Keep PRs focused — one concern per PR

## Versioning

The specification follows semantic versioning:

- **Patch** (v1.0.x) — clarifications, typo fixes, non-normative changes
- **Minor** (v1.x.0) — backward-compatible additions (new optional behavior, extended tooling)
- **Major** (vX.0.0) — breaking changes to the schema (new required trailers, changed Mode values, altered ordering rules)

The current version is defined in the `## Specification` heading in [SPECIFICATION.md](SPECIFICATION.md).

## Commit format

Contributions to this repository follow QAC. All commits made by AI agents must include the four mandatory trailers. Human commits do not require trailers.
