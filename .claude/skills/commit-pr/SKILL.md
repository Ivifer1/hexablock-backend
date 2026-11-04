---
name: commit-pr
description: Create Conventional Commits (in English) for the current change and open a pull request whose description comes from the change record. Use when the team asks to commit, push or open a PR.
---
# /commit-pr — commit and pull request

1. `git status` and `git diff`. Confirm verification is green (typecheck, lint, tests). If not, stop.
2. Group changes into small logical commits (spec, tests, implementation, docs). Each subject:
   `type(scope): imperative lowercase summary` in English, ≤ 72 chars; body explains WHY and cites IDs (`Refs: UC-010, FR-020`).
   Include the change record in the commit that introduces the code it explains.
3. Never commit on `main`, never `--no-verify`, never amend pushed commits.
4. Ask the team before pushing. Then `git push -u origin <branch>`.
5. Create the PR with `gh pr create --base main --title "<conventional title>" --body-file <tmp file>`. Build the body from
   `.github/pull_request_template.md`, filling each section from the change record (spec, design rationale, SOLID, patterns,
   tests, AI usage). Ask the team before running it.
6. Reply in Spanish with the PR link and what reviewers should look at first. Merging is a human decision.
