# BRIEF

## Project
- Name: omsk gatering
- Path: C:\project21\omsk gatering
- Stack: React + Vite + TypeScript + Tailwind

## MCP Memory
- Local MCP server: C:\MCP GPT CODE\mcp_memory\server.py
- SQLite DB: C:\MCP GPT CODE\memory.sqlite
- VS Code config: .vscode\mcp.json

## Session Start (Memory Pull)
- Run in chat: memory_tail(20)
- Optional: memory_search("omsk gatering", 20)
- Open BRIEF.md and WORKLOG.md

## Session End (Auto Log)
- Append a 3–6 bullet summary to WORKLOG.md
- Also call memory_append(summary, "assistant", "project:omsk-gatering,session:YYYY-MM-DD")

## Current Goals
- 

## Notes
- Local card covers are cached in `public/cards`; map is in `src/data/localCardImages.ts`.
- For recache, put `POLLINATIONS_API_KEY` in `.env` (see `.env.example`) and run `npm run cache:card-images`.
- Keeper audit artifacts are in `output/keeper-audit/` (engine + UI reports and screenshots).

## Next Session Prompt
- Paste in new chat:
  `Подхвати память по проекту omsk gatering. Открой BRIEF.md и WORKLOG.md, затем проверь output/keeper-audit (engine-keeper-report.json, mechanics-matrix-report.json, ui-keeper-report-post-fix.json). После этого продолжим: 1) расширить regression-покрытие механик, 2) пройти адаптивность mobile/desktop, 3) финальный UX-polish режима с Хранителем.` 
