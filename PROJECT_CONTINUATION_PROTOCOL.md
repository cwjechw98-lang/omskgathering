Ассистент всегда отвечает пользователю на русском языке.

# PROJECT CONTINUATION PROTOCOL

Purpose: ensure any new session can continue work with zero context loss and minimal token usage.

## 1) Mandatory Session Cycle

1. **Start Session**
   - Read context in strict order:
     1) `PROJECT_CONTINUATION_PROTOCOL.md`
     2) `README.md`
     3) `WORKLOG.md` (latest entries only)
     4) `progress.md` (latest delta only)
     5) files directly related to current task
2. **Define Delta Goal**
   - Write 1-3 concrete outcomes for this session.
   - Avoid re-planning unchanged context.
3. **Execute Tasks**
   - Implement in small, atomic steps.
   - Validate each step with targeted checks only.
4. **Pre-Commit Validation**
   - Run only relevant quality gates for changed scope.
5. **Commit Push Deploy**
   - Follow strict GitHub process in section 6.
6. **Close Session**
   - Append short delta entries to `WORKLOG.md` and `progress.md`.
   - Update roadmap progress section in this file using delta format.

## 2) Context Reading Rules

- Read **latest delta first**, not full history.
- Re-open older logs only if current task explicitly depends on them.
- Never duplicate unchanged architecture notes in new logs.

## 3) Task Execution Order

1. Confirm target outcome and acceptance checks.
2. Perform smallest safe documentation or code change.
3. Verify locally with minimal sufficient commands.
4. Record only changed facts.
5. Commit atomically.

## 4) Delta-Only Logging Rules

Use short entries with this template:

```md
### YYYY-MM-DD — short title
- Scope: <what changed>
- Validation: <what was checked>
- Deploy trigger readiness: <workflow and branch pre-check result>
- Notes: <only new risks or follow-ups>
```

Hard rules:
- No repeated project summary.
- No repeated historical metrics unless changed.
- No copy-paste of unchanged roadmap blocks.

## 5) Roadmap Progress Format

Maintain only delta updates:

```md
## Roadmap Delta
- Date:
- Phase: MVP | v1 | v2
- Item:
- Status: planned | in-progress | done | blocked
- Evidence: file path or check output
- Next:
```

### Current Engagement Roadmap for Free Project

#### MVP engagement base
- Guided onboarding and adaptive hints
- Daily weekly tasks and achievements
- XP profile progression
- PvE challenge ladder
- Telemetry base
- Performance and reliability baseline

#### v1 social depth
- Deck builder
- Seasonal events
- Async PvP invite flow
- Replays and sharing
- A B experimentation for UX

#### v2 community scale
- Clans and cooperative goals
- Extension of events async and replay systems

## 6) Strict GitHub Process

### 6.1 Repository and Branch Policy

- Remote repository:
  - `origin`: `https://github.com/cwjechw98-lang/omskgathering.git`
- Deployment branch: `main`
- Work branches:
  - `feature/<short-topic>`
  - `fix/<short-topic>`
  - `docs/<short-topic>`

### 6.2 Atomic Commit Rules

- One commit = one logical change.
- Do not mix refactor + feature + docs unless inseparable.
- Commit message format:
  - `<type>(<scope>): <summary>`
  - Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`
  - Example: `docs(protocol): add continuation and deploy pre-check flow`

### 6.3 Mandatory Pre-Push Check

Before push, verify all conditions that trigger GitHub Actions deployment:

1. Confirm branch is `main` for deploy trigger.
2. Confirm workflow files exist and trigger on push to `main`:
   - `.github/workflows/deploy-pages.yml`
   - `.github/workflows/quality-gate.yml`
3. Confirm deploy workflow includes:
   - `on.push.branches` contains `main`
   - build artifact path is `dist`
4. Confirm changes are committed.

Recommended command sequence:

```bash
git status
git branch --show-current
git remote -v
git add <files>
git commit -m "<type>(<scope>): <summary>"
git push origin <branch>
```

If working in feature branch, merge via PR, then push merge commit to `main`.

### 6.4 Commit Push Sequence for Guaranteed Auto-Deploy Pickup

1. Ensure target commit is on `main`.
2. Push to `origin/main`.
3. Verify Actions started for both workflows.
4. Log delta result in `WORKLOG.md` and `progress.md`.

## 7) Session End Checklist

- Updated only delta logs in `WORKLOG.md` and `progress.md`.
- Updated roadmap delta in this protocol if scope changed.
- Confirmed remote and branch policy still valid.
- Confirmed deploy trigger conditions before final push.
