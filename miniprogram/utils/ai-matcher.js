import recipes from '../recipes-enriched';

function stripParens(str) {
  return str.replace(/[（(][^）)]*[）)]/g, '').trim();
}

function extractIngredients(recipe) {
  const section = recipe.detail.find(d => d.text === '原料和工具');
  if (!section) return [];

  const items = [];
  section.content.forEach(block => {
    if (block.type === 'list' && block.items) {
      block.items.forEach(item => {
        if (typeof item === 'string') {
          const name = stripParens(item);
          if (name) items.push(name);
        }
      });
    }
  });
  return items;
}

let _index = null;

function getIndex() {
  if (_index) return _index;

  const map = {};
  recipes.forEach((recipe, idx) => {
    const ings = extractIngredients(recipe);
    ings.forEach(ing => {
      if (!map[ing]) map[ing] = new Set();
      map[ing].add(idx);
    });
  });
  _index = { map, keys: Object.keys(map) };
  return _index;
}

function tokenize(text) {
  return text.split(/[、，,，和与\\s]+/).filter(Boolean);
}

export function parseIngredients(text) {
  const { keys } = getIndex();
  const tokens = tokenize(text);
  const found = [];

  keys.forEach(ing => {
    if (text.includes(ing)) {
      found.push(ing);
      return;
    }
    for (const token of tokens) {
      if (token.length >= 1 && ing.includes(token)) {
        found.push(ing);
        break;
      }
    }
  });

  return [...new Set(found)];
}

export function matchRecipes(ingredients) {
  const { map } = getIndex();
  const scores = {};

  ingredients.forEach(ing => {
    const indices = map[ing];
    if (indices) {
      indices.forEach(idx => {
        scores[idx] = (scores[idx] || 0) + 1;
      });
    }
  });

  return Object.entries(scores)
    .map(([idx, score]) => {
      const recipe = recipes[idx];
      const total = extractIngredients(recipe).length;
      return {
        ...recipe,
        matchRate: Math.min(Math.round((score / total) * 100), 100),
        matched: score,
        total,
      };
    })
    .sort((a, b) => b.matchRate - a.matchRate || b.matched - a.matched);
}
