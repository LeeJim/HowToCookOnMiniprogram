let videoAd = null

Component({
  properties: {
    barcode: String,
  },

  data: {
    loading: false,
    done: false,
    quota: 0,
    info: {},
    hasResult: false,
    init: true,
    noResult: false,
    picFailed: false,
    fixingPic: false,
  },

  lifetimes: {
    attached() {
      if (wx.createRewardedVideoAd) {
        videoAd = wx.createRewardedVideoAd({
          adUnitId: 'adunit-a013eebf1c0ae3cf'
        })
        videoAd.onLoad(() => {})
        videoAd.onError((err) => {
          console.error('激励视频光告加载失败', err)
        })
        videoAd.onClose((res) => {})
      }
    },
    async ready() {
      // 先尝试自动获取（保存过该条码的用户免费）
      try {
        const { result } = await wx.cloud.callFunction({
          name: 'barcode',
          data: { action: 'fetch', barcode: this.data.barcode }
        });
        if (result && result.code === 0) {
          this.setData({ hasResult: true, info: result.data, init: false });
          this.triggerEvent('dataready', { data: result.data });
          return;
        }
      } catch (err) {
        console.error('自动获取条码失败:', err);
      }
      // 兜底：展示配额UI让用户手动获取
      this.setData({ hasResult: false, init: false });
      this.getQuota();
    }
  },

  methods: {
    onImageError() {
      this.setData({ picFailed: true });
    },

    async retryImage() {
      this.setData({ fixingPic: true });
      try {
        const { result } = await wx.cloud.callFunction({
          name: 'barcode',
          data: { action: 'fixImage', barcode: this.data.info.barcode },
        });
        if (result && result.code === 0 && result.data && result.data.pic) {
          this.setData({
            'info.pic': result.data.pic,
            picFailed: false,
            fixingPic: false,
          });
          this.triggerEvent('dataready', { data: this.data.info });
          wx.showToast({ title: '图片已修复', icon: 'success' });
        } else {
          wx.showToast({ title: '修复失败', icon: 'none' });
          this.setData({ fixingPic: false });
        }
      } catch (err) {
        console.error('修复图片失败:', err);
        wx.showToast({ title: '修复失败', icon: 'none' });
        this.setData({ fixingPic: false });
      }
    },

    getQuota() {
      this.setData({
        loading: true
      })
      wx.cloud.callFunction({
        name: 'quota', 
        data: {
          action: 'get'
        }
      }).then(({ result }) => {
        console.log('quota res', result);
        this.setData({ quota: result.data })
      }).finally(() => {
        this.setData({
          done: true,
          loading: false
        })
      })
    },
    handleClick() {
      if (this.data.quota <= 0) {
        if (videoAd) {
          videoAd.show().catch(() => {
            // 失败重试
            videoAd.load()
              .then(() => videoAd.show())
              .catch(err => {
                console.error('激励视频 广告显示失败', err)
              })
          })

          videoAd.onClose((res) => {
            if (res && res.isEnded) {
              wx.cloud.callFunction({
                name: 'quota',
                data: {
                  action: 'add'
                }
              }).then(({ result }) => {
                if (result.code === 0) {
                  wx.showToast({
                    title: '额度已更新，快速试试吧',
                    icon: 'none'
                  })
                  this.setData({ quota: result.data })
                }
              })
            }
          })
        }
        return;
      }
      wx.showLoading({
        title: '获取中...',
      })
      wx.cloud.callFunction({
        name: 'barcode',
        data: {
          action: 'fetch',
          barcode: this.data.barcode,
        }
      }).then(({ result }) => {
        wx.hideLoading();
        if (result.code === 0) {
          this.setData({
            hasResult: true,
            info: result.data
          })
          this.triggerEvent('dataready', { data: result.data })
        } else {
          if (result.code === 403) {
            wx.showToast({
              icon: "error",
              title: '请先完善个人信息',
            })
            setTimeout(() => {
              wx.navigateTo({
                url: '/pages/user-info/index',
              })
            }, 1000)
            return;
          }
          this.setData({ noResult: true});
          wx.showToast({
            icon: "error",
            title: '暂无相关信息',
          })
        }
      }).catch(() => {
        wx.hideLoading();
      })
    }
  }
})