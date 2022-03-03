import Toast from 'tdesign-miniprogram/toast/index';

Page({

  /**
   * 页面的初始数据
   */
  data: {
    value: 'my',
    tabbars: [{
      text: '首页',
      value: 'home',
      icon: 'home'
    }, {
      text: '个人中心',
      value: 'my',
      icon: 'user'
    }]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {

  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  },

  handleTabbarChange({ detail }) {
    const { value } = detail;

    if (value == 'home') {
      wx.redirectTo({
        url: '../index/index'
      })
    }
  },

  handleCopy({ target }) {
    const { msg } = target.dataset;

    wx.setClipboardData({
      data: msg,
      success: () => {
        // Toast({
        //   context: this,
        //   selector: '#t-toast',
        //   message: '复制成功',
        // });
      }
    })
  }
})