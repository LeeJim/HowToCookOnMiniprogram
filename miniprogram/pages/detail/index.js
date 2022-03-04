import infos from '../../data'

Page({
  data: {
    index: 0,
    id: null,
    stepIndexes: new Array(10).fill(0),
    startCountDown: false,
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
      [`stepIndexes[${index}]`]: (this.data.stepIndexes[index] + 1) % max,
      startCountDown: false
    })
  },
  handleStart() {
    this.setData({ startCountDown: true })
  },
  handleCountdown(e) {
    const { minutes, seconds } = e.detail

    if (minutes <= 0 && seconds <= 0) {
      wx.vibrateLong()
      this.setData({ startCountDown: false })
    }
  },
  onShareAppMessage() {
    return {
      title: this.data.title || '程序员做饭',
      path: '/pages/detail/index?id=' + this.data.id
    }
  },
})