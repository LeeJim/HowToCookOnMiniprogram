import Toast from 'tdesign-miniprogram/toast/index';

Page({
  data: {
    value: 'my',
    tabbars: [{
      text: '首页',
      value: 'home',
      icon: 'home'
    }, {
      text: '个人中心',
      value: 'my',
      icon: 'user'
    }],
    version: '',
    adFlag: true,
  },

  onLoad() {
    const { miniProgram } = wx.getAccountInfoSync();

    this.setData({
      version: miniProgram.version || '0.1.0'
    })
  },

  onShow() {
    const adFlagStorage = wx.getStorageSync('ad-flag')

    this.setData({
      adFlag: adFlagStorage === '' ? true : adFlagStorage,
    })
  },

  handleTabbarChange({ detail }) {
    const { value } = detail;

    if (value == 'home') {
      wx.redirectTo({
        url: '../index/index'
      })
    }
  },

  handleCopy({ target }) {
    const { msg } = target.dataset;

    wx.setClipboardData({
      data: msg
    })
  },

  handleToMP() {
    wx.navigateToMiniProgram({
      appId: 'wx6f3e38f61d138c04'
    })
  },

  handleSubscribe() {
    const tmplIds = ['vjEDlUYrVJ05CauSw_V9jIWF-okt3OMCBtlz9yvjrfg', 'Sbtj4X4gIKWRy0xDeWU8xCl8LejbTpIQ3gWiKh5JFp4'];
    wx.requestSubscribeMessage({
      tmplIds,
      success: async (res) => {
        const accept = tmplIds.some(key => res[key] === 'accept')
        Toast({
          context: this,
          selector: '#t-toast',
          message: accept ? '订阅成功' : '你拒绝了订阅',
        });
      }
    })
  },

  handleToggleAd({ detail }) {
    const adFlag = detail.value

    wx.setStorageSync('ad-flag',adFlag)
    this.setData({
      adFlag
    })
  },
  
  onShareAppMessage() {
    return {
      title: '程序员做饭',
      path: '/pages/index/index'
    }
  },
})