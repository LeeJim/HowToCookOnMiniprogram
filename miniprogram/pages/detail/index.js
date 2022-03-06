import infos from '../../data'
import Toast from 'tdesign-miniprogram/toast/index';

Page({
  data: {
    index: 0,
    id: null,
    visible: true,
    stepIndexes: new Array(10).fill(0),
    countdownIndexes: new Array(10).fill(false),
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ id: options.id })
      const target = infos.find(item => item.id == options.id)
      if (target) {
        this.setData({
          ...target
        })
      }
    }
  },

  toNext(e) {
    const { max, index } = e.target.dataset;

    wx.vibrateShort()
    this.setData({
      startTimeout: false,
      timeout: 0,
      [`stepIndexes[${index}]`]: (this.data.stepIndexes[index] + 1) % max,
    })
  },

  handleStart(e) {
    const { time } = e.currentTarget.dataset;

    wx.vibrateShort()
    this.setData({
      startTimeout: true,
      timeout: time * 1000
    })
  },

  handleCountdown(e) {
    const { hours, minutes, seconds } = e.detail

    if (hours <= 0 && minutes <= 0 && seconds <= 0) {
      wx.vibrateLong()
      this.setData({
        startTimeout: false
      })
      Toast({
        context: this,
        selector: '#t-toast',
        message: '时间到！',
      });
    }
  },
  
  onShareAppMessage() {
    return {
      title: this.data.title || '程序员做饭',
      path: '/pages/detail/index?id=' + this.data.id
    }
  },
})