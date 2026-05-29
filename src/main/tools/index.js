const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');
const config = require('../config');

const WORKSPACE = path.resolve(config.workspaceDir);

function ensureWorkspace() {
  if (!fs.existsSync(WORKSPACE)) fs.mkdirSync(WORKSPACE, { recursive: true });
}

function resolvePath(inputPath) {
  const cleaned = (inputPath || '.').replace(/^[/\\]+/, '').replace(/^\.\.[/\\]/, '');
  const resolved = path.resolve(WORKSPACE, cleaned);
  if (!resolved.startsWith(WORKSPACE + path.sep) && resolved !== WORKSPACE) {
    throw new Error(`路径越界拒绝: ${inputPath}`);
  }
  return resolved;
}

function addLineNumbers(text) {
  const lines = text.split('\n');
  const width = String(lines.length).length;
  return lines.map((l, i) => `${String(i + 1).padStart(width, ' ')}| ${l}`).join('\n');
}

const TOOLS = {
  'read-file':    { selfClosing: true,  hasPath: true },
  'write-file':   { selfClosing: false, hasPath: true },
  'update-file':  { selfClosing: false, hasPath: true },
  'list-path':    { selfClosing: true,  hasPath: true },
  'run-command':  { selfClosing: false, hasPath: false },
};

const toolCallMap = TOOLS;
const bgJobs = new Map(); // jobId → { proc, stdout, stderr, startTime }

function extractAttrs(attrStr) {
  const attrs = {};
  const re = /(\w[\w-]*)\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(attrStr)) !== null) attrs[m[1]] = m[2];
  return attrs;
}

function parseToolCalls(text) {
  const results = [];
  const seen = new Set();

  const names = Object.keys(TOOLS).join('|');
  const tagRegex = new RegExp(`<(${names})(\\s[^>]*)?(/>|>)([\\s\\S]*?)</\\1>|<(${names})(\\s[^>]*)?/>`, 'gi');

  let match;
  while ((match = tagRegex.exec(text)) !== null) {
    const name = match[1] || match[5];
    const attrStr = (match[2] || match[6] || '').trim();
    const isSelfClosing = !!(match[3] && match[3].includes('/>')) || !!match[7];
    const body = isSelfClosing ? '' : (match[4] || '');

    if (!TOOLS[name]) continue;

    const attrs = extractAttrs(attrStr);
    const filePath = attrs.path || '';
    const key = `${name}:${filePath}:${body}`;
    if (seen.has(key)) continue;
    seen.add(key);

    results.push({
      id: `c_${Date.now()}_${results.length}`,
      name,
      args: { filePath, dirPath: filePath, content: body, command: body, ...attrs }
    });
  }

  // Format 4: plain text "名称:\n{json}" fallback
  const knownNames = Object.keys(TOOLS).join('|');
  const plainRegex = new RegExp(`(?:^|\\n)\\s*(${knownNames})\\s*[:：]?\\s*(\\{[^}]*\\})`, 'g');
  while ((match = plainRegex.exec(text)) !== null) {
    const name = match[1];
    if (results.some(r => r.name === name)) continue;
    try {
      const args = JSON.parse(match[2]);
      if (typeof args === 'object' && !Array.isArray(args)) {
        const attrs = extractAttrs('');
        results.push({ id: `c_${Date.now()}_${results.length}`, name, args: { ...args, ...attrs } });
      }
    } catch (e) { /* skip */ }
  }

  return results;
}

async function executeToolCall(toolCall) {
  ensureWorkspace();
  const { name, args } = toolCall;

  let result;
  switch (name) {
    case 'read-file': {
      try {
        const fp = resolvePath(args.filePath);
        if (!fs.existsSync(fp)) result = `错误：文件不存在 —— ${args.filePath}`;
        else result = addLineNumbers(fs.readFileSync(fp, 'utf-8'));
      } catch (e) { result = `错误：${e.message}`; }
      break;
    }
    case 'write-file': {
      try {
        const fp = resolvePath(args.filePath);
        const dir = path.dirname(fp);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(fp, args.content, 'utf-8');
        result = `写入成功：${args.filePath} (${Buffer.byteLength(args.content, 'utf-8')} 字节)`;
      } catch (e) { result = `写入失败：${e.message}`; }
      break;
    }
    case 'update-file': {
      try {
        const fp = resolvePath(args.filePath);
        if (!fs.existsSync(fp)) { result = `错误：文件不存在 —— ${args.filePath}`; break; }

        const original = fs.readFileSync(fp, 'utf-8');
        const lines = original.split('\n');
        const newContent = args.content || '';
        let updated;

        // Mode 1: replace specific line number
        if (args.line) {
          const ln = parseInt(args.line, 10);
          if (ln < 1 || ln > lines.length) { result = `错误：行号 ${ln} 超出范围 (1-${lines.length})`; break; }
          lines[ln - 1] = newContent;
          updated = lines.join('\n');
          fs.writeFileSync(fp, updated, 'utf-8');
          result = `第 ${ln} 行已更新：${args.filePath}\n${addLineNumbers(updated)}`;
          break;
        }

        // Mode 2: replace line range (from="3" to="7")
        if (args.from && args.to) {
          const from = parseInt(args.from, 10);
          const to = parseInt(args.to, 10);
          if (from < 1 || to > lines.length || from > to) {
            result = `错误：行范围 ${from}-${to} 无效 (文件共 ${lines.length} 行)`; break;
          }
          const before = lines.slice(0, from - 1);
          const after = lines.slice(to);
          updated = [...before, newContent, ...after].join('\n');
          fs.writeFileSync(fp, updated, 'utf-8');
          result = `第 ${from}-${to} 行已更新：${args.filePath}\n${addLineNumbers(updated)}`;
          break;
        }

        // Mode 3: find and replace text
        if (args.replace) {
          if (!original.includes(args.replace)) {
            result = `错误：未找到匹配文本 "${args.replace.substring(0, 50)}"`; break;
          }
          updated = original.split(args.replace).join(newContent);
          fs.writeFileSync(fp, updated, 'utf-8');
          const count = original.split(args.replace).length - 1;
          result = `替换 ${count} 处：${args.filePath}\n${addLineNumbers(updated)}`;
          break;
        }

        result = `错误：update-file 需要指定 line="N"、from="N" to="M" 或 replace="文本"`;
      } catch (e) { result = `更新失败：${e.message}`; }
      break;
    }
    case 'list-path': {
      try {
        const dp = resolvePath(args.dirPath || '.');
        if (!fs.existsSync(dp)) result = `目录不存在：${args.dirPath || '.'}`;
        else {
          const entries = fs.readdirSync(dp, { withFileTypes: true });
          result = entries.map(e => `${e.isDirectory() ? '[DIR]' : '[FILE]'} ${e.name}`).join('\n');
        }
      } catch (e) { result = `错误：${e.message}`; }
      break;
    }
    case 'run-command': {
      try {
        ensureWorkspace();

        // Check background job status
        if (args.check) {
          const job = bgJobs.get(args.check);
          if (!job) { result = `后台任务 ${args.check} 不存在或已完成`; break; }
          result = `[${args.check}] 运行中 (${Math.round((Date.now() - job.startTime) / 1000)}s)\n--- stdout ---\n${job.stdout.slice(-2000)}\n--- stderr ---\n${job.stderr.slice(-1000) || '(无)'}`;
          break;
        }

        const timeout = parseInt(args.timeout) || 15000;
        const bg = args.bg === 'true';

        if (bg) {
          const jobId = args['job-id'] || `bg_${Date.now()}`;
          const proc = exec(args.command, { cwd: WORKSPACE, maxBuffer: 10 * 1024 * 1024 });
          const job = { proc, stdout: '', stderr: '', startTime: Date.now() };
          bgJobs.set(jobId, job);
          proc.stdout.on('data', d => { job.stdout += d.toString(); });
          proc.stderr.on('data', d => { job.stderr += d.toString(); });
          proc.on('close', code => {
            job.exitCode = code;
            setTimeout(() => bgJobs.delete(jobId), 60000); // keep result for 1min
          });
          result = `后台任务已启动: ${jobId}\n可通过 <run-command check="${jobId}"/> 查看进度和日志`;
        } else {
          // Foreground: try execSync first, fall back to exec with promise
          try {
            const output = execSync(args.command, { cwd: WORKSPACE, timeout, maxBuffer: 2 * 1024 * 1024, encoding: 'utf-8' });
            result = output || '(执行成功，无输出)';
          } catch (syncErr) {
            if (syncErr.killed || syncErr.message.includes('ETIMEDOUT') || syncErr.message.includes('timed out')) {
              // Timeout → auto switch to background
              const jobId = `bg_${Date.now()}`;
              const proc = exec(args.command, { cwd: WORKSPACE, maxBuffer: 10 * 1024 * 1024 });
              const job = { proc, stdout: syncErr.stdout?.toString() || '', stderr: syncErr.stderr?.toString() || '', startTime: Date.now() };
              bgJobs.set(jobId, job);
              proc.stdout.on('data', d => { job.stdout += d.toString(); });
              proc.stderr.on('data', d => { job.stderr += d.toString(); });
              proc.on('close', code => {
                job.exitCode = code;
                setTimeout(() => bgJobs.delete(jobId), 60000);
              });
              result = `命令超时(${timeout}ms)，已自动转为后台运行: ${jobId}\n当前输出:\n${job.stdout.slice(-1000) || '(暂无)'}\n\n用 <run-command check="${jobId}"/> 查看进度`;
            } else {
              result = `命令失败(退出码${syncErr.status}): ${syncErr.stderr || syncErr.stdout || syncErr.message}`;
            }
          }
        }
      } catch (e) { result = `命令失败：${e.message}`; }
      break;
    }
    default:
      result = `未知工具：${name}`;
  }

  return { tool_call_id: toolCall.id, name, result };
}

function buildToolsPrompt() {
  return `- <read-file path="文件路径"/> — 读取文件(带行号)
- <write-file path="文件路径">内容</write-file> — 创建/覆盖文件
- <update-file path="文件路径" line="N">新行内容</update-file> — 修改第N行
- <update-file path="文件路径" from="3" to="7">新内容</update-file> — 替换行范围
- <update-file path="文件路径" replace="原文">替换后</update-file> — 查找替换
- <list-path path="目录路径"/> — 列出目录
- <run-command>命令</run-command> — 执行命令(15s超时自动转后台)
- <run-command bg="true" job-id="名称">命令</run-command> — 后台执行
- <run-command check="jobId"/> — 查看后台任务进度`;
}

module.exports = { toolCallMap, executeToolCall, buildToolsPrompt, parseToolCalls, WORKSPACE };
