// app.js
App({
  onLaunch() {
    wx.cloud.init({
      env: ""
    });
  },
  globalData: {
    userInfo: null
  }
})
