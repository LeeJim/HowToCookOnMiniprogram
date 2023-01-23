import infos from '../../data'
import tips from '../learn/data'
import Toast from 'tdesign-miniprogram/toast/index';
import Message from 'tdesign-miniprogram/message/index';
import { post } from '../../utils/request';

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
        this.updateViews()
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
      const [starCount, likeCount, star, like] = await Promise.all([
        post('action/get/all', { id, type: 'star'}),
        post('action/get/all', { id, type: 'like'}),
        post('action/get', { id, type: 'star'}),
        post('action/get', { id, type: 'like' })
      ])
      this.setData({
        done: true,
        likeCount,
        starCount,
        star,
        like
      });
    } catch(err) {
      console.log(err);
    }
  },

  updateViews() {
    const { id } = this.data;
    // wx.cloud.callFunction({
    //   name: 'updateViews',
    //   data: { id },
    //   type: 'cookbook'
    // })
  },

  toMyCenter() {
    wx.switchTab({
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
      const data = await post('action/create', { type, id });

      this.setData({ [type]: data })
      wx.hideLoading()
    } catch(err) {
      console.log(err);
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

        const tip = tips.find(item => item.name.includes(match[1]))
        if (tip) {
          wx.navigateTo({
            url: '/pages/learn/detail?no=' + tip.no
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