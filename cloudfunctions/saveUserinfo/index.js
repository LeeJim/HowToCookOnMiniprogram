const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()

// 云函数入口函数
exports.main = async (event) => {
  const { OPENID: openid } = cloud.getWXContext()
  const table = db.collection('user_info')

  const { data } = await table.where({ openid }).get()

  if (data.length > 0) return { errno: 0, errmsg: 'duplicated user' }

  await table.add({
    data: {
      ...event,
      openid,
      createTime: new Date()
    }
  })

  return { errno: 0, errmsg: 'ok' }
}