export const create = (adUnitId) => {
  if (wx.createRewardedVideoAd) {
    const ad = wx.createRewardedVideoAd({
      adUnitId,
      multiton: true
    })
    return ad;
  }
}

export const show = (videoAd) => {
  // 用户触发广告后，显示激励视频广告
  if (videoAd) {
    videoAd.show().catch(() => {
      // 失败重试
      videoAd.load()
        .then(() => videoAd.show())
        .catch(err => {
          console.log('激励视频 广告显示失败')
        })
    })
  }
}
