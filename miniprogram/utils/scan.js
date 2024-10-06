export const toScan = () => {
  wx.scanCode({
    scanType: ['barCode'],
    success: (res) => {
      console.log(res);
      wx.navigateTo({
        url: '/pages/stock-edit/index?barcode=' + res.result,
      })
    }
  })
}