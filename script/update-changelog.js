const fs = require('fs');
const path = require('path');

// ── 读取版本号 ──
const pkgPath = path.join(__dirname, '..', 'miniprogram', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = pkg.version;

// ── 解析 push 携带的 commit 信息 ──
let commits = [];
try {
  commits = JSON.parse(process.env.PUSH_COMMITS || '[]');
} catch {
  console.warn('Failed to parse PUSH_COMMITS, using default entry.');
}

// ── commit → changelog detail ──
const details = commits
  .filter(c => c.message && !/^Merge/i.test(c.message))
  .map(c => {
    let msg = c.message.trim();
    let type = 'feature';

    // 解析 Conventional Commits 格式
    if (/^fix[:(]/.test(msg)) {
      type = 'bug';
      msg = msg.replace(/^fix[:(]\s*/, '').replace(/\)\s*$/, '').replace(/\):/, ':');
    } else if (/^feat[:(]/.test(msg)) {
      type = 'feature';
      msg = msg.replace(/^feat[:(]\s*/, '').replace(/\)\s*$/, '').replace(/\):/, ':');
    } else if (/^chore[:(]/.test(msg) || /^build[:(]/.test(msg) || /^ci[:(]/.test(msg)) {
      // skip chore/build/ci commits — not user-facing
      return null;
    }

    return { type, value: msg.slice(0, 200) };
  })
  .filter(Boolean);

// 没有任何有效 commit 时给一个占位
if (details.length === 0) {
  details.push({ type: 'feature', value: '版本更新' });
}

// 去重：相同 value 只保留一条
const seen = new Set();
const unique = details.filter(d => {
  if (seen.has(d.value)) return false;
  seen.add(d.value);
  return true;
});

// ── 生成日期 ──
const today = new Date().toISOString().slice(0, 10);

// ── 更新 log.js ──
const logPath = path.join(
  __dirname, '..', 'miniprogram', 'pages', 'changelog', 'log.js'
);
let content = fs.readFileSync(logPath, 'utf8');

// 避免重复插入
if (content.includes(`version: '${version}'`)) {
  console.log(`⚠️  v${version} already in log.js, skipped.`);
  process.exit(0);
}

const entry = `{
  version: '${version}',
  detail: ${JSON.stringify(unique, null, 4)},
  date: '${today}'
},
`;

content = content.replace('export default [', `export default [\n  ${entry}`);
fs.writeFileSync(logPath, content, 'utf8');

console.log(`✅  Added changelog entry for v${version}`);
console.log(JSON.stringify(unique, null, 2));
