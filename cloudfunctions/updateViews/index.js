const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const _ = db.command
const collection = db.collection('cookbook_views')

// 云函数入口函数
exports.main = async (event) => {
  const { id } = event;
  const { stats } = await collection.where({ id }).update({
    data: {
      views: _.inc(1)
    }
  })
  if (stats.updated !== 1) {
    await collection.add({
      data: {
        id,
        createTime: new Date(),
        views: 1
      }
    })
  }
}
