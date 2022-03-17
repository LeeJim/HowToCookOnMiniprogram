import Toast from 'tdesign-miniprogram/toast/index';

const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

Page({
  data: {
    value: 'my',
    avatarUrl: defaultAvatarUrl,
    tabbars: [{
      text: '首页',
      value: 'index',
      icon: 'home'
    },{
      text: '技巧',
      value: 'learn',
      icon: 'tips'
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

  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;

    this.setData({ avatarUrl })
    wx.cloud.callFunction({
      name: 'saveUserinfo',
      data: {
        avatarUrl,
      },
    })
  },

  handleTabbarChange({ detail }) {
    const { value } = detail;
    
    wx.redirectTo({
      url: `../${value}/index`
    })
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
      title: '程序员做饭指南',
      path: '/pages/index/index'
    }
  },
})