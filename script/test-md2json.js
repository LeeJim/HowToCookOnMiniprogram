/**
 * Test script: Convert one MD recipe file to JSON with image upload to cloud storage
 *
 * Usage:
 *   node script/test-md2json.js <path-to-md-file>
 *   node script/test-md2json.js HowToCook/dishes/vegetable_dish/拔丝土豆/拔丝土豆.md
 *
 * This script:
 *   1. Parses the markdown recipe file into JSON
 *   2. Finds local images (relative paths like ./1.jpeg)
 *   3. Uploads them to WeChat Cloud Storage (云开发存储)
 *   4. Replaces image hrefs with cloud file IDs
 *   5. Outputs the final JSON
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { uploadWxCloud } = require('./upload');

// ============================================================
// Markdown Parser (adapted from HowToCook/scripts/md2json.js)
// ============================================================

const SECTION_HEADING_MAP = {
  '必备原料和工具': '原料和工具',
  '原料和工具': '原料和工具',
  '计算': '计算',
  '操作': '操作',
  '附加内容': '附加内容',
};

function normalizeSectionHeading(text) {
  return SECTION_HEADING_MAP[text] || text;
}

function getCategory(filePath) {
  const parts = filePath.split(path.sep);
  const dishesIdx = parts.indexOf('dishes');
  if (dishesIdx !== -1 && dishesIdx + 1 < parts.length) {
    return parts[dishesIdx + 1];
  }
  return 'unknown';
}

function md5(str) {
  return crypto.createHash('md5').update(str, 'utf8').digest('hex');
}

// Parse inline formatting: **bold**, *italic*, [link](url), ![image](url)
function parseInline(line) {
  const tokens = [];
  let remaining = line;
  let lastIndex = 0;

  const pattern = /(!\[([^\]]*)\]\(([^)]+)\))|(\[([^\]]*)\]\(([^)]+)\))|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)/g;
  let match;

  while ((match = pattern.exec(line)) !== null) {
    if (match.index > lastIndex) {
      const text = line.slice(lastIndex, match.index);
      if (text) tokens.push(text);
    }

    if (match[1]) {
      // Image: ![alt](url)
      tokens.push({ type: 'image', text: match[2], href: match[3] });
    } else if (match[4]) {
      // Link: [text](url)
      tokens.push({ type: 'link', text: match[5], href: match[6] });
    } else if (match[7]) {
      // Strong: **text**
      tokens.push({ type: 'strong', text: match[8] });
    } else if (match[9]) {
      // Em: *text*
      tokens.push({ type: 'em', text: match[10] });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < line.length) {
    tokens.push(line.slice(lastIndex));
  }

  if (tokens.length === 0) return line;
  if (tokens.length === 1 && typeof tokens[0] === 'string') return tokens[0];
  return tokens;
}

function isTableRow(line) {
  return /^\|.*\|$/.test(line.trim());
}

function isTableSeparator(line) {
  return /^\|[\s:-]+\|/.test(line.trim()) && /-{3,}/.test(line);
}

function parseListItems(lines, startIdx) {
  const items = [];
  let i = startIdx;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '') {
      i++;
      continue;
    }

    const listMatch = trimmed.match(/^[-*]\s+(.*)/) || trimmed.match(/^\d+[.)]\s*(.*)/);
    if (!listMatch) {
      if (line.startsWith('  ') || line.startsWith('\t')) {
        if (items.length > 0) {
          const lastItem = items[items.length - 1];
          if (typeof lastItem === 'string') {
            items[items.length - 1] = items[items.length - 1] + '\n' + trimmed;
          }
        }
        i++;
        continue;
      }
      break;
    }

    const itemContent = listMatch[1];
    const parsed = parseInline(itemContent);
    items.push(parsed);
    i++;
  }

  return { items, endIdx: i };
}

function parseTable(lines, startIdx) {
  let i = startIdx;
  const rows = [];

  while (i < lines.length) {
    const line = lines[i].trim();
    if (isTableRow(line)) {
      if (isTableSeparator(line)) {
        i++;
        continue;
      }
      const cells = line.split('|').filter(c => c.trim() !== '').map(c => c.trim());
      rows.push(cells);
      i++;
    } else if (isTableSeparator(line)) {
      i++;
      continue;
    } else {
      break;
    }
  }

  return { rows, endIdx: i };
}

function parseSectionContent(lines, startIdx) {
  const content = [];
  let i = startIdx;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('## ') && !trimmed.startsWith('### ')) {
      break;
    }

    if (trimmed === '') {
      i++;
      continue;
    }

    // ### sub-headings
    if (trimmed.startsWith('### ')) {
      content.push({ type: 'heading', text: trimmed.replace(/^###\s+/, '') });
      i++;
      continue;
    }

    // Tables
    if (isTableRow(trimmed) && (i + 1 < lines.length && (isTableSeparator(lines[i + 1].trim()) || isTableRow(lines[i + 1].trim())))) {
      const { rows, endIdx } = parseTable(lines, i);
      const tableLines = rows.map(r => '| ' + r.join(' | ') + ' |');
      if (tableLines.length > 0) {
        const header = tableLines[0];
        const separator = '|' + header.split('|').filter(c => c.trim() !== '').map(() => ' - ').join('|') + '|';
        tableLines.splice(1, 0, separator);
      }
      content.push(tableLines.join('\n'));
      i = endIdx;
      continue;
    }

    if (isTableSeparator(trimmed)) {
      i++;
      continue;
    }

    // Standalone image
    const imageMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
      content.push({ type: 'image', text: imageMatch[1], href: imageMatch[2] });
      i++;
      continue;
    }

    // Image followed by text
    const imageTextMatch = trimmed.match(/^(!\[([^\]]*)\]\(([^)]+)\))\s*,?\s*(.*)/);
    if (imageTextMatch) {
      const items = [];
      items.push({ type: 'image', text: imageTextMatch[2], href: imageTextMatch[3] });
      if (imageTextMatch[4]) {
        items.push(imageTextMatch[4]);
      }
      content.push(items);
      i++;
      continue;
    }

    // List items
    const isListItem = /^[-*]\s+/.test(trimmed) || /^\d+[.)]\s+/.test(trimmed);
    if (isListItem) {
      const { items, endIdx } = parseListItems(lines, i);
      content.push({ type: 'list', items });
      i = endIdx;
      continue;
    }

    // Inline images in text
    const inlineImageMatch = trimmed.match(/!\[([^\]]*)\]\(([^)]+)\)/);
    if (inlineImageMatch) {
      const parsed = parseInline(trimmed);
      content.push(parsed);
      i++;
      continue;
    }

    // Regular text
    const parsed = parseInline(trimmed);
    content.push(parsed);
    i++;
  }

  return { content, endIdx: i };
}

function extractDescription(lines, startIdx) {
  const desc = [];
  let i = startIdx;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('## ') && !trimmed.startsWith('### ')) {
      break;
    }

    if (trimmed === '') {
      i++;
      continue;
    }

    if (trimmed.startsWith('预估烹饪难度：') || trimmed.startsWith('预估卡路里：')) {
      i++;
      continue;
    }

    const imageMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
      desc.push({ type: 'image', text: imageMatch[1], href: imageMatch[2] });
      i++;
      continue;
    }

    const inlineMatch = trimmed.match(/!\[([^\]]*)\]\(([^)]+)\)/);
    if (inlineMatch) {
      const parsed = parseInline(trimmed);
      if (Array.isArray(parsed)) {
        desc.push(...parsed);
      } else {
        desc.push(parsed);
      }
      i++;
      continue;
    }

    desc.push(trimmed);
    i++;
  }

  return { desc, endIdx: i };
}

function parseMarkdown(content, filePath) {
  const lines = content.split('\n');

  let title = '';
  let name = '';
  let i = 0;

  for (; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
      title = trimmed.replace(/^#\s+/, '');
      name = title.replace(/的做法$/, '');
      i++;
      break;
    }
  }

  const { desc, endIdx: descEnd } = extractDescription(lines, i);
  i = descEnd;

  const category = getCategory(filePath);

  const detail = [];
  while (i < lines.length) {
    const trimmed = lines[i].trim();

    if (trimmed.startsWith('## ') && !trimmed.startsWith('### ')) {
      const sectionTitle = trimmed.replace(/^##\s+/, '');
      i++;

      const { content, endIdx } = parseSectionContent(lines, i);
      i = endIdx;

      detail.push({
        text: normalizeSectionHeading(sectionTitle),
        content
      });
    } else {
      i++;
    }
  }

  const id = md5(name);

  return {
    no: 0,
    id,
    name,
    category,
    detail,
    desc,
    title
  };
}

// ============================================================
// Image handling
// ============================================================

/**
 * Check if an image href is a local/relative path
 */
function isLocalImage(href) {
  if (!href) return false;
  // Skip external URLs
  if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('cloud://')) {
    return false;
  }
  // Skip if it's a link to another markdown file
  if (href.endsWith('.md')) return false;
  return true;
}

/**
 * Collect all local image hrefs from the parsed recipe object
 */
function collectLocalImages(obj, images = new Set()) {
  if (!obj || typeof obj !== 'object') return images;

  if (obj.type === 'image' && obj.href && isLocalImage(obj.href)) {
    images.add(obj.href);
  }

  // Recurse into arrays and objects
  if (Array.isArray(obj)) {
    for (const item of obj) {
      collectLocalImages(item, images);
    }
  } else if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      collectLocalImages(obj[key], images);
    }
  }

  return images;
}

/**
 * Replace image hrefs in the parsed recipe object
 * @param {Object} obj - The recipe object
 * @param {Map} imageMap - Map of old href → new href (cloud file ID)
 */
function replaceImageHrefs(obj, imageMap) {
  if (!obj || typeof obj !== 'object') return obj;

  if (obj.type === 'image' && obj.href && imageMap.has(obj.href)) {
    return { ...obj, href: imageMap.get(obj.href) };
  }

  if (Array.isArray(obj)) {
    return obj.map(item => replaceImageHrefs(item, imageMap));
  }

  if (typeof obj === 'object') {
    const result = {};
    for (const key of Object.keys(obj)) {
      result[key] = replaceImageHrefs(obj[key], imageMap);
    }
    return result;
  }

  return obj;
}

// ============================================================
// Main
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const mdArg = args.find(a => !a.startsWith('--'));

  if (!mdArg) {
    console.log('Usage: node script/test-md2json.js <path-to-md-file> [--dry-run]');
    console.log('  --dry-run    Parse only, skip image upload');
    console.log('Example: node script/test-md2json.js HowToCook/dishes/vegetable_dish/拔丝土豆/拔丝土豆.md');
    process.exit(1);
  }

  const mdPath = path.resolve(mdArg);

  if (!fs.existsSync(mdPath)) {
    console.error(`❌ File not found: ${mdPath}`);
    process.exit(1);
  }

  console.log(`📄 Reading: ${mdPath}`);
  if (dryRun) {
    console.log(`🏃 Dry-run mode: parsing only, no upload`);
  }

  // Step 1: Parse markdown
  const content = fs.readFileSync(mdPath, 'utf-8');
  const recipe = parseMarkdown(content, mdPath);
  console.log(`✅ Parsed recipe: ${recipe.title}`);
  console.log(`   Category: ${recipe.category}`);
  console.log(`   Sections: ${recipe.detail.map(d => d.text).join(', ')}`);

  // Step 2: Collect local images
  const localImages = collectLocalImages(recipe);
  console.log(`\n📸 Found ${localImages.size} local image(s):`);
  for (const img of localImages) {
    const localPath = path.resolve(path.dirname(mdPath), img);
    const exists = fs.existsSync(localPath);
    console.log(`   ${exists ? '✅' : '❌'} ${img} ${exists ? '(' + (fs.statSync(localPath).size / 1024).toFixed(1) + ' KB)' : '(file not found)'}`);
  }

  // Step 3: Upload local images to cloud storage (skip in dry-run mode)
  const imageMap = new Map(); // old href → cloud file ID
  const mdDir = path.dirname(mdPath);

  if (!dryRun && localImages.size > 0) {
    console.log(`\n☁️  Uploading to cloud storage...`);

    for (const imgHref of localImages) {
      const localPath = path.resolve(mdDir, imgHref);

      if (!fs.existsSync(localPath)) {
        console.warn(`⚠️  Image not found, skipping: ${localPath}`);
        continue;
      }

      try {
        console.log(`   Uploading: ${imgHref} (${(fs.statSync(localPath).size / 1024).toFixed(1)} KB)`);
        const cloudFileId = await uploadWxCloud(localPath);
        console.log(`   ✅ → ${cloudFileId}`);
        imageMap.set(imgHref, cloudFileId);
      } catch (err) {
        console.error(`   ❌ Failed to upload ${imgHref}: ${err.message}`);
      }
    }

    console.log(`\n📊 Uploaded ${imageMap.size}/${localImages.size} images`);
  } else if (dryRun && localImages.size > 0) {
    console.log(`\n⏭️  Skipping upload (dry-run mode)`);
    // In dry-run, show what would be uploaded with fake IDs
    for (const imgHref of localImages) {
      imageMap.set(imgHref, `cloud://<env-id>/cookbook/<hash>${path.extname(imgHref)}`);
    }
  }

  // Step 4: Replace image hrefs
  const finalRecipe = replaceImageHrefs(recipe, imageMap);

  // Step 5: Output JSON
  console.log(`\n📋 Final JSON output:`);
  console.log('='.repeat(60));
  console.log(JSON.stringify(finalRecipe, null, 2));

  // Also save to file
  const outputPath = path.join(__dirname, '..', 'test-output.json');
  fs.writeFileSync(outputPath, JSON.stringify(finalRecipe, null, 2), 'utf-8');
  console.log(`\n💾 Saved to: ${outputPath}`);

  return finalRecipe;
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
