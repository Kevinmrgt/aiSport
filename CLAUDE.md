# SportCoach IA - Claude project instructions

The canonical Claude configuration for this repository lives in
`sportcoach-claude-config/`.

Use these files as the project source of truth:

- `sportcoach-claude-config/CLAUDE.md`
- `sportcoach-claude-config/.claude/rules/`
- `sportcoach-claude-config/.claude/agents/`
- `sportcoach-claude-config/.claude/skills/`

Operational reminders:

- Keep secrets in environment variables or platform secrets only.
- Do not commit `.env*`, `.vercel`, `.next`, coverage reports, or local Claude
  permission files.
- Build order is `shared -> api -> web`.
- Production URLs are:
  - Web: `https://ai-sport-web.vercel.app`
  - API: `https://ai-sport-api.vercel.app`
