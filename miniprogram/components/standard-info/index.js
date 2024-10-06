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
    noResult: false
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
    ready() {
      wx.cloud.callFunction({
        name: 'barcode', 
        data: {
          action: 'get',
          barcode: this.data.barcode
        }
      }).then(({ result }) => {
        if (result.code == 0) {
          const { data } = result;

            this.setData({
              hasResult: true,
              info: data
            })
            this.triggerEvent('dataready', { data })
        } else {
          this.setData({
            hasResult: false
          })
          this.getQuota();
        }
      }).finally(() => {
        this.setData({
          init: false
        })
      })
    }
  },

  methods: {
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