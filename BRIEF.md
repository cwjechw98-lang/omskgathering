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
- 

## Next Session Prompt
- Paste in new chat:
  `Подхвати память по проекту omsk gatering. Открой BRIEF.md и WORKLOG.md. Проверь git status и последний коммит. Проверь локальные обложки карт и рубашку в UI (output/visual-covers как референс). Затем продолжим по адаптивности mobile/desktop и polishing.` 
