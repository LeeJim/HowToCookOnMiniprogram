import { parseIngredients, matchRecipes } from '../../utils/ai-matcher';
import { CATEGORIES } from '../../utils/common-ingredients';

Page({
  data: {
    inputText: '',
    ingredients: [],
    results: [],
    hasSearched: false,
    categories: CATEGORIES,
  },

  handleInput(e) {
    this.setData({ inputText: e.detail.value });
  },

  handleTapIngredient(e) {
    const { name } = e.currentTarget.dataset;
    const current = this.data.inputText.trim();
    const newText = current ? current + '、' + name : name;
    this.setData({ inputText: newText });
  },

  handleSearch() {
    const text = this.data.inputText.trim();
    if (!text) {
      wx.showToast({ title: '请说说你有哪些食材', icon: 'none' });
      return;
    }

    const ingredients = parseIngredients(text);
    const results = matchRecipes(ingredients).slice(0, 20);

    this.setData({
      ingredients,
      results,
      hasSearched: true,
    });

    if (ingredients.length === 0) {
      wx.showToast({ title: '未识别到食材，请换个说法试试', icon: 'none' });
    }
  },

  handleTapRecipe(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: '/pages/detail/index?id=' + id });
  },

  handleBack() {
    wx.navigateBack({ delta: 1 });
  },

  onShareAppMessage() {
    return {
      title: '程序员做饭指南 - 智能推荐',
      path: '/pages/ai-cook/index'
    }
  },
})