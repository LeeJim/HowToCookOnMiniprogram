import infos from '../../data'
import utils from '../../utils/index.js'

Page({
  data: {
    list: [],
    value: 'home',
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
  
  onLoad() {
    const menu = utils.groupBy(infos, 'category');
    const list = Object.entries(menu).filter(([item]) => item !== 'template').map(([catetory, list]) => {
      const nameMap = {
        breakfast: '早餐 Breakfast',
        condiment: '佐料 Condiment',
        dessert: '甜品 Dessert',
        drink: '饮品 Drink',
        'home-cooking': '烹饪 Cooking',
        'semi-finished': '速食 FastFood',
        'soup': '汤 Soup',
        'staple': '主食 Staple'
      }
      return {
        name: nameMap[catetory],
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
  },

  handleTap(e) {
    const { item } = e.detail;
    
    wx.navigateTo({
      url: '../detail/index?id=' + item.id
    })
  },

  handleTabbarChange({ detail }) {
    const { value } = detail;
    
    if (value == 'my') {
      wx.redirectTo({
        url: '../my/index'
      })
    }
  },

  onShareAppMessage() {
    return {
      title: '程序员做饭',
      path: '/pages/index/index'
    }
  },
})
