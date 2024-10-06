const cloud = require('wx-server-sdk');

cloud.init({ env: 'restart-9gd2a4k63f58d0c2' })
const db = cloud.database()

const extraTimes = 5

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { action, type = 'barcode' } = event
  const table = db.collection('quota');

  try {
    if (action === 'get') {
      const { data } = await table.where({ openid: OPENID, type }).get();
  
      if (data.length == 0) {
        return { data: 3, code: 0 }
      }
      const [info] = data;
      return { data: info.times, code: 0 }
    }
  
    if (action === 'add') {
      await table.where({ openid: OPENID, type }).update({
        data: {
          times: db.command.inc(extraTimes)
        }
      })
      return { code: 0, data: extraTimes }
    }
  } catch (e) {
    console.error(e.message);
    return { code: 500, errmsg: 'action is not found' }
  }

};
