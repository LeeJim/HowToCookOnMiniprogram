const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command
const collection = db.collection('cookbook')

// 云函数入口函数
exports.main = async (event) => {
  const { id, type } = event
  const { OPENID } = cloud.getWXContext()
  const kind = `${type}s`;
  
  const { data } = await collection.where({ id }).get()
  const addToSet = async (cookbook) => {
    const { stats } = await collection.where({
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
        [type]: stats.updated ? true : false,
        likeds: type == 'liked' ? 1 : (cookbook.likeds ? cookbook.likeds.filter(item => !item.isDel).length : 0)
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
        await collection.doc(cookbook._id).update({ data: {
          [kind]: cookbook[kind]
        } })
        const likeds = cookbook.likeds ? cookbook.likeds.filter(item => !item.isDel).length : 0;
        
        return {
          errno: 0,
          errmsg: '',
          data: {
            [type]: !target.isDel,
            likeds
          }
        }
      } else {
        return await addToSet(cookbook)
      }
    } else {
      return await addToSet(cookbook)
    }
  }
  
  return null
}