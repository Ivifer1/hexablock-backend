# Change record: <branch-name>

Status: PROPOSED
<!-- Only a human changes this line to "Status: APPROVED" (hooks block the agent from doing it). -->
Author(s): <team member> with <AI tool and model>
Date: <YYYY-MM-DD>

## Spec and traceability
- Use cases: UC-###
- Requirements: FR-###, NFR-###, C-###
- Business rules covered: BR-###-n

## Problem
What behaviour is missing or wrong, in 2–4 sentences.

## Proposed design
Short description of the solution. List of new/changed types:

| Type | Kind (class, interface, port, decorator…) | Layer | Responsibility (one sentence) |
| --- | --- | --- | --- |

## Clean Architecture
- Dependency directions introduced (A → B), all pointing inwards.
- Ports declared (inner layer) and their adapters (outer layer).
- Where it is wired (composition root).

## SOLID
Only the principles actually at play, each with the concrete class:
- **SRP:**
- **OCP:**
- **LSP:**
- **ISP:**
- **DIP:**

## Design patterns
| Pattern | Participants (role → class) | Problem it solves here | Simpler alternative rejected and why |
| --- | --- | --- | --- |

## Extensibility and infrastructure independence
- To add a fifth variant / a rule change related to this, create: …
- Files that would NOT change: …
- Infrastructure that can be swapped without touching domain/application: …

## Alternatives considered
Option, pros, cons, why not chosen.

## Test plan
| Spec element (flow / BR) | Test name (`should_…_when_…`) | Level (unit / integration / e2e / UI) |
| --- | --- | --- |

## Open questions for the team
Decisions the humans must make before or during implementation.

## Implementation notes
_(pending)_ Filled after approval: what was built, deviations from the proposal and why.

## Verification
_(pending)_ Commands run and results (typecheck, lint, tests), design-reviewer verdict, how tests were shown to fail when the rule breaks.

## AI usage
_(pending)_ Tool and model, main prompts (literal or faithful paraphrase), what the AI produced, what the team changed, lessons. Feeds AI_USAGE.md.
