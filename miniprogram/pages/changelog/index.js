import log from './log'

Page({
  data: {
    log
  },

  onLoad: function (options) {
    
  },

  onShareAppMessage: function () {
    return {
      title: '程序员做饭-更新日志',
      path: '/pages/changelog/index'
    }
  }
})