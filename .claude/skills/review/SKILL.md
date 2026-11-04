---
name: review
description: Review the current branch (or a PR) against Clean Architecture, SOLID, GoF patterns and the spec, and prepare the team for jury questions. Use before opening or approving a pull request.
argument-hint: "[PR number]"
---
# /review — design review

1. If a PR number is given, `gh pr view <n>` and `gh pr diff <n>`; otherwise review `git diff main...HEAD` plus uncommitted changes.
2. Review order (Spec-Driven Development): first the spec changes (is the behaviour right?), then the code (does it match the spec,
   no more and no less?), then the tests (do they cover every flow and rule?).
3. Delegate the detailed check to the `design-reviewer` subagent and merge its findings with yours.
4. Answer in Spanish with: verdict, blocking findings (`file:line`, principle, fix), suggestions, and 3 likely jury questions with answers.
Do not modify files.
