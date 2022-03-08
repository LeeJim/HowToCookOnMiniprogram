const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event) => {
  const { id, kind = 'star', current = 0 } = event
  const { OPENID } = cloud.getWXContext()
  const size = 10

  if (id) {
    const { data } = await db.collection('cookbook').where({ id }).limit(1).get()
    if (data.length) {
      const [cookbook] = data;
      return {
        errno: 0,
        errmsg: '',
        data: {
          cookbook,
          starred: !!cookbook.starreds && cookbook.starreds.some(item => item.creator == OPENID && !item.isDel),
          liked: !!cookbook.likeds && cookbook.likeds.some(item => item.creator == OPENID && !item.isDel),
        }
      }
    }
  }

  const { data } = await db.collection('cookbook').where({
    [`${kind}s`]: {
      creator: _.eq(OPENID)
    }
  }).limit(size).skip(current * size).get()

  return {
    errno: 0,
    errmsg: '',
    data: data[0]
  }
}