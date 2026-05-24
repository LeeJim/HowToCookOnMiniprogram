import infos from '../../data'
import utils from '../../utils/index.js'
import { chineseMap, titleMap, categoryIcons } from '../../config/index.js'
import Toast from 'tdesign-miniprogram/toast/index';
import dayjs from 'dayjs';

let isSubscribeShow = false;

Page({
  data: {
    list: [],
    isReady: false,
    searchKeyword: '',
    chineseMap,
    categoryIndex: 0,
    subscribeModalVisible: false,
    scrollTop: 0,
    pulling: false,
    notScrollable: false,
  },

  onLoad() {
    const isReady = dayjs().isAfter(dayjs('2024-10-19 19:00:00'));
    const menu = utils.groupBy(infos, 'category');
    const list = Object.entries(menu).filter(([item]) => item !== 'template').map(([category, list]) => {
      return {
        name: titleMap[category],
        icon: categoryIcons[category] || '📖',
        list
      }
    })
    this.setData({
      list,
      isReady
    })
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true
      })
    }

    const { scene } = wx.getLaunchOptionsSync()
    if (scene === 1107 && !isSubscribeShow) {
      this.setData({
        subscribeModalVisible: true
      })
      isSubscribeShow = true
    }
  },

  handleToStore() {
    wx.switchTab({
      url: '/pages/stock/index',
    })
  },

  handleTabChange(e) {
    const { index } = e.currentTarget.dataset;
    this.setData({ categoryIndex: index, scrollTop: 0 });
  },

  handleChange(e) {
    this.setData({ categoryIndex: e.detail.value });
  },

  handleTap(e) {
    const { id } = e.currentTarget.dataset.item;
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

  handleToAiCook() {
    wx.navigateTo({ url: '/pages/ai-cook/index' });
  },

  handleToSearchPage() {
    wx.navigateTo({ url: '/pages/search/index' });
  },

  handleNextCategory() {
    const next = this.data.categoryIndex + 1;
    if (next < this.data.list.length) {
      this.setData({ categoryIndex: next, scrollTop: 0 });
    }
  },

  handleTouchStart() {
    this._touching = true;
  },

  handleTouchEnd() {
    this._touching = false;
    if (this._shouldSwitch) {
      this._shouldSwitch = false;
      this.setData({ pulling: false });
      const next = this.data.categoryIndex + 1;
      if (next < this.data.list.length) {
        wx.vibrateShort();
        this.setData({ categoryIndex: next, scrollTop: 0 });
      }
    } else {
      this.setData({ pulling: false });
    }
  },

  handleScroll(e) {
    const { scrollTop, scrollHeight, deltaY } = e.detail;

    // Detect if content fits without scrolling
    const query = wx.createSelectorQuery();
    query.select('.content').boundingClientRect();
    query.exec((res) => {
      if (res[0]) {
        const clientHeight = res[0].height;
        const notScrollable = scrollHeight <= clientHeight + 20;
        if (notScrollable !== this.data.notScrollable) {
          this.setData({ notScrollable });
        }

        if (this._touching && !notScrollable) {
          const maxScroll = scrollHeight - clientHeight;
          // User pulled past the bottom
          if (scrollTop > maxScroll + 40) {
            if (!this.data.pulling) {
              this.setData({ pulling: true });
            }
            this._shouldSwitch = true;
          } else if (deltaY > 0) {
            // Scrolling back up — cancel
            if (this.data.pulling) {
              this.setData({ pulling: false });
            }
            this._shouldSwitch = false;
          }
        }
      }
    });
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