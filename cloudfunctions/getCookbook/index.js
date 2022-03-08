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
    const { data } = await db.collection('cookbook').where({ id }).get()
    if (data.length) {
      const [cookbook] = data;
      const { starreds = [], likeds = []} = cookbook;
      const starred = !!starreds && starreds.some(item => item.creator == OPENID && !item.isDel)
      const liked = !!likeds && likeds.some(item => item.creator == OPENID && !item.isDel);

      return {
        errno: 0,
        errmsg: '',
        data: {
          cookbook,
          starreds: starreds.filter(item => !item.isDel).length,
          starred,
          likeds: likeds.filter(item => !item.isDel).length,
          liked,
        }
      }
    }
  }

  const { data } = await db.collection('cookbook').where({
    [`${kind}s`]: _.elemMatch({
      creator: _.eq(OPENID),
      isDel: _.eq(false)
    })
  }).get()
  // }).limit(size).skip(current * size).get()

  return {
    errno: 0,
    errmsg: '',
    data,
  }
}