# claude-minimal

用 ~150 行 Node.js 代码，通过 `stream-json` stdio 协议直接驱动 **Claude Code** 的最小化示例 —— 无 SDK，无框架，只有原生进程通信。

## 功能

- 以 `--output-format stream-json` 和 `--input-format stream-json` 启动 `claude` 子进程
- 逐行读取 JSON 消息流，将助手文本输出到终端
- 打印工具调用日志（`[tool] <name> <input>`），可清楚看到 Claude 的操作
- 拦截 `control_request`（权限提示），将你的 `y/n` 答案回写到子进程 stdin
- 每次新会话结束后，将 `session_id` 写入 `.session` 文件，便于下次恢复

## 前置条件

- Node.js ≥ 18
- 已安装并登录 [Claude Code](https://claude.ai/code) CLI（`claude --version` 可正常执行）

## 使用方法

### 开启新会话

```bash
node index.js
```

Claude 会自动发出问候。在 `你:` 提示符处输入消息并回车即可。

### 恢复上次会话

```bash
node index.js --resume <session_id>
```

或直接读取自动保存的 ID：

```bash
node index.js --resume $(cat .session)
```

### 退出

在提示符处输入 `exit` 或 `/exit`。

## 工作原理

```
终端输入
     │
     ▼
  readline
     │  JSON { type: "user", message: { role, content } }
     ▼
  child.stdin  ──►  claude 进程  ──►  child.stdout
                                           │
                         逐行 JSON 解析（readline）
                                           │
                    ┌──────────────────────┤
                    │  msg.type            │
                    ├─ "system"        → 打印 session_id / model
                    ├─ "assistant"     → 输出文本，打印 tool_use
                    ├─ "result"        → 等待下一条用户输入
                    └─ "control_request" → y/n 权限确认
```

## 关键参数

| 项目 | 说明 |
|---|---|
| 协议 | `stream-json`（换行符分隔的 JSON over stdio）|
| 权限模式 | `--permission-prompt-tool stdio` — 每次工具调用前询问确认 |
| 会话持久化 | 在收到 `system/init` 消息后写入 `.session` |
| 依赖 | 零依赖 —— 仅使用 Node.js 内置模块（`child_process`、`readline`、`fs`）|

## 文件结构

```
claude-minimal/
├── index.js      # 全部逻辑
├── package.json
└── .session      # 自动生成，存储上次的 session_id
```

## 为什么做这个

### 动机

Claude Code 是一个功能完整、可用于生产的 Agent 运行时 —— 它开箱即用地处理工具执行、文件编辑、Shell 命令、记忆管理和多步推理。问题在于：**它能否作为自己应用程序的底层 Agent 框架来使用？**

如果可以，这将带来一个很有价值的东西：不必直接调用 Anthropic API（按 token 计费），而是可以基于 **Claude 订阅套餐**来构建应用。计费模式完全不同 —— 固定月费，不限用量。

### 目标

本项目是一个专注的实验，目的是回答一个问题：

> *如何以编程方式与 Claude Code 交互，从而让它作为自己软件的底层 Agent 层？*

一旦搞清楚 stdio JSON 协议 —— 消息如何构造、工具权限请求如何处理、会话如何恢复 —— 就掌握了将 Claude Code 封装为 Agent 后端并用自己的编排逻辑驱动它所需的全部知识。

### 系列项目

`claude-minimal` 是 **agent-series** 的入口。它将一切精简到最小，让协议细节一目了然。系列后续项目在此基础上逐步添加工具调用、记忆管理和上层编排逻辑。

---

[English →](README.md)
