import config from '../../config/index.js'
import recipes from '../../recipes-enriched'

Page({
  data: {
    list: [],
    chineseMap: config.chineseMap,
    loading: false,
  },

  onShow() {
    this.getList()
  },

  async getList() {
    this.setData({ loading: true })
    const { result } = await wx.cloud.callFunction({
      name: 'getCookbook',
      data: { kind: 'starred' },
    })

    if (result.errno === 0) {
      const list = result.data.map(item => {
        const recipe = recipes.find(r => r.id === item.id)
        return recipe ? { ...item, name: recipe.name, category: recipe.category } : item
      })
      this.setData({ loading: false, list })
    } else {
      this.setData({ loading: false })
    }
  },

  handleBack() {
    wx.navigateBack({ delta: 1 });
  },

  handleTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: '/pages/detail/index?id=' + id });
  },
})