const info = require('./data.js').default
const cookbooks = require('../../data').default
// import Toast from 'tdesign-miniprogram/toast/index';
import Message from 'tdesign-miniprogram/message/index';

Page({
  data: {
    info: []
  },

  onLoad: function (options) {
    const { no = 0 } = options;
    const target = info.find(item => item.no == no);

    if (target) {
      this.setData({
        info: target.content
      })
      wx.setNavigationBarTitle({
        title: target.name
      })
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
        const cookbook = cookbooks.find(item => item.name.includes(match[1]))
        
        if (cookbook) {
          wx.navigateTo({
            url: '/pages/detail/index?id=' + cookbook.id
          })
        }

        const tips = info.find(item => item.name.includes(match[1]))
        if (tips) {
          wx.navigateTo({
            url: '/pages/learn/detail?no=' + tips.no
          })
        }
      }
    }
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  }
})