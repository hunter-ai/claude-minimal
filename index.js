const { spawn } = require('node:child_process')
const { createInterface } = require('node:readline')
const { writeFileSync, readFileSync } = require('node:fs')

// 解析命令行参数：node index.js [--resume <session_id>]
const args = process.argv.slice(2)
const resumeIdx = args.indexOf('--resume')
const resumeId = resumeIdx !== -1 ? args[resumeIdx + 1] : null

// session_id 持久化路径
const SESSION_FILE = '.session'

// 构建 claude 启动参数
const claudeArgs = [
    '--output-format', 'stream-json',
    '--input-format',  'stream-json',
    '--verbose',
    '--permission-prompt-tool', 'stdio'
]
if (resumeId) {
    claudeArgs.push('--resume', resumeId)
    console.log('[resume] 恢复会话:', resumeId)
}

// 启动 Claude 进程
const child = spawn('claude', claudeArgs, {
    cwd: process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe']
})

child.on('error', (err) => {
    console.error('[error] 启动 claude 失败:', err.message)
    process.exit(1)
})

child.on('close', (code) => {
    console.log(`\n[exit] claude 进程退出，code=${code}`)
    process.exit(0)
})

child.stderr.on('data', (data) => {
    process.stderr.write('[stderr] ' + data)
})

let initialized = false

// 读取 stdout，逐行解析 JSON
const rl = createInterface({ input: child.stdout })
rl.on('line', (line) => {
    if (!line.trim()) return
    try {
        const msg = JSON.parse(line)
        handleMessage(msg)
    } catch {}
})

function handleMessage(msg) {
    switch (msg.type) {
        case 'system':
            if (msg.subtype === 'init' && !initialized) {
                initialized = true
                console.log('[session_id]', msg.session_id)
                console.log('[model]', msg.model)
                // 保存 session_id 到文件，方便下次 --resume
                if (msg.session_id) {
                    writeFileSync(SESSION_FILE, msg.session_id, 'utf8')
                    console.log(`[提示] 下次可用以下命令恢复会话:`)
                    console.log(`       node index.js --resume ${msg.session_id}`)
                }
            }
            break

        case 'assistant':
            for (const block of msg.message?.content ?? []) {
                if (block.type === 'text') {
                    process.stdout.write(block.text)
                }
                if (block.type === 'tool_use') {
                    console.log('\n[tool]', block.name, JSON.stringify(block.input, null, 2))
                }
            }
            break

        case 'user':
            break

        case 'result':
            console.log('\n---')
            waitForInput()
            break

        case 'control_request':
            handlePermissionRequest(msg)
            break
    }
}

// 处理权限请求
function handlePermissionRequest(msg) {
    const { request_id, request } = msg
    const toolName = request.tool_name ?? '未知工具'
    const input    = request.input ?? {}

    console.log('\n[权限请求]')
    console.log('  工具:', toolName)
    console.log('  参数:', JSON.stringify(input, null, 2))

    const term = createInterface({ input: process.stdin, output: process.stdout })
    term.question('  允许执行? (y/n): ', (answer) => {
        term.close()
        const allow = answer.trim().toLowerCase() === 'y'
        const response = {
            type: 'control_response',
            response: {
                subtype: 'success',
                request_id,
                response: allow
                    ? { behavior: 'allow', updatedInput: input }
                    : { behavior: 'deny', message: '用户拒绝' }
            }
        }
        child.stdin.write(JSON.stringify(response) + '\n')
        console.log(allow ? '  → 已允许' : '  → 已拒绝')
    })
}

// 发消息给 Claude
function send(text) {
    const msg = {
        type: 'user',
        message: { role: 'user', content: text }
    }
    child.stdin.write(JSON.stringify(msg) + '\n')
}

// 从终端读用户输入
function waitForInput() {
    const term = createInterface({ input: process.stdin, output: process.stdout })
    term.question('\n你: ', (input) => {
        term.close()
        const text = input.trim()
        if (!text) { waitForInput(); return }
        if (text === '/exit' || text === 'exit') {
            child.stdin.end()
            process.exit(0)
        }
        send(text)
    })
}

console.log('正在启动 Claude...')
if (resumeId) {
    waitForInput()
} else {
    send('你好')
}
