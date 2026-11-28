# Architecture Decision Records

Architecture decisions are taken by the team (brief, section 7.3), not by the AI. Record each one here:
generic type parameters and bounds, layer boundaries, variant factory and registry, persistence choice, AOP strategy, etc.
Copy `0000-template.md` to `NNNN-short-title.md`. AI may draft; humans accept.

## Implementation and formal status

[ADR-0001](0001-mongodb-with-mongoose.md) records MongoDB, Mongoose and `mongodb-memory-server` but still has `Status: Proposed`.
Those technologies are implemented in the backend and used by the verification setup; that evidence does not automatically change a team's formal acceptance record.
The team must confirm the status explicitly. This documentation reconciliation preserves the original ADR rather than manufacturing approval.

The [spec dashboard](../specs/dashboard.md) records the verified integrated baseline. Neither that snapshot nor a passing CI run means that a production database has been provisioned or deployed.
