import config from '../../config/index.js'

Page({

  data: {
    list : [],
    chineseMap: {},
    loading: false,
    themeMap: {
      dessert: 'danger',
      breakfast: 'success',
      staple: 'warning'
    }
  },

  onShow() {
    this.getList()
  },

  async getList() {
    this.setData({
      loading: true
    })
    const { result } = await wx.cloud.callFunction({
      name: 'getCookbook',
      data: {
        kind: 'starred',
      }
    })

    if (result.errno == 0) {
      this.setData({
        loading: false,
        list: result.data,
        chineseMap: config.chineseMap
      })
    }
  }
})