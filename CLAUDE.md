# Get Freak: working rules for agents

Get Freak is an 18+ mobile app of games for couples, played together on one phone. It may be
described as such anywhere in this repository.

## Names and content

- In code, the two games are `dares` and `questions`, and categories and levels have ids. Their
  display names, and every other name shown to players, live in content data, so a name can change
  without touching code.
- Keep game content, such as card and question text, in data files in `packages/content`, apart from
  the code.
- Branch names are the ticket id plus a short slug, for example `FRK-12/turn-screen`.

## Architecture decisions

Record a decision the ticket did not cover as one list entry, `- **<decision>** (<ticket>): <reason>`,
at the end of its area's file in `docs/decisions/`. Never use a table there, and never edit
another entry. `docs/architecture.md` lists the areas. If no area fits, add a new file and link it
from the Decisions section of `docs/architecture.md`.

## Development decisions

Decisions the owner has made about how work moves. The orchestrating agent follows them without
asking again.

- **Merging.** When a pull request has passed CI (the `checks` status) and the reviewer agent has
  approved it, the orchestrating agent squash-merges it. It does not wait for the owner. Decided by
  the owner on 2026-11-18. In this repository this replaces any instruction elsewhere to leave
  merging to the owner.
- Both conditions are needed: a green `checks` status on the pull request's latest commit, and the
  reviewer agent's approval of that commit, given after any fix rounds. An open change request, or
  a comment from the owner that has not been answered, is not approval.
- Never get a merge through by bypassing the required check, by an admin override, by a force push
  or by changing branch protection. If a pull request cannot pass the check, say so and stop.
- Merge in dependency order, and start the next ticket from `main` once the ticket it depends on
  has merged, so branches do not need stacking.
- After a merge, move the ticket to Done. The pull request description still says what to check on
  a real device and which decisions the ticket did not cover.

## Where things live

- The plan and tickets are in Linear under the `FRK` team. The ticket is the spec.
- Node 26 (`.nvmrc`) and pnpm.
