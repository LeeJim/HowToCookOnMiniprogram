// Top common ingredients per category, filtered from classified-ingredients.json
// Only includes clean single-ingredient names (no quantities, no multi-ingredient strings)

const CATEGORIES = [
  {
    name: '荤',
    ingredients: ['鸡蛋', '五花肉', '牛肉', '牛奶', '黄油', '培根', '排骨', '鸡腿'],
  },
  {
    name: '素',
    ingredients: ['葱', '蒜', '淀粉', '洋葱', '青椒', '土豆', '香菜', '西红柿'],
  },
];

module.exports = { CATEGORIES };
