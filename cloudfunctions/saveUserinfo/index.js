const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID: openid } = cloud.getWXContext()
  const table = db.collection('user_info')
  const { data } = await table.where({ openid }).get()

  if (data.length > 0) {
    // Update existing
    await table.doc(data[0]._id).update({
      data: { ...event, updateTime: Date.now() }
    })
  } else {
    // Create new
    await table.add({
      data: { ...event, openid, createTime: Date.now() }
    })
  }

  return { errno: 0, errmsg: 'ok' }
}