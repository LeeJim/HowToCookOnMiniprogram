// index.js
import { groupBy } from 'lodash'
import infos from '../../data'
// 获取应用实例
const app = getApp()

Page({
  data: {
    list: [],
    motto: 'Hello World',
    userInfo: {},
    hasUserInfo: false,
    canIUse: wx.canIUse('button.open-type.getUserInfo'),
    canIUseGetUserProfile: false,
    canIUseOpenData: wx.canIUse('open-data.type.userAvatarUrl') && wx.canIUse('open-data.type.userNickName'), // 如需尝试获取用户信息可改为false
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
    const menu = groupBy(infos.dishes, 'category');
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
      url: '../detail/index',
      success(res) {
        res.eventChannel.emit('acceptDataFromOpenerPage', { data: item.child })
      }
    })
  },
  getUserProfile(e) {
    // 推荐使用wx.getUserProfile获取用户信息，开发者每次通过该接口获取用户个人信息均需用户确认，开发者妥善保管用户快速填写的头像昵称，避免重复弹窗
    wx.getUserProfile({
      desc: '展示用户信息', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
      success: (res) => {
        console.log(res)
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
      }
    })
  },
  getUserInfo(e) {
    // 不推荐使用getUserInfo获取用户信息，预计自2021年4月13日起，getUserInfo将不再弹出弹窗，并直接返回匿名的用户个人信息
    console.log(e)
    this.setData({
      userInfo: e.detail.userInfo,
      hasUserInfo: true
    })
  },
  handleTabbarChange({ detail }) {
    const { value } = detail;
    
    if (value == 1) {
      wx.redirectTo({
        url: '../my/index'
      })
    }
  }
})
