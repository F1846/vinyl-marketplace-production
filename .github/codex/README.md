# Continuous Repo Check

This directory contains the prompt, output schema, and notes for the scheduled Codex security audit workflow.

## Required GitHub secret

Add `OPENAI_API_KEY` in the repository settings before relying on the workflow schedule.

## What the workflow does

- Runs every hour and also supports manual `workflow_dispatch`.
- Installs dependencies before invoking Codex so local validation can run without extra network access.
- Lets Codex inspect the repository and apply at most one safe, targeted fix per run.
- Pushes any resulting change set to `codex/security-audit-<topic>` and creates or updates a PR with `codex` and `codex-automation` labels.
- Requests review from `F1846` when GitHub allows it and records the result in the workflow summary.

## Guardrails

- The workflow keeps Codex in `workspace-write` mode with the default `drop-sudo` safety strategy on `ubuntu-latest`.
- The prompt explicitly blocks self-edits to `.github/workflows/**` and `.github/codex/**` so the automation cannot rewrite its own pipeline.
- Runtime environment variables are placeholders only. They exist to unblock typecheck, builds, and focused tests without exposing production credentials.

## Local handoff

Keep the desktop automation active until this workflow is merged and `OPENAI_API_KEY` is configured. After that, pause the local `continuos-repo-check` automation to avoid duplicate runs.
