# claude-minimal

A minimal Node.js wrapper that drives **Claude Code** via its `stream-json` stdio protocol — no SDK, no framework, just raw process communication in ~150 lines.

## What it does

- Spawns the `claude` CLI subprocess with `--output-format stream-json` and `--input-format stream-json`
- Streams JSON messages line-by-line and renders assistant text to the terminal
- Logs tool-use calls (`[tool] <name> <input>`) so you can see what Claude is doing
- Intercepts `control_request` (permission prompts) and forwards your `y/n` answer back over stdin
- Persists the `session_id` to a `.session` file after every new conversation so you can resume it later

## Prerequisites

- Node.js ≥ 18
- [Claude Code](https://claude.ai/code) CLI installed and authenticated (`claude --version` should work)

## Usage

### Start a new session

```bash
node index.js
```

Claude greets you automatically. Type your message at the `你:` prompt, then press Enter.

### Resume a previous session

```bash
node index.js --resume <session_id>
```

Or grab the ID that was saved automatically:

```bash
node index.js --resume $(cat .session)
```

### Exit

Type `exit` or `/exit` at the prompt.

## How it works

```
Terminal input
     │
     ▼
  readline
     │  JSON { type: "user", message: { role, content } }
     ▼
  child.stdin  ──►  claude process  ──►  child.stdout
                                              │
                          line-by-line JSON parsing (readline)
                                              │
                    ┌─────────────────────────┤
                    │  msg.type               │
                    ├─ "system"  → log session_id / model
                    ├─ "assistant" → print text, log tool_use
                    ├─ "result"  → prompt next user input
                    └─ "control_request" → y/n permission prompt
```

## Key details

| Thing | Detail |
|---|---|
| Protocol | `stream-json` (newline-delimited JSON over stdio) |
| Permission mode | `--permission-prompt-tool stdio` — prompts you before every tool call |
| Session persistence | Saved to `.session` after `system/init` |
| Dependencies | Zero — only Node.js built-ins (`child_process`, `readline`, `fs`) |

## File structure

```
claude-minimal/
├── index.js      # everything
├── package.json
└── .session      # auto-created; stores the last session_id
```

## Why this exists

### The motivation

Claude Code is a capable, production-ready agent runtime — it handles tool execution, file editing, shell commands, memory, and multi-step reasoning out of the box. The question is: **can it be used as the underlying agent framework for your own applications?**

If yes, that unlocks something valuable: instead of calling the Anthropic API directly (which charges per token), you can build on top of a **Claude subscription plan**. The cost model is completely different — flat monthly fee, unlimited usage.

### The goal

This project is a focused experiment to answer one question:

> *How do you interact with Claude Code programmatically so that it can serve as the agent layer beneath your own software?*

Once you understand the stdio JSON protocol — how messages are structured, how tool permission requests work, how sessions are resumed — you have everything you need to wrap Claude Code as your agent backend and drive it from any orchestration logic you write.

### The series

`claude-minimal` is the entry point of the **agent-series**. It strips everything down to the bare minimum so the protocol is easy to read. Subsequent projects in the series build on this foundation, adding tools, memory management, and higher-level orchestration.

## License

MIT © [iHunterDev](https://github.com/hunter-ai/claude-minimal)

If you use this code, please include the author's name and a link to the original repository.

---

[中文文档 →](README.zh.md)
