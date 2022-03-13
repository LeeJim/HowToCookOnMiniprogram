import log from './log'

Page({
  data: {
    item: {},
    detail: [],
  },

  onLoad: function (options) {
    if (options.index) {
      const item = log[options.index]
      this.setData({
        item,
        index: options.index,
        detail: item.detail
      })
      wx.setNavigationBarTitle({
        title: `v${item.version} 更新`
      })
    }
  },

  onShareAppMessage: function () {
    const { index, item } = this.data
    return {
      title: `程序员做饭指南 - v${item.version} 更新`,
      path: `/pages/changelog/detail?index=${index}`
    }
  }
})