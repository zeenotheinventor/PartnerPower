# Get Freak: working rules for agents

Get Freak is a mobile app of games for couples to connect with each other.

## Tone of everything in this repository

This codebase may be shown publicly as a portfolio piece. Keep it safe for work.

- Describe the app as games for couples to connect with each other, and say no more than that about
  its content. This covers the README, documents, code comments, commit messages and pull request
  text.
- In code, the two games are `dares` and `questions`. Their display names, and every other name shown
  to players, live in content data, which may use whatever words the product needs.
- Keep game content, such as card and question text, in data files apart from the code, so the code
  can be shown without it.
- Branch names are the ticket id plus a neutral slug, for example `FRK-12/turn-screen`. Do not copy
  the branch name Linear suggests, since it repeats the ticket title.
- Use neutral names for code: `category`, `level`, `card`, `deck`. Do not put content words in
  identifiers, file names or test names.

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

- The plan and tickets are in Linear under the `FRK` team. The ticket is the spec, and it holds the
  content detail that this repository leaves out.
- Node 26 (`.nvmrc`) and pnpm.
