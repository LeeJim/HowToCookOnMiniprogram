const domain = 'http://dev.africans.cn';

export function post(cmd, data = {}) {
  const innerData = {};

  if (cmd != 'miniprogram/login') {
    innerData.token = wx.getStorageSync('token');
  }
  return new Promise((resolve, reject) => {
    wx.request({
      method: 'POST',
      url: `${domain}/${cmd}`,
      data: {
        id: 'wy9HvIHSJfNYikzCR3BZ6R6VwTu4ILykYbnevVNYPBY=',
        ...innerData,
        ...data
      },
      success({ data, statusCode}) {
        if (statusCode == 200) {
          resolve(data.data);
        } else {
          reject(data.data)
        }
      },
      fail(err) {
        console.log('request fail: ', err);
        reject(err)
      }
    })
  })
}