import { post } from './utils/request';

App({
  onLaunch() {
    const updateManager = wx.getUpdateManager()

    wx.login({
      success: ({ code }) => {
        post('miniprogram/login', { code }).then(data => {
          wx.setStorageSync('token', data.key)
        }).catch(err => {
          console.error(err);
        }) 
      },
    })

    updateManager.onCheckForUpdate(function (res) {
      // console.log(res.hasUpdate)
    })

    updateManager.onUpdateReady(function () {
      wx.showModal({
        title: '更新提示',
        content: '新版本已经准备好，是否重启应用？',
        success(res) {
          if (res.confirm) {
            updateManager.applyUpdate()
          }
        }
      })
    })
  },
  globalData: {
    userInfo: null
  }
})
