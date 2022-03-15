// 云函数入口文件
const cloud = require('wx-server-sdk')
const dayjs = require('dayjs')

cloud.init()
const db = cloud.database()
const _ = db.command

const SIZE = 100 // 分片读数据的大小
const MAX = 1 // 限制发送人数

const sendSubscribeMessage = async ({ openid, templateId, version, content }) => {
  const time = dayjs().format('YYYY年M月D日 HH:mm')

  const sendResult = await cloud.openapi.subscribeMessage.send({
    touser: openid,
    templateId,
    page: '/pages/index/index',
    data: {
      character_string1: {
        value: version,
      },
      time2: {
        value: time,
      },
      thing3: {
        value: content,
      },
    }
  })

  if (sendResult.errCode != 0) {
    console.log(sendResult.errMsg)
  }

  return sendResult.errCode == 0
}

const getSubscriber = async (skip, condtion) => {
  const { data } = await db.collection('subscribe')
    .where({
      list: {
        ...condtion,
        status: _.neq(0)
      }
    })
    .skip(skip)
    .limit(SIZE)
    .get()

  return data
}

const setSubscriber = async (item, templateId) => {
  const { list } = item;
  const target = list.find(item => item.TemplateId == templateId)

  if (target) {
    target.status = 0
    const { stats } = await db.collection('subscribe').doc(item._id)
      .update({
        data: {
          list
        }
      })
    return stats.updated == 1
  }
  return false
}

// 云函数入口函数
// eslint-disable-next-line
exports.main = async (event) => {
  let { version, content, templateId } = event;
  let subscribers = []
  let count = 0
  const condtion = {
    TemplateId:  templateId
  }
  let finish = 0
  let uniqueIds = new Set()
  const afterFinish = () => {
    // 保存发送记录
    db.collection('subscribe_send_log').add({
      data: {
        creatTime: new Date(),
        member: Array.from(uniqueIds),
        templateId,
        version,
        content
      }
    })
    return { count, finish, uniqueIds }
  }

  do {
    subscribers = await getSubscriber(count, condtion)
    count += subscribers.length
    for (let item of subscribers) {
      const { creator: openid } = item;
      if (uniqueIds.has(openid)) continue // subscribers 去重
      uniqueIds.add(openid)
      const hasSent = await sendSubscribeMessage({
        openid, 
        templateId,
        content, 
        version
      })
      if (hasSent) {
        const done = await setSubscriber(item, templateId)
        if (done) {
          finish++
        }
      }
      if (finish >= MAX) return afterFinish() // 此处使用 break 的话，第一次 do 未进循环，无法中断；
    }
  } while (subscribers.length == SIZE)

  return afterFinish()
}
