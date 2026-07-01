# Alcide - Claude project instructions

The canonical Claude configuration for this repository lives in
`alcide-claude-config/`.

Use these files as the project source of truth:

- `alcide-claude-config/CLAUDE.md`
- `alcide-claude-config/.claude/rules/`
- `alcide-claude-config/.claude/agents/`
- `alcide-claude-config/.claude/skills/`

Operational reminders:

- Keep secrets in environment variables or platform secrets only.
- Do not commit `.env*`, `.vercel`, `.next`, coverage reports, or local Claude
  permission files.
- Build order is `shared -> api -> web`.
- Production URLs are:
  - Web: `https://alcide-web.vercel.app`
  - API: `https://alcide-api.vercel.app`
