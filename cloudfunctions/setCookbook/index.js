const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command


// 云函数入口函数
exports.main = async (event) => {
  const { id, type } = event
  const { OPENID } = cloud.getWXContext()
  const kind = `${type}s`;
  
  const { data } = await db.collection('cookbook').where({
    id
  }).limit(1).get()
  const addToSet = async () => {
    const { stats } = await db.collection('cookbook').where({
      id
    }).update({
      data: {
        [`${type}s`]: _.addToSet({
          creator: OPENID,
          createTime: new Date(),
          updateTime: new Date(),
          isDel: false
        })
      }
    })
    return {
      errno: 0,
      errmsg: '',
      data: {
        [type]: stats.updated ? true : false
      }
    }
  }

  if (data.length) {
    const [ cookbook ] = data;
    if (cookbook[kind]) {
      const target = cookbook[kind].find(item => item.creator == OPENID)
      if (target) {
        target.isDel = !target.isDel
        target.updateTime = new Date()
        await db.collection('cookbook').doc(cookbook._id).update({ data: {
          [kind]: cookbook[kind]
        } })
        return {
          errno: 0,
          errmsg: '',
          data: {
            [type]: !target.isDel
          }
        }
      } else {
        return await addToSet()
      }
    } else {
      return await addToSet()
    }
  }
  
  return res
}