/**
 * Batch convert all HowToCook markdown recipes to JSON with image upload to cloud storage
 *
 * Usage:
 *   node script/batch-convert.js            # Full conversion with upload
 *   node script/batch-convert.js --dry-run  # Parse only, no upload
 *
 * Output:
 *   data/recipes-YYYYMMDD-HHmmss.json  — JSON lines format
 *   data/recipes-YYYYMMDD-HHmmss.js    — ES module export
 *   data/index.js                      — Re-exports from latest file
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { uploadWxCloud } = require('./upload');

// ============================================================
// Markdown Parser
// ============================================================

const SECTION_HEADING_MAP = {
  '必备原料和工具': '原料和工具', '原料和工具': '原料和工具',
  '计算': '计算', '操作': '操作', '附加内容': '附加内容',
};

function md5(str) { return crypto.createHash('md5').update(str, 'utf8').digest('hex'); }

function getCategory(filePath) {
  const parts = filePath.split(path.sep);
  const idx = parts.indexOf('dishes');
  return idx !== -1 && idx + 1 < parts.length ? parts[idx + 1] : 'unknown';
}

function parseInline(line) {
  const tokens = [];
  let lastIndex = 0;
  const pattern = /(!\[([^\]]*)\]\(([^)]+)\))|(\[([^\]]*)\]\(([^)]+)\))|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)/g;
  let match;
  while ((match = pattern.exec(line)) !== null) {
    if (match.index > lastIndex) {
      const text = line.slice(lastIndex, match.index);
      if (text) tokens.push(text);
    }
    if (match[1]) tokens.push({ type: 'image', text: match[2], href: match[3] });
    else if (match[4]) tokens.push({ type: 'link', text: match[5], href: match[6] });
    else if (match[7]) tokens.push({ type: 'strong', text: match[8] });
    else if (match[9]) tokens.push({ type: 'em', text: match[10] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < line.length) tokens.push(line.slice(lastIndex));
  if (tokens.length === 0) return line;
  if (tokens.length === 1 && typeof tokens[0] === 'string') return tokens[0];
  return tokens;
}

function isTableRow(line) { return /^\|.*\|$/.test(line.trim()); }
function isTableSeparator(line) { return /^\|[\s:-]+\|/.test(line.trim()) && /-{3,}/.test(line); }

function parseListItems(lines, startIdx) {
  const items = [];
  let i = startIdx;
  while (i < lines.length) {
    const line = lines[i], trimmed = line.trim();
    if (trimmed === '') { i++; continue; }
    const listMatch = trimmed.match(/^[-*]\s+(.*)/) || trimmed.match(/^\d+[.)]\s*(.*)/);
    if (!listMatch) {
      if (line.startsWith('  ') || line.startsWith('\t')) {
        if (items.length > 0 && typeof items[items.length - 1] === 'string')
          items[items.length - 1] += '\n' + trimmed;
        i++; continue;
      }
      break;
    }
    items.push(parseInline(listMatch[1]));
    i++;
  }
  return { items, endIdx: i };
}

function parseTable(lines, startIdx) {
  let i = startIdx; const rows = [];
  while (i < lines.length) {
    const line = lines[i].trim();
    if (isTableRow(line)) {
      if (!isTableSeparator(line))
        rows.push(line.split('|').filter(c => c.trim() !== '').map(c => c.trim()));
      i++;
    } else if (isTableSeparator(line)) { i++; }
    else break;
  }
  return { rows, endIdx: i };
}

function parseSectionContent(lines, startIdx) {
  const content = []; let i = startIdx;
  while (i < lines.length) {
    const line = lines[i], trimmed = line.trim();
    if (trimmed.startsWith('## ') && !trimmed.startsWith('### ')) break;
    if (trimmed === '') { i++; continue; }
    if (trimmed.startsWith('### ')) { content.push({ type: 'heading', text: trimmed.replace(/^###\s+/, '') }); i++; continue; }
    if (isTableRow(trimmed)) {
      const r = parseTable(lines, i);
      if (r.rows.length > 0) {
        const tls = r.rows.map(rr => '| ' + rr.join(' | ') + ' |');
        const h = tls[0], s = '|' + h.split('|').filter(c => c.trim()).map(() => ' - ').join('|') + '|';
        tls.splice(1, 0, s);
        content.push(tls.join('\n'));
      }
      i = r.endIdx; continue;
    }
    if (isTableSeparator(trimmed)) { i++; continue; }
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) { content.push({ type: 'image', text: imgMatch[1], href: imgMatch[2] }); i++; continue; }
    const imgTextMatch = trimmed.match(/^(!\[([^\]]*)\]\(([^)]+)\))\s*,?\s*(.*)/);
    if (imgTextMatch) {
      const items = [{ type: 'image', text: imgTextMatch[2], href: imgTextMatch[3] }];
      if (imgTextMatch[4]) items.push(imgTextMatch[4]);
      content.push(items); i++; continue;
    }
    if (/^[-*]\s+/.test(trimmed) || /^\d+[.)]\s+/.test(trimmed)) {
      const r = parseListItems(lines, i);
      content.push({ type: 'list', items: r.items });
      i = r.endIdx; continue;
    }
    if (trimmed.match(/!\[([^\]]*)\]\(([^)]+)\)/)) { content.push(parseInline(trimmed)); i++; continue; }
    content.push(parseInline(trimmed)); i++;
  }
  return { content, endIdx: i };
}

function extractDescription(lines, startIdx) {
  const desc = []; let i = startIdx;
  while (i < lines.length) {
    const line = lines[i], trimmed = line.trim();
    if (trimmed.startsWith('## ') && !trimmed.startsWith('### ')) break;
    if (trimmed === '' || trimmed.startsWith('预估烹饪难度：') || trimmed.startsWith('预估卡路里：')) { i++; continue; }
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) { desc.push({ type: 'image', text: imgMatch[1], href: imgMatch[2] }); i++; continue; }
    if (trimmed.match(/!\[([^\]]*)\]\(([^)]+)\)/)) {
      const p = parseInline(trimmed);
      Array.isArray(p) ? desc.push(...p) : desc.push(p);
      i++; continue;
    }
    desc.push(trimmed); i++;
  }
  return { desc, endIdx: i };
}

function parseMarkdown(content, filePath) {
  const lines = content.split('\n');
  let title = '', name = '', i = 0;
  for (; i < lines.length; i++) {
    if (lines[i].trim().startsWith('# ') && !lines[i].trim().startsWith('## ')) {
      title = lines[i].trim().replace(/^#\s+/, '');
      name = title.replace(/的做法$/, '');
      i++; break;
    }
  }
  const { desc, endIdx: descEnd } = extractDescription(lines, i);
  i = descEnd;
  const detail = [];
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('## ') && !trimmed.startsWith('### ')) {
      const sectionTitle = trimmed.replace(/^##\s+/, '');
      i++;
      const { content, endIdx } = parseSectionContent(lines, i);
      i = endIdx;
      detail.push({ text: SECTION_HEADING_MAP[sectionTitle] || sectionTitle, content });
    } else i++;
  }
  return { no: 0, id: md5(name), name, category: getCategory(filePath), detail, desc, title };
}

// ============================================================
// Image helpers
// ============================================================

function isLocalImage(href) {
  if (!href) return false;
  if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('cloud://')) return false;
  return !href.endsWith('.md');
}

// Deep-collect all { type: 'image', href } objects from a recipe tree
function collectImageObjects(obj, collector = []) {
  if (!obj || typeof obj !== 'object') return collector;
  if (obj.type === 'image' && obj.href) collector.push(obj);
  if (Array.isArray(obj)) obj.forEach(item => collectImageObjects(item, collector));
  else if (typeof obj === 'object')
    Object.values(obj).forEach(v => collectImageObjects(v, collector));
  return collector;
}

// ============================================================
// Progress helpers
// ============================================================

function progressBar(current, total, width = 30) {
  const filled = Math.round((current / total) * width);
  const pct = Math.round((current / total) * 100);
  return `[${'█'.repeat(filled)}${'░'.repeat(width - filled)}] ${pct}% (${current}/${total})`;
}

function formatDuration(ms) {
  const s = Math.floor(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function ts() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

// ============================================================
// File scanner
// ============================================================

function scanMarkdownFiles(dir) {
  const results = [];
  function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory() && entry.name !== 'template') walk(p);
      else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md')
        results.push(p);
    }
  }
  walk(dir);
  return results;
}

// ============================================================
// Main
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  const dishesDir = path.resolve(__dirname, '..', 'HowToCook', 'dishes');
  const dataDir = path.resolve(__dirname, '..', 'data');

  console.log('🍳 HowToCook 批量转换工具');
  if (dryRun) console.log('🏃 DRY-RUN: 仅解析不上传');
  console.log('');

  // ── Phase 1: Scan & Parse ──────────────────────────────────
  console.log(`[${ts()}] 📂 扫描菜谱文件...`);
  const files = scanMarkdownFiles(dishesDir);
  console.log(`[${ts()}]    找到 ${files.length} 个文件`);

  console.log(`[${ts()}] 📝 解析菜谱...`);
  const recipes = [];

  // Collect all unique image absolute paths
  // Map<absPath, [{ recipeIdx, imageHref }]>
  const imageRefs = new Map();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const recipe = parseMarkdown(content, file);
      recipe.no = i;
      recipes.push(recipe);

      // Collect local image references
      const imgObjs = collectImageObjects(recipe);
      const mdDir = path.dirname(file);
      for (const img of imgObjs) {
        if (isLocalImage(img.href)) {
          const absPath = path.resolve(mdDir, img.href);
          if (!imageRefs.has(absPath)) imageRefs.set(absPath, []);
          imageRefs.get(absPath).push({ recipeIdx: recipes.length - 1, href: img.href });
        }
      }

      if ((i + 1) % 50 === 0 || i === files.length - 1) {
        process.stdout.write(`\r[${ts()}]    ${progressBar(i + 1, files.length)}`);
      }
    } catch (err) {
      console.error(`\n[${ts()}]    ❌ ${path.relative(dishesDir, file)}: ${err.message}`);
    }
  }
  console.log(`\n[${ts()}]    ✅ ${recipes.length} 个菜谱, ${imageRefs.size} 个唯一本地图片`);

  // ── Phase 2: Upload images ─────────────────────────────────
  // Map<absPath, cloudFileId>
  const uploadCache = new Map();
  let uploadOk = 0, uploadFail = 0;
  const errors = [];

  if (!dryRun && imageRefs.size > 0) {
    console.log(`\n[${ts()}] ☁️  上传图片到云存储...`);
    let idx = 0;

    for (const [absPath] of imageRefs) {
      if (!fs.existsSync(absPath)) {
        uploadFail++;
        errors.push(`不存在: ${absPath}`);
        idx++; continue;
      }

      try {
        const size = fs.statSync(absPath).size;
        const cloudFileId = await uploadWxCloud(absPath);
        uploadCache.set(absPath, cloudFileId);
        uploadOk++;

        if (idx % 10 === 0 || idx === imageRefs.size - 1) {
          process.stdout.write(`\r[${ts()}]    ${progressBar(idx + 1, imageRefs.size)} | ✅${uploadOk} ❌${uploadFail}`);
        }

        // Small delay to avoid rate limiting
        if ((idx + 1) % 10 === 0) await new Promise(r => setTimeout(r, 300));
      } catch (err) {
        uploadFail++;
        errors.push(`${path.basename(absPath)}: ${err.message}`);
      }
      idx++;
    }
    console.log(`\n[${ts()}]    上传完成: ✅${uploadOk} ❌${uploadFail}`);
    if (errors.length > 0 && errors.length <= 10) {
      errors.forEach(e => console.log(`          ⚠️  ${e}`));
    } else if (errors.length > 10) {
      console.log(`          ⚠️  前10个错误:`);
      errors.slice(0, 10).forEach(e => console.log(`             ${e}`));
    }
  } else if (dryRun) {
    // In dry-run, generate fake cloud IDs
    for (const absPath of imageRefs.keys()) {
      const ext = path.extname(absPath);
      uploadCache.set(absPath, `cloud://<env>/cookbook/${md5(absPath)}${ext}`);
    }
  }

  // ── Phase 3: Replace image hrefs ───────────────────────────
  console.log(`\n[${ts()}] 🔗 替换图片链接...`);

  // Build a map from (recipe index + href) → cloudFileId
  // We already collected imageRefs in Phase 1: Map<absPath, [{ recipeIdx, href }]>
  // Build reverse lookup: recipeIdx:href → cloudFileId
  const replaceMap = new Map(); // key: `${recipeIdx}::${href}` → cloudFileId
  for (const [absPath, refs] of imageRefs) {
    const cloudId = uploadCache.get(absPath);
    if (cloudId) {
      for (const { recipeIdx, href } of refs) {
        replaceMap.set(`${recipeIdx}::${href}`, cloudId);
      }
    }
  }

  // Verify we have complete coverage
  const missingRefs = [];
  for (const [absPath, refs] of imageRefs) {
    if (!uploadCache.has(absPath)) {
      for (const { recipeIdx, href } of refs) {
        missingRefs.push(`${recipes[recipeIdx]?.name || '?'}/${href}`);
      }
    }
  }

  for (let idx = 0; idx < recipes.length; idx++) {
    const recipe = recipes[idx];
    const imgObjs = collectImageObjects(recipe);
    for (const img of imgObjs) {
      if (!isLocalImage(img.href)) continue;
      const key = `${idx}::${img.href}`;
      const cloudId = replaceMap.get(key);
      if (cloudId) {
        img.href = cloudId;
      }
    }
  }

  const totalLocalImgs = collectImageObjects(
    { recipes }
  ).filter(img => isLocalImage(img.href)).length;
  console.log(`[${ts()}]    剩余未替换的本地图片: ${totalLocalImgs}`);

  // ── Phase 4: Save output ───────────────────────────────────
  console.log(`\n[${ts()}] 💾 保存文件...`);
  fs.mkdirSync(dataDir, { recursive: true });

  const now = new Date();
  const tsStr = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    '-',
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('');
  const baseName = `recipes-${tsStr}`;

  // JSON lines format (one recipe per line, for streaming)
  const jsonPath = path.join(dataDir, `${baseName}.json`);
  const jsonLines = recipes.map(r => JSON.stringify(r)).join('\n');
  fs.writeFileSync(jsonPath, jsonLines, 'utf-8');
  console.log(`[${ts()}]    ✅ ${baseName}.json (${(jsonLines.length / 1024 / 1024).toFixed(2)} MB)`);

  // JS module format (for ES import)
  const jsPath = path.join(dataDir, `${baseName}.js`);
  const jsContent = 'export default ' + JSON.stringify(recipes, null, 2);
  fs.writeFileSync(jsPath, jsContent, 'utf-8');
  console.log(`[${ts()}]    ✅ ${baseName}.js (${(jsContent.length / 1024 / 1024).toFixed(2)} MB)`);

  // data/index.js → re-exports latest
  const indexPath = path.join(dataDir, 'index.js');
  fs.writeFileSync(indexPath, [
    '// Auto-generated — latest recipe data',
    `// Generated: ${now.toISOString()}`,
    `export { default } from './${baseName}.js';`,
    '',
  ].join('\n'), 'utf-8');
  console.log(`[${ts()}]    ✅ index.js`);

  // ── Phase 5: Summary ───────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('📊 完成!');
  console.log(`   菜谱: ${recipes.length} | 分类: ${new Set(recipes.map(r => r.category)).size}`);
  console.log(`   图片: 唯一${imageRefs.size} | 上传✅${uploadOk} ❌${uploadFail}`);
  if (!dryRun) console.log(`   耗时: ${formatDuration(Date.now() - startTime)}`);
  console.log('═'.repeat(60));
}

const startTime = Date.now();

main().catch(err => {
  console.error(`\n[${ts()}] ❌ 致命错误:`, err.message);
  console.error(err.stack);
  process.exit(1);
});
