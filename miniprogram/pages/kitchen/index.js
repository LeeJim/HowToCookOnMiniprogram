import { knownSupportedEmoji } from './supported';
let emojiData = {};
const LIMIT = 5;
import { show as showAd, create as createAd } from '../../utils/ad'

Page({
  combineOriginUrl: '',

  data: {
    visible: false,
    knownSupportedEmoji,
    enableEmoji: [],
    leftEmoji: '',
    rightEmoji: '',
    pos: '',
    loadFail: false,
    size: 30,
    combineEnable: false,
    combineUrl: '',
    error: ''
  },
  
  onLoad() {
    wx.showLoading({ title: '初始化数据ing...', mask: true })
    wx.request({
      url: 'https://how-to-cook-1255404841.cos.ap-shanghai.myqcloud.com/emoji/emoji.json',
      success(res) {
        emojiData = res.data;
      },
      fail(err) {
        console.log(err);
      },
      complete() {
        wx.hideLoading()
      }
    })

    // load ad
    this.combineImageAd = createAd('adunit-ac72850d870bb556');
    this.combineImageAd.onClose((res) => {
      if (res && res.isEnded) {
        const combineUrl = this.getCombineCacheUrl();
        this.setData({
          combineUrl
        })
        wx.setStorageSync('combine-video-had-watched', true)
      } else {
        wx.showModal({
          content: '仅需看 1 次视频，长期可用',
          cancelText: '放弃',
          confirmText: '继续',
          success: (res) => {
            if (res.confirm) {
              showAd(this.combineImageAd)
            } else {
              this.setData({
                leftEmoji: '',
                rightEmoji: ''
              })
            }
          }
        })
      }
    })
    this.combineImageAd.onError((err) => {
      wx.showToast({ title: '广告加载失败，获得免费使用特权', icon: 'none' })
      const combineUrl = this.getCombineCacheUrl();
      this.setData({
        combineUrl
      })
    })

    this.downloadImageAd = createAd('adunit-7f93198b831fa868');
    this.downloadImageAd.onClose((res) => {
      if (res && res.isEnded) {
        const url = this.getCombineCacheUrl();
        this.downloadImage(url);
        wx.setStorageSync('download-video-had-watched', true)
      } else {
        wx.showModal({
          content: '仅需看 1 次视频，长期可下载',
          cancelText: '放弃',
          confirmText: '继续',
          success: (res) => {
            if (res.confirm) {
              showAd(this.downloadImageAd)
            }
          }
        })
      }
    })
    this.downloadImageAd.onError((err) => {
      wx.showToast({ title: '广告加载失败，获得免费下载特权', icon: 'none' })
      this.downloadImage(url);
    })
  },

  handleSelected(e) {
    const { pos } = e.currentTarget.dataset;
    const { leftEmoji } = this.data;
    
    if (pos == 'right') {
      if (leftEmoji == '') {
        wx.showToast({ icon: 'none', title: '从左边开始' })
        return;
      }
      this.setData({
        enableEmoji: knownSupportedEmoji.map(e => {
          const target = emojiData[leftEmoji].find(item => {
            if (e === leftEmoji) {
              return item.leftEmoji == e && item.rightEmoji == e;
            }
            return item.leftEmoji == e || item.rightEmoji == e;
          })
          return {
            isValid: !!target,
            id: e,
            // date: target ? target.date : ''
          }
        })
      })
    }
    this.setData({ visible: true, pos, size: 30 })
  },

  onVisibleChange(e) {
    this.setData({ visible: e.detail.visible })
  },

  handleSelectedEmoji(e) {
    const { pos, rightEmoji } = this.data;
    const { id, valid } = e.target.dataset;

    if (pos == 'right' && !valid) return;

    if (pos == 'left' && rightEmoji) {
      this.setData({ rightEmoji: '', combineUrl: '', combineEnable: false })
    }

    this.setData({ [`${pos}Emoji`]: id, visible: false });

    if (pos == 'right') {
      this.getCombineImageOriginUrl()
      this.handleLimit()
    }
  },

  handleLimit() {
    const combineTimes = wx.getStorageSync('combine-times') || 0;
    const videoHadWatched = wx.getStorageSync('combine-video-had-watched') || false;

    if (Number(combineTimes) > LIMIT && !videoHadWatched && this.combineImageAd) {
      if (this.combineImageAd) {
        showAd(this.combineImageAd)
      }
    } else {
      const combineUrl = this.getCombineCacheUrl();
      this.setData({
        combineUrl
      })
    }
  },

  getCombineImageOriginUrl() {
    const { leftEmoji, rightEmoji } = this.data;
    const fix = str => str.split("-")
      .filter(x => x !== "fe0f")
      .join("_")

    const target = emojiData[leftEmoji].find(item => item.leftEmoji == leftEmoji && item.rightEmoji == rightEmoji || item.leftEmoji == rightEmoji && item.rightEmoji == leftEmoji);

    if (target) {
      this.combineOriginUrl = `https://www.gstatic.com/android/keyboard/emojikitchen/${target.date}/u${fix(target.leftEmoji)}/u${fix(target.leftEmoji)}_u${fix(target.rightEmoji)}.png`;
    }
  },
  
  onCombileLoadError() {
    this.setData({ loadFail: true });
    const { leftEmoji, rightEmoji } = this.data;
    
    if (!this.combineOriginUrl) return

    wx.showLoading({ title: '绘制中', mask: true })

    wx.request({
      url: `https://api.africans.cn/cooking`,
      method: 'POST',
      data: {
        url: this.combineOriginUrl,
        leftEmoji,
        rightEmoji
      },
      success: (res) => {
        if (res.data.errcode == 0) {
          this.setData({ loadFail: false })
        } else {
          wx.showToast({
            title: '未知错误', icon: '',
          })
        }
      },
      fail: (err) => {
        wx.showToast({
          title: err.errmsg
        })
        this.setData({ loadFail: false })
      },
      complete() {
        wx.hideLoading()
      }
    })
  },
  
  onScrollToLower() {
    this.setData({
      size: this.data.size + 30
    })
  },

  onCombineLoaded() {
    const combineTimes = wx.getStorageSync('combine-times');

    this.setData({ combineEnable: true });
    wx.setStorageSync('combine-times', Number(combineTimes) + 1);
  },

  handleShowTips() {
    const { leftEmoji, rightEmoji } = this.data;

    if (!leftEmoji && !rightEmoji) {
      wx.showToast({ title: '先点击左上角', icon: 'none' })
    }
  },

  downloadImage(src) {
    const handleFail = (err) => {
      console.log(err);
      this.setData({ error: err.errMsg })
      wx.showToast({ title: `${err.errMsg}`, icon: 'none' })
    }
    wx.getImageInfo({
      src
    }).then(({ path }) => {
      wx.saveImageToPhotosAlbum({
        filePath: path
      }).then(() => {
        const downloadTimes = wx.getStorageSync('download-times') || 0

        wx.showToast({ title: '下载成功~', icon : 'none' });
        wx.setStorageSync('download-times', Number(downloadTimes) + 1)
      }).catch(handleFail)
    }).catch(handleFail)
  },

  getCombineCacheUrl() {
    const { leftEmoji, rightEmoji } = this.data;
    const url = `https://how-to-cook-1255404841.cos.ap-shanghai.myqcloud.com/combine/${leftEmoji}---${rightEmoji}.png`;

    return url;
  },

  handleDownload() {
    const url = this.getCombineCacheUrl();
    const downloadTimes = wx.getStorageSync('download-times') || 0;
    const videoHadWatched = wx.getStorageSync('download-video-had-watched') || false;

    if (Number(downloadTimes) > LIMIT && !videoHadWatched && this.downloadImageAd) {
      showAd(this.downloadImageAd)
    } else {
      this.downloadImage(url);
    }
  },

  onShareAppMessage() {
    return {
      title: '表情厨房',
      path: '/pages/kitchen/index'
    }
  },
})