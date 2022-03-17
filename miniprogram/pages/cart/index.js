// pages/cart/index.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    list: [{
      name: 'pupu',
      logo: 'pupu.webp',
      title: '朴朴',
      desc: '朴朴一下，又快又好',
      appid: 'wx122ef876a7132eb4',
      tag: '生鲜电商'
    }, {
      name: 'dingdong',
      logo: 'dingdong.jpeg',
      title: '叮咚买菜',
      desc: '让美好的食材像自来水一样',
      appid: 'wx1e113254eda17715',
      tag: '生鲜电商'
    }, {
      name: 'qixian',
      logo: 'qixian.jpeg',
      title: '京东七鲜',
      desc: '好生活，七鲜',
      appid: 'wxb8c24a764d1e1e6d',
      tag: '生鲜电商'
    }, {
      name: 'baiguoyuan',
      logo: 'baiguoyuan.jpeg',
      title: '百果园+',
      desc: '🐼 熊猫大鲜，品质生鲜超市',
      appid: 'wx1f9ea355b47256dd',
      tag: '生鲜电商'
    }, {
      name: 'meituan',
      logo: 'meituan.jpeg',
      title: '美团',
      desc: '帮大家吃得更好，生活更好',
      appid: 'wxde8ac0a21135c07d',
      tag: '生鲜电商'
    }, {
      name: 'meiriyouxian',
      logo: 'meiriyouxian.jpeg',
      title: '每日优鲜',
      desc: '每日供应优质新鲜食材',
      appid: 'wxebf773691904eee9',
      tag: '生鲜电商'
    }, {
      name: 'qiandama',
      logo: 'qiandama.jpeg',
      title: '钱大妈',
      desc: '新鲜不隔夜，天亮即出发',
      appid: 'wx94679e209a2b069d',
      tag: '生鲜电商'
    }, {
      name: 'tianhong',
      logo: 'tianhong.jpeg',
      title: '天虹',
      desc: '综合超市',
      appid: 'wx83b25ac313aea733',
      tag: '综合商超'
    }, {
      name: 'baijiahua',
      logo: 'baijiahua.jpeg',
      title: '百佳华',
      desc: '精选50多个国家和地区优质商品',
      appid: 'wx3cdd1f26cc0c7b25',
      tag: '综合商超'
    }, {
      name: 'jialefu',
      logo: 'jialefu.jpeg',
      title: '家乐福',
      desc: '苏宁易购旗下综合超市',
      appid: 'wxbff87cc25bc11305',
      tag: '综合商超'
    }, {
      name: 'yonghui',
      logo: 'yonghui.jpeg',
      title: '永辉生活',
      desc: '新鲜蔬果肉禽，食品百货，应用尽有',
      appid: 'wxc9cf7c95499ee604',
      tag: '综合商超'
    }, {
      name: 'woerma',
      logo: 'woerma.jpeg',
      title: '沃尔玛',
      desc: '一家美国的世界性连锁企业',
      appid: 'wx83231ee9993066b7',
      tag: '综合商超'
    }, {
      name: 'yongwang',
      logo: 'yongwang.jpeg',
      title: '永旺',
      desc: '日本著名零售集团公司',
      appid: 'wx55996449c48dd8c7',
      tag: '综合商超'
    }, {
      name: 'shanmu',
      logo: 'shanmu.jpeg',
      title: '山姆',
      desc: '美国沃尔玛旗下高端会员制商店',
      appid: 'wxb344a8513eaaf849',
      tag: '综合商超'
    }, {
      name: 'jingxi',
      logo: 'jingxi.jpeg',
      title: '京喜拼拼',
      desc: '京东旗下生活消费商城',
      appid: 'wxf95d0d80e9d5bfc0',
      tag: '社区电商'
    }, {
      name: 'xingsheng',
      logo: 'xingsheng.jpeg',
      title: '兴盛优选',
      desc: '一家有温度的社区电商',
      appid: 'wx6025c5470c3cb50c',
      tag: '社区电商'
    }, {
      name: 'tudigong',
      logo: 'tudigong.jpeg',
      title: '土地公',
      desc: '花更少的钱 享美好生活',
      appid: 'wx264657535896c762',
      tag: '社区电商'
    }],
    value: 'cart',
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

  onShow: function (options) {
    const arr = wx.getStorageSync('miniprogram_clicked') || []
    const { list } = this.data;

    if (arr.length > 0) {
      arr.forEach(appid => {
        const target = list.find(item => item.appid == appid)
        if (target) {
          target.clicked = true
        }
      })
      list.sort(item => item.clicked ? -1 : 1)
    }

    this.setData({ list })
  },

  handleRedirect({ currentTarget }) {
    const { appid } = currentTarget.dataset;

    wx.navigateToMiniProgram({
      appId: appid
    }).then(() => {
      this.updateViews(appid)
      this.storageAction(appid)
    }).catch(err => {
      console.log(err);
    })
  }, 

  storageAction(appid) {
    const arr = wx.getStorageSync('miniprogram_clicked') || []

    if (arr.indexOf(appid) > -1) return;

    arr.push(appid)
    wx.setStorageSync('miniprogram_clicked', arr)
  },

  handleTabbarChange({ detail }) {
    const { value } = detail;
    
    wx.redirectTo({
      url: `../${value}/index`
    })
  },

  updateViews(appid) {
    wx.cloud.callFunction({
      name: 'updateViews',
      data: {
        id: appid,
        type: 'miniprogram'
      },
    })
  },

  onShareAppMessage() {
    return {
      title: '所有的买菜 APP 尽在这里',
      path: '/pages/cart/index'
    }
  },
})