import infos from '../../data'
import Toast from 'tdesign-miniprogram/toast/index';

Page({
  data: {
    index: 0,
    id: null,
    visible: true,
    liked: false,
    starred: false,
    done: false,
    stepIndexes: new Array(10).fill(0),
    adFlag: false,
  },

  async onLoad(options) {
    const { id } = options;
    if (id) {
      this.setData({ id })
      const target = infos.find(item => item.id == id)
      if (target) {
        this.setData({
          ...target
        })
        this.getData()
      }
    }
  },

  onShow() {
    const adFlagStorage = wx.getStorageSync('ad-flag')

    this.setData({
      adFlag: adFlagStorage === '' ? true : adFlagStorage,
    })
  },

  async getData() {
    const { id } = this.data;
    
    this.setData({ done: false })
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getCookbook',
        data: {
          id
        }
      })
      if (result.errno == 0) {
        const { likeds, liked, starreds, starred } = result.data
        this.setData({ done: true })
        this.setData({
          liked,
          likeds,
          starreds,
          starred
        })
      }
    } catch(e) {
      console.log(e);
    } finally {
      this.setData({ done: true })
    }
  },

  toMyCenter() {
    wx.navigateTo({
      url: '/pages/my/index'
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

  async toggleStarOrLike(e) {
    const { dataset } = e.currentTarget;
    const { id } = this.data;
    const { type } = dataset;

    try {
      wx.showLoading({
        title: '加载中',
        mask: true
      })
      const { result } = await wx.cloud.callFunction({
        name: 'setCookbook',
        data: {
          id,
          type,
        }
      })
      wx.hideLoading()
      if (result.errno == 0) {
        const { liked, starred, likeds } = result.data

        this.setData({
          likeds,
          liked,
          starred
        })
      }
    } catch(e) {
      console.log(e);
    } finally {
      wx.hideLoading()
    }
  },
  
  onShareAppMessage() {
    return {
      title: this.data.title || '程序员做饭',
      path: '/pages/detail/index?id=' + this.data.id
    }
  },
})