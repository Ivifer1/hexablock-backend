---
name: ai-log
description: Append an entry to AI_USAGE.md from the branch change record, as the professor requires (tool, model, prompt, result, team modifications, lessons). Use after a significant AI-assisted change, before opening the PR.
---
# /ai-log — document AI usage

The brief treats undocumented AI use like plagiarism, so every significant contribution gets an entry.

1. Read the branch change record, especially "AI usage", and `AI_USAGE.md`.
2. Ask the team (in Spanish) for what you cannot know: what THEY changed after your output, which suggestions they rejected and why,
   and the lesson learned. Do not invent these.
3. Append one row to the task log table in `AI_USAGE.md` with: date, task (+ UC/branch), tool and model, prompt (literal or faithful
   paraphrase), result, modifications made by the team, lessons/limitations.
4. If the AI produced something wrong that was caught (by a hook, test, reviewer or human), add it to the "Critical evaluation" section.
5. Never include secrets, tokens or personal data in prompts or logs.
Show the team the new entry before saving.
