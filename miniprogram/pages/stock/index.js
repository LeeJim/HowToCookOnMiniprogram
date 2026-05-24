import { toScan } from '../../utils/scan';

Page({
  handleScan() {
    toScan();
  },

  handleToList() {
    wx.navigateTo({
      url: '/pages/stock-list/index',
    })
  },

  onShareAppMessage() {
    return {
      title: '程序员做饭指南 - 仓储管理',
      path: '/pages/stock/index'
    }
  },
})