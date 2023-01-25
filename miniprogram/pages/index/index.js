import infos from '../../data'
import utils from '../../utils/index.js'
import { chineseMap, titleMap } from '../../config/index.js'
import Toast from 'tdesign-miniprogram/toast/index';

let isSubscribeShow = false;

Page({
  data: {
    list: [],
    searchKeyword: '',
    chineseMap,
    categoryIndex: 0,
    subscribeModalVisible: false,
  },
  
  onLoad() {
    const menu = utils.groupBy(infos, 'category');
    const list = Object.entries(menu).filter(([item]) => item !== 'template').map(([category, list]) => {
      return {
        name: titleMap[category],
        icon: `/assets/images/${category}.png`,
        list
      }
    })
    this.setData({
      list
    })
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true
      })
    }
    
    const { scene } = wx.getLaunchOptionsSync() // https://developers.weixin.qq.com/miniprogram/dev/reference/scene-list.html
    if (scene === 1107 && !isSubscribeShow) {
      this.setData({
        subscribeModalVisible: true
      })
      isSubscribeShow = true
    }
  },

  handleChange(e) {
    this.setData({ categoryIndex: e.detail.value });
  },

  handleTap(e) {
    const { id } = e.target.dataset.item;
    
    wx.navigateTo({
      url: '../detail/index?id=' + id
    })
  },

  handleToSearch() {
    const content = this.data.searchKeyword.trim();
    wx.navigateTo({
      url: '/pages/search/index?keyword=' + content,
    }).then(() => {
      this.setData({ searchKeyword: '' })
    })
  },

  handleSubscribe() {
    const tmplIds = ['vjEDlUYrVJ05CauSw_V9jIWF-okt3OMCBtlz9yvjrfg', 'Sbtj4X4gIKWRy0xDeWU8xCl8LejbTpIQ3gWiKh5JFp4'];
    wx.requestSubscribeMessage({
      tmplIds,
      success: async (res) => {
        const accept = tmplIds.some(key => res[key] === 'accept')
        Toast({
          context: this,
          selector: '#t-toast',
          message: accept ? '订阅成功' : '你拒绝了订阅',
        });
      },
      complete: () => {
        this.setData({ subscribeModalVisible: false })
      }
    })
  },

  onShareAppMessage() {
    return {
      title: '程序员做饭指南',
      path: '/pages/index/index'
    }
  },
})
