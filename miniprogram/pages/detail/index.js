import infos from '../../recipes-enriched'
import tips from '../learn/data'
import { titleMap, categoryIcons } from '../../config/index.js'
import Toast from 'tdesign-miniprogram/toast/index';
import Message from 'tdesign-miniprogram/message/index';

Page({
  data: {
    index: 0,
    id: null,
    visible: true,
    like: false,
    star: false,
    likeCount: 0,
    starCount: 0,
    done: false,
    stepIndexes: [],
    adFlag: false,
    categoryLabel: '',
    categoryIcon: '',
  },

  async onLoad(options) {
    const { id } = options;
    if (id) {
      this.setData({ id })
      const target = infos.find(item => item.id == id)
      if (target) {
        this.setData({
          ...target,
          categoryLabel: titleMap[target.category] || '',
          categoryIcon: categoryIcons[target.category] || '📖',
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

    try {
      const [starRes, likeRes] = await Promise.all([
        wx.cloud.callFunction({ name: 'cookbookAction', data: { action: 'status', id, type: 'star' } }),
        wx.cloud.callFunction({ name: 'cookbookAction', data: { action: 'status', id, type: 'like' } }),
      ]);
      const starData = starRes.result.data;
      const likeData = likeRes.result.data;
      this.setData({
        star: starData.active,
        starCount: starData.count,
        like: likeData.active,
        likeCount: likeData.count,
      });
    } catch (err) {
      console.log(err);
    }
    this.setData({ done: true });
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
      const { result } = await wx.cloud.callFunction({
        name: 'cookbookAction',
        data: { action: 'toggle', id, type },
      });
      const { active, count } = result.data;
      this.setData({
        [type]: active,
        [`${type}Count`]: count,
      });
    } catch (err) {
      console.log(err);
      wx.showToast({ title: '操作失败，请稍后再试', icon: 'none' });
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
  
  handleBack() {
    wx.navigateBack({ delta: 1 });
  },

  handleCloseTimer() {
    this.setData({ startTimeout: false, timeout: 0 });
  },

  onShareAppMessage() {
    return {
      title: this.data.name || '程序员做饭指南',
      path: '/pages/detail/index?id=' + this.data.id
    }
  },
})