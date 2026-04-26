---
name: skill-creator
description: Create, write, and improve skills (reusable instruction files) for the BARAK MX Lab Dashboard project. Use this skill whenever the user asks to "create a skill", "make a skill", "build a skill", "save this as a skill", "add a skill for X", or when you identify a repeating workflow that would benefit from a permanent skill file. Also use proactively after completing a complex multi-step task that required non-obvious decisions — capture the pattern before the context is lost.
---

# Skill Creator 
A skill is a `.md` file in `/Users/andreyvolovich/Long-Term Investment/skills/` that gives you permanent, reusable instructions for a repeating task. Once written, the skill is always available in future conversations without needing to re-explain the context.

---

## When to Create a Skill

Create a skill when:
- The user explicitly asks for one
- A task required more than 3 non-obvious decisions that would need to be repeated next time
- A workflow touches 3+ files in a predictable pattern (e.g. "add a new API route" always touches `routes/`, `models.py`, `database.py`)
- The user corrects the same mistake twice — that correction belongs in a skill

Do NOT create a skill for:
- One-off tasks with no future repetition
- Things already in `CLAUDE.md` or another skill
- Tasks fully derivable from reading the code

---

## Skill File Format

All skills live in `/Users/andreyvolovich/Long-Term Investment/skills/` as `skill-<name>.md`.

```
---
name: <kebab-case-identifier>
description: <one paragraph — what it does AND when to trigger it. Be specific enough
             that you will actually reach for this skill next time. Include trigger phrases.>
---

# Skill: <Human Title>

## Purpose
One paragraph explaining what this skill covers and why it exists.

## When to Use
- Bullet list of specific trigger situations

## Step-by-Step Process
Numbered steps, concrete and imperative.
Include file paths, function names, patterns to follow.

## Patterns / Templates
Code snippets, SQL patterns, API patterns used in this project.

## Gotchas
Common mistakes to avoid. Things that burned time before.

## Verification
How to confirm the work is correct after completing it.
```

---

## Project-Specific Context to Include in Skills

When writing a skill for this project, embed the relevant facts:

**Stack:**
- Backend: FastAPI + SQLite (WAL mode), Python 3.11
- Frontend: Vanilla JS, Tailwind CSS (via CDN), no build step
- Deployment: Native Windows (no Docker), runs offline
- AI: Ollama (mistral-nemo + nomic-embed-text), fully offline

**Key file locations:**
- Routes: `backend/routes/<feature>.py`
- DB logic: `backend/database.py` (one class, one file)
- Pydantic models: `backend/models.py`
- Frontend components: `frontend/js/components/<name>.js`
- CSS: `frontend/css/input.css`, `frontend/css/elite.css`, `frontend/css/theme.css`
- HTML entry: `frontend/index.html`
- Report page: `frontend/report.html` (standalone, no framework)

**DB migration pattern** — always use `ALTER TABLE ADD COLUMN` in `_migrate_schema()` inside `database.py`, never recreate tables:
```python
columns_to_add = {
    "table_name": [
        ("new_column", "TEXT DEFAULT ''"),
    ],
}
```

**Adding a new API field end-to-end:**
1. `database.py` — add column to migration dict + update relevant `INSERT`/`UPDATE` SQL
2. `models.py` — add field to Pydantic model (`Optional[str] = None`)
3. `routes/<feature>.py` — pass field through from request body to DB call
4. `frontend/js/components/<dialog>.js` — read field from DOM, pass in API call
5. `frontend/index.html` — add DOM element if new UI needed

**CSS specificity trap:** Tailwind `hidden` class sets `display:none`, but inline `style.display = 'flex'` overrides it. To re-hide: set `el.style.display = ''` FIRST, then `el.classList.add('hidden')`.

**SQLite NULL vs missing key:** `dict.get('key', default)` returns the default only when the key is ABSENT. When SQLite stores NULL, the key IS present with value `None`. Always use `t.get('key') or default` for nullable columns.

---

## Writing a Good Description (Most Important Field)

The `description` in the frontmatter is what determines whether you reach for this skill in future conversations. Write it to be "pushy" — list the exact phrases that should trigger it:

**Weak:**
```
description: How to add backend API routes.
```

**Strong:**
```
description: How to add a new feature end-to-end in BARAK MX: DB migration, Pydantic
model, FastAPI route, frontend JS component, and HTML. Use this whenever adding a new
field, new section, new dialog, or new API endpoint. Trigger phrases: "add X to the
system", "new feature for Y", "I want to track Z", "add a field for W".
```

---

## Existing Skills (Check Before Creating)

Always check `/Users/andreyvolovich/Long-Term Investment/skills/` before writing a new skill — update an existing one if it's close enough.

| Skill file | Covers |
|---|---|
| `skill-github-connection.md` | Git/GitHub workflow |
| `skill-notebook-lm.md` | Knowledge base / NotebookLM integration |

---

## Process

1. **Identify the pattern** — what repeating task or workflow are we capturing?
2. **Check existing skills** — can we extend one instead of creating new?
3. **Draft the skill** — follow the format above, embed all relevant file paths and code patterns
4. **Write the description last** — make it trigger-phrase rich so you actually use it
5. **Save to** `skills/skill-<name>.md`
6. **Confirm** the skill accurately reflects what was just learned/built — if the conversation contained corrections or non-obvious choices, those go into "Gotchas"

---

## After Writing a Skill

Tell the user:
- The skill file path
- In one sentence: what future task it will help with
- Whether any existing skill was updated vs a new one created
