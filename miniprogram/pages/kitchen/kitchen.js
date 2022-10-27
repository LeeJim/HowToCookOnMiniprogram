import { knownSupportedEmoji } from './supported';
let emojiData = {};

Page({
  data: {
    visible: false,
    knownSupportedEmoji,
    enableEmoji: [],
    leftEmoji: '',
    rightEmoji: '',
    pos: '',
  },
  onLoad() {
    wx.request({
      url: 'https://how-to-cook-1255404841.cos.ap-shanghai.myqcloud.com/emoji/emoji.json',
      success(res) {
        emojiData = res.data;
      },
      fail(err) {
        console.log(err);
      }
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
            date: target ? target.date : ''
          }
        })
      })
    }
    this.setData({ visible: true, pos })
  },

  onVisibleChange(e) {
    this.setData({ visible: e.detail.visible })
  },

  handleSelectedEmoji(e) {
    const { pos } = this.data;
    const { id, date, valid } = e.target.dataset;
    const rect = {};

    if (pos == 'right' && !valid) return;

    if (pos == 'right') {
      rect.date = date
    }

    this.setData({ ...rect, [`${pos}Emoji`]: id, visible: false });
  }
})