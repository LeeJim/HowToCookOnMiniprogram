import infos from '../../data'
import Toast from 'tdesign-miniprogram/toast/index';
import Message from 'tdesign-miniprogram/message/index';

Page({
  data: {
    index: 0,
    id: null,
    visible: true,
    liked: false,
    starred: false,
    done: false,
    stepIndexes: [],
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
        const operation = this.data.detail.find(item => item.text == '操作')
        if (operation) {
          this.setData({
            stepIndexes: new Array(operation.content.length).fill(0)
          })
        }
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

  handlePreview({ target }) {
    const { src } = target.dataset;

    wx.previewImage({
      urls: [src],
      success() {
        console.log('success');
      },
      fail(e) {
        console.log(e);
      }
    })
  },

  handleLink({ target }) {

    const { src } = target.dataset;

    if (src.startsWith('http')) {
      wx.setClipboardData({
        data: src,
      }).then(() => {
        Message.info({
          offset: [20, 32],
          duration: 5000,
          content: '链接已复制，暂不支持直接打开网页',
        });
      }).catch(() => {
        Message.info({
          offset: [20, 32],
          duration: 5000,
          content: '链接无法复制，请稍后重试',
        });
      })
    } else {
      const match = /\/([^\/]+)\.md/.exec(src);

      if (match[1]) {
        const cookbook = infos.find(item => item.name.includes(match[1]))
        
        if (cookbook) {
          wx.navigateTo({
            url: './index?id=' + cookbook.id
          })
        }
      }
    }
  },
  
  onShareAppMessage() {
    return {
      title: this.data.title || '程序员做饭指南',
      path: '/pages/detail/index?id=' + this.data.id
    }
  },
})