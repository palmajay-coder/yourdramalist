---
name: handoff
description: Update handoff.md so the next session can pick up the YourDramaList work, then commit and push it. Use when the user types /handoff or asks to update the handoff.
---

# Update the handoff

`handoff.md` lives at the repo root and exists only on GitHub, never on Val Town. It tells the next session what the project does, what shipped, which decisions stand and what comes next.

## Steps

1. Read `handoff.md` in full, then check `git log --oneline -10` and `git status` to see what changed since its last update.
2. Compare the file with what this session did: releases, Val Town version, decisions, test results, open questions and anything the user put on hold.
3. If nothing changed, tell the user so and stop. Do not make an empty commit.
4. Otherwise edit only the sections that went stale. Keep the existing headings and their order:
   - Project
   - Completed in each release (add a new "Completed in X.Y.Z" section for a new release)
   - Important decisions
   - Workflow
   - Current status
   - Next up
   - Open ideas (not requested yet)
5. Follow the file's style:
   - Each bullet starts with a bold label and a colon.
   - Short plain sentences, no em dashes.
   - Never include the user's email, model names or secrets.
6. Commit only `handoff.md` with a message like "Update handoff for <what changed>", using the session's attribution trailer, then push to the session's work branch with `git push -u origin <branch>`.
7. Reply with a few bullets naming what changed in the file and the commit hash. Send the file with SendUserFile if the user asks to see it.
