# PartnerPower: working rules for agents

PartnerPower is a mobile app of games for couples to connect with each other.

## Tone of everything in this repository

This codebase may be shown publicly as a portfolio piece. Keep it safe for work.

- Describe the app as games for couples to connect with each other, and say no more than that about
  its content. This covers the README, documents, code comments, commit messages and pull request
  text.
- Do not write the names of the games or the project code name anywhere in the repository. In code,
  the two games are `dares` and `questions`. Their display names come from content data.
- Keep game content, such as card and question text, in data files apart from the code, so the code
  can be shown without it.
- Use neutral names for code: `category`, `level`, `card`, `deck`. Do not put content words in
  identifiers, file names or test names.

## Where things live

- The plan and tickets are in Linear under the `FRK` team. The ticket is the spec, and it holds the
  names and content detail that this repository leaves out.
- Node 24 (`.nvmrc`) and pnpm.
