# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

This repository contains the GitHub Spec Kit (speckit) scaffold, a filled-in constitution, and two draft feature specs under `specs/` (`001-job-matching-marketplace` and `002-shared-knowledge-base`). No application code has been written yet, and there is no build system, test suite, or source tree. Everything here supports **Spec-Driven Development (SDD)**: writing a feature spec, clarifying it, planning it, breaking it into tasks, and only then implementing it.

Don't assume a tech stack, test runner, or lint command exists — check `plan.md` for the feature you're working on (once one exists) for the chosen stack, since none is fixed at the repo level yet.

`001-job-matching-marketplace` is built first and also defines the shared frame of the whole prototype: the home page, header navigation, user switcher, activity feed, demo reset, seed data step, time debug buttons, and the shared design language taken from https://varodd.no/ (see the Design Language section of its spec and constitution principle IV). `002-shared-knowledge-base` and any later features build on that frame and reuse its businesses and simulated users. Per the constitution, all features share one codebase and one tech stack, so the stack chosen when planning 001 applies to 002 as well. Each spec has a `## Clarifications` section recording decisions made with the project owner; read it before changing a spec.

## Spec-Driven Development workflow

Work happens through a fixed pipeline of slash commands (implemented as Claude Code skills under `.claude/skills/`, one directory per command). The invoke separator for this project is `-`, so commands are `/speckit-<name>`, not `/speckit.<name>`.

Typical order for a new feature:

1. `/speckit-constitution` — establish/update project-wide principles in `.specify/memory/constitution.md`.
2. `/speckit-specify <description>` — creates a new feature directory under `specs/` (`specs/NNN-short-name/spec.md`) and writes the spec from the description. Also generates `specs/NNN-short-name/checklists/requirements.md` to validate spec quality.
3. `/speckit-clarify` — asks up to 5 targeted clarification questions and encodes answers back into the spec.
4. `/speckit-checklist` — optional, generates a custom reviewer checklist.
5. `/speckit-plan` — reads the spec + constitution, fills Technical Context, runs Phase 0 (research.md) and Phase 1 (data-model.md, contracts/, quickstart.md).
6. `/speckit-tasks` — reads plan.md + spec.md (+ data-model.md/contracts/research.md if present) and generates a dependency-ordered `tasks.md`, organized by user story (P1/P2/P3...), with strict `- [ ] T### [P?] [US#?] Description with file path` formatting.
7. `/speckit-analyze` — non-destructive cross-check of spec.md / plan.md / tasks.md for consistency.
8. `/speckit-implement` — executes tasks.md phase by phase, checking `checklists/` status first and gating on unchecked items.
9. `/speckit-converge` — assesses the actual codebase against spec/plan/tasks and appends any missed work as new tasks, so `/speckit-implement` can pick it up.

Each command's full behavior (pre/post-execution extension hooks, validation rules, output format) is defined in its `SKILL.md` under `.claude/skills/speckit-*/`. Read the relevant one before changing how a command behaves — don't guess at the pipeline from this summary alone.

## Feature state and paths

- The **active feature** is tracked in `.specify/feature.json` (`{"feature_directory": "specs/NNN-short-name"}`), written by `/speckit-specify` and read by every later command. There's no reliance on git branch naming — the spec directory name and git branch are independent.
- `.specify/feature.json` is ignored by git (see `.specify/.gitignore`), so a fresh clone has no active feature. Set it, or `SPECIFY_FEATURE_DIRECTORY`, to the feature you're working on before running `/speckit-plan` or any later command.
- `SPECIFY_FEATURE_DIRECTORY` (env var) overrides the stored feature directory when set; `SPECIFY_FEATURE_NO_PERSIST=1` prevents scripts from writing `.specify/feature.json` (used by multi-agent/CI orchestration).
- Feature numbering is `sequential` (3-digit prefix, e.g. `003-user-auth`) per `.specify/init-options.json`; it can be switched to `timestamp` (`YYYYMMDD-HHMMSS-name`) prefixes instead.

## Scripts

`.specify/scripts/python/` is the active variant (`init-options.json` has `"script": "py"`; a `bash/` twin exists but isn't used by this project's integration). Skills invoke these directly — don't reimplement their logic:

- `common.py` — shared helpers: repo-root discovery, feature-path resolution, template-layer resolution (`resolve_template_content`), invoke-separator lookup.
- `create_new_feature.py` — backs `/speckit-specify`; creates `specs/NNN-name/spec.md` from the resolved `spec-template` and persists `feature.json`.
- `setup_plan.py` / `setup_tasks.py` / `check_prerequisites.py` — back `/speckit-plan`, `/speckit-tasks`, `/speckit-implement` respectively; resolve feature paths and template content as JSON for the skill to consume.
- `resolve_template.py` — CLI entry point for template resolution used directly by `/speckit-specify`.

All scripts support `--json` output and are meant to be run from the repo root via `python3 .specify/scripts/python/<script>.py ...`.

## Template layering

Templates (`spec-template.md`, `plan-template.md`, `tasks-template.md`, `checklist-template.md`, `constitution-template.md`) live in `.specify/templates/` and are resolved through a priority stack (see `resolve_template_content` in `common.py`):

1. `.specify/templates/overrides/<name>.md` — project override, wins outright.
2. `.specify/presets/<preset-id>/templates/` — composed via each preset's `preset.yml` (`replace` | `prepend` | `append` | `wrap` strategies against the core template).
3. `.specify/extensions/<ext-id>/templates/` — same conventional lookup, no manifest-driven composition.
4. `.specify/templates/<name>.md` — core template (the fallback currently in effect, since no overrides/presets/extensions exist yet).

None of `.specify/presets/` or `.specify/extensions/` exist in this repo yet — every template currently resolves to the core one as-is.

## Extension hooks

Every speckit command checks `.specify/extensions.yml` for hooks at `hooks.before_<command>` / `hooks.after_<command>` before/after its main work (dotted hook command names like `speckit.git.commit` map to `/speckit-git-commit`). This file doesn't exist in the repo yet, so hooks are currently a no-op for every command — don't assume any hook fires until `.specify/extensions.yml` is added.
