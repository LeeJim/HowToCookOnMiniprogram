const info = require('./data.js').default

Page({

  data: {
    info,
    value: 'learn',
    tabbars: [{
      text: '首页',
      value: 'index',
      icon: 'home'
    },{
      text: '学习',
      value: 'learn',
      icon: 'laptop'
    }, {
      text: '个人中心',
      value: 'my',
      icon: 'user'
    }]
  },

  onLoad: function (options) {

  },

  handleTabbarChange({ detail }) {
    const { value } = detail;
    
    wx.redirectTo({
      url: `../${value}/index`
    })
  },

  onShareAppMessage: function () {

  }
})