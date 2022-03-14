// 云函数入口文件
const cloud = require('wx-server-sdk')
const dayjs = require('dayjs')

cloud.init()
const db = cloud.database()
const _ = db.command

const SIZE = 100

async function sendSubscribeMessage({ openid, templateId, version, content }) {
  // const { OPENID } = cloud.getWXContext()

  // const openid = 'oSi0i0YrRzAordKlIp5RXymrIxNk'
  // const templateId = 'vjEDlUYrVJ05CauSw_V9jIWF-okt3OMCBtlz9yvjrfg'
  // const version = 'v1.0.0'
  const time = dayjs().format('YYYY年M月D日 HH:mm')
  // const content = '支持学习模块'

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

const setSubscriber = async ({ openid, templateId }) => {
  const { stats } = await db.collection('subscribe')
    .where({
      creator: openid,
      list: {
        TemplateId: templateId,
        status: _.neq(0)
      }
    })
    .limit(1)
    .update({
      // data: todo set status = 0
    })
  return stats.updated == 1
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

  do {
    subscribers = await getSubscriber(count, condtion)
    count += subscribers.length
    // todo subscribers 去重
    for (let item of subscribers) {
      const { creator: openid } = item;
      const hasSent = await sendSubscribeMessage({
        openid, 
        templateId,
        content, 
        version
      })
      if (hasSent) {
        const done = await setSubscriber({ openid, templateId })
        if (done) {
          finish++
        }
      }
    }
  } while (subscribers.length == SIZE)

  return {
    count,
    finish
  }
}
