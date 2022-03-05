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
      const target = infos.dishes.find(item => item.id == options.id)
      if (target) {
        this.calcData(target.child)
      }
    }
  },

  calcData([ main ]) {
    const sectionStartIndex = main.child.findIndex(item => item.type == 'heading');
    const hasDesc = sectionStartIndex > 0;
    const sections = hasDesc ? main.child.slice(sectionStartIndex) : main.child;

    sections[0].value = sections[0].value.slice(2)
    this.setData({
      title: main.value,
      desc: hasDesc ? main.child[0].value : '可以动手试试',
      sections,
    })
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
    const { time } = e.target.dataset;

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