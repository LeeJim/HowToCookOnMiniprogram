import cookbook from '../../data.js';
import config from '../../config/index'

Page({
  data: {
    keyword: '',
    result: [],
    isLoading: false,
    focus: false,
    chineseMap: config.chineseMap,
    themeMap: {
      dessert: 'danger',
      breakfast: 'success',
      staple: 'warning'
    }
  },

  onLoad(options) {
    let keyword = options.keyword.trim()
    if (keyword) {
      this.setData({ keyword });
      this.doSearch(keyword)
    }
  },

  handleSearchClear() {
    this.setData({
      result: [],
      keyword: '',
      focus: true
    })
  },

  handleSearch({ detail }) {
    this.setData({ isLoading: true })
    if (this.lastTrigger) {
      clearTimeout(this.lastTrigger)
    }
    this.lastTrigger = setTimeout(() => {
      this.doSearch(detail.value)
    }, 500)
  },

  doSearch(keyword) {
    if (keyword == '') {
      this.setData({
        result: [],
        isLoading: false
      })
      return
    };
    const fuzzySearch = (key) => {
      if (typeof key == 'string') return key.indexOf(keyword) > -1
      if (Array.isArray(key)) {
        return key.some(item => fuzzySearch(item))
      }
      if (typeof key == 'object') {
        return Object.keys(key).some(item => fuzzySearch(item))
      }
      return false
    }
    const result = cookbook.filter(cb => {
      const isTitleMatch = cb.name.indexOf(keyword) > -1;
      // const isDescMatch = fuzzySearch(cb.desc)

      return isTitleMatch;
    })
    this.setData({
      result,
      isLoading: false
    })
    this.updateViews(keyword)
  },

  updateViews(key) {
    wx.cloud.callFunction({
      name: 'updateViews',
      data: {
        id: key,
        type: 'search'
      },
    })
  },

  onShareAppMessage() {
    return {
      title: '我推荐的菜谱',
      path: '/pages/search/index?keyword=' + this.data.keyword
    }
  }
})