/**
 * 用分类好的原料数据，给每道菜的「原料和工具」打上分类标签，
 * 输出增强后的菜谱数据，供详情页分类展示。
 */
const fs = require('fs');
const path = require('path');

// ── 读取分类数据 ──
const classifiedPath = path.join(__dirname, '..', 'classified-ingredients.json');
const classified = JSON.parse(fs.readFileSync(classifiedPath, 'utf8'));

// 建立原料→分类的快速查找表
const lookup = {};
Object.entries(classified).forEach(([cat, items]) => {
  items.forEach(item => {
    lookup[item.name] = cat;
  });
});

// ── 读取原始菜谱（从 data/ 目录取最新文件） ──
const dataDir = path.join(__dirname, '..', 'data');
const indexContent = fs.readFileSync(path.join(dataDir, 'index.js'), 'utf8');
const match = indexContent.match(/from '\.\/(recipes-[^']+)\.js'/);
const latestFile = match ? match[1] + '.json' : null;

if (!latestFile) {
  console.error('找不到最新的数据文件，请先运行 batch-convert.js');
  process.exit(1);
}

const dataPath = path.join(dataDir, latestFile);
console.log(`读取数据: ${latestFile}`);
const lines = fs.readFileSync(dataPath, 'utf8').trim().split('\n');
const recipes = lines.map(line => JSON.parse(line));

// ── 给每道菜的「原料和工具」打标签 ──
let taggedCount = 0;
let untaggedCount = 0;

recipes.forEach(recipe => {
  const sec = recipe.detail && recipe.detail.find(d => d.text === '原料和工具');
  if (!sec) return;

  sec.content.forEach(block => {
    if (block.type === 'list' && block.items) {
      const categorized = {}; // { 荤: [...], 素: [...], ... }
      const uncategorized = [];

      block.items.forEach(item => {
        if (typeof item === 'string') {
          const clean = item.replace(/[（(][^)）]*[)）]/g, '').trim();
          const cat = lookup[clean] || '其他';
          if (!categorized[cat]) categorized[cat] = [];
          categorized[cat].push(item);
          if (lookup[clean]) taggedCount++;
          else untaggedCount++;
        } else {
          if (!categorized['其他']) categorized['其他'] = [];
          categorized['其他'].push(item);
        }
      });

      // 转为数组格式（WXML不支持动态key访问）
      const catOrder = ['荤', '素', '调料', '配菜', '工具', '其他'];
      block.categorized = catOrder
        .filter(cat => categorized[cat] && categorized[cat].length > 0)
        .map(cat => ({ name: cat, items: categorized[cat] }));
    }
  });
});

console.log(`菜谱总数: ${recipes.length}`);
console.log(`已分类原料: ${taggedCount}, 未分类: ${untaggedCount}`);

// ── 输出增强数据 ──
// 输出 JS 模块给小程序用
const jsLines = ['export default ' + JSON.stringify(recipes, null, 2)];
const jsPath = path.join(__dirname, '..', 'miniprogram', 'recipes-enriched.js');
fs.writeFileSync(jsPath, jsLines.join('\n'), 'utf8');
console.log(`已写入: ${jsPath}`);
