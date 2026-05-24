import { checkIn, getCheckInStatus, LEVELS } from '../../utils/user-level';

const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

const defaultLevel = { icon: '🥚', name: '初入厨房', next: { icon: '🍳', name: '烹饪学徒', minStreak: 7 } };

Page({
  data: {
    avatarUrl: defaultAvatarUrl,
    nickname: '',
    level: defaultLevel,
    adFlag: true,
    checkedToday: false,
    streak: 0,
    daysUntilNext: 7,
    progress: 0,
    progressMax: 7,
    showRules: false,
    allLevels: LEVELS,
    checkingIn: false,
    checkinLoading: true,
  },

  async onLoad() {
    // 先展示缓存
    const cachedAvatar = wx.getStorageSync('cached_avatarUrl');
    const cachedNick = wx.getStorageSync('cached_nickname');
    if (cachedAvatar) this.setData({ avatarUrl: cachedAvatar });
    if (cachedNick) this.setData({ nickname: cachedNick });

    this.loadUserInfo();
    await this.refreshStatus();
  },

  onShow() {
    const adFlagStorage = wx.getStorageSync('ad-flag')
    this.setData({
      adFlag: adFlagStorage === '' ? true : adFlagStorage,
    })
    this.refreshStatus();
  },

  async loadUserInfo() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'userinfo',
        data: { action: 'get' },
      });
      if (result && result.code === 0 && result.data) {
        const { avatarUrl, nickName } = result.data;
        if (avatarUrl && avatarUrl !== this.data.avatarUrl) {
          this.setData({ avatarUrl });
          wx.setStorageSync('cached_avatarUrl', avatarUrl);
        }
        if (nickName && nickName !== this.data.nickname) {
          this.setData({ nickname: nickName });
          wx.setStorageSync('nickname', nickName);
          wx.setStorageSync('cached_nickname', nickName);
        }
      }
    } catch (err) {
      console.error('加载用户信息失败:', err);
    }
  },

  async refreshStatus() {
    try {
      const status = await getCheckInStatus();
      this.setData({ ...status, checkinLoading: false });
    } catch (err) {
      console.error('获取打卡状态失败:', err);
      this.setData({ checkinLoading: false });
    }
  },

  async handleCheckIn() {
    if (this.data.checkingIn) return;
    this.setData({ checkingIn: true });

    try {
      const result = await checkIn();
      if (result.alreadyCheckedIn) {
        wx.showToast({ title: '今日已打卡', icon: 'none' });
        this.setData({ checkingIn: false });
        return;
      }
      wx.vibrateShort();
      wx.showToast({ title: '打卡成功！', icon: 'success' });

      const { streak, level } = result;
      const daysUntilNext = level.next ? level.next.minStreak - streak : 0;
      const progressMax = level.next ? level.next.minStreak : streak;
      this.setData({
        checkedToday: true,
        streak,
        level,
        daysUntilNext,
        progress: streak,
        progressMax,
        checkingIn: false,
      });
    } catch (err) {
      console.error('打卡失败:', err);
      wx.showToast({ title: '打卡失败，请稍后再试', icon: 'none' });
      this.setData({ checkingIn: false });
    }
  },

  toggleRules() {
    this.setData({ showRules: true });
  },

  closeRules() {
    this.setData({ showRules: false });
  },

  async onChooseAvatar(e) {
    const tempPath = e.detail.avatarUrl;
    this.setData({ avatarUrl: tempPath })

    try {
      const { fileID } = await wx.cloud.uploadFile({
        cloudPath: `avatars/${Date.now()}.png`,
        filePath: tempPath,
      });
      await wx.cloud.callFunction({
        name: 'userinfo',
        data: { action: 'update', body: { avatarUrl: fileID } },
      });
    } catch (err) {
      console.error('上传头像失败:', err);
    }
  },

  onNicknameBlur(e) {
    const nickName = e.detail.value.trim();
    if (nickName) {
      wx.setStorageSync('nickname', nickName);
      wx.cloud.callFunction({
        name: 'userinfo',
        data: { action: 'update', body: { nickName } },
      });
    }
  },

  handleToStarred() {
    wx.navigateTo({ url: '/pages/myStarred/index' })
  },

  handleToggleAd({ detail }) {
    const adFlag = detail.value
    wx.setStorageSync('ad-flag', adFlag)
    this.setData({ adFlag })
  },

  onShareAppMessage() {
    return {
      title: '程序员做饭指南',
      path: '/pages/index/index'
    }
  },
})