import infos from '../../data'
import utils from '../../utils/index.js'
import config from '../../config/index.js'
import Toast from 'tdesign-miniprogram/toast/index';

let isSubscribeShow = false;

Page({
  data: {
    list: [],
    value: 'index',
    searchKeyword: '',
    subscribeModalVisible: false,
    tabbars: [{
      text: '首页',
      value: 'index',
      icon: 'home'
    }, {
      text: '买菜',
      value: 'cart',
      icon: 'cart'
    }, {
      text: '技巧',
      value: 'learn',
      icon: 'tips'
    }, {
      text: '个人中心',
      value: 'my',
      icon: 'user'
    }]
  },
  
  onLoad() {
    const menu = utils.groupBy(infos, 'category');
    const list = Object.entries(menu).filter(([item]) => item !== 'template').map(([catetory, list]) => {
      return {
        name: config.titleMap[catetory],
        icon: `/assets/images/${catetory}.png`,
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

  handleTap(e) {
    const { item } = e.detail;
    
    wx.navigateTo({
      url: '../detail/index?id=' + item.id
    })
  },

  handleTabbarChange({ detail }) {
    const { value } = detail;
    
    wx.redirectTo({
      url: `../${value}/index`
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
