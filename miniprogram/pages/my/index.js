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
    }]
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

  handleSubscribe() {
    const tmpId = 'vjEDlUYrVJ05CauSw_V9jIWF-okt3OMCBtlz9yvjrfg';
    wx.requestSubscribeMessage({
      tmplIds: [tmpId],
      success: (res) => {
        Toast({
          context: this,
          selector: '#t-toast',
          message: res[tmpId] == 'accept' ? '订阅成功' : '你拒绝了订阅',
        });
      }
    })
  },
  
  onShareAppMessage() {
    return {
      title: '程序员做饭',
      path: '/pages/index/index'
    }
  },
})