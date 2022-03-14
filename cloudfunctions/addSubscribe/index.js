const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()

exports.main = async (event) => {
  const { FromUserName, CreateTime, MsgType, Event, List } = event
  // 消息订阅
  if (MsgType == 'event' && Event == 'subscribe_msg_popup_event') {
    let list = []
    if (Array.isArray(List)) {
      list = List.filter(item => item.SubscribeStatusString == 'accept')
    } else if (List.SubscribeStatusString == 'accept') {
      list = [List]
    }
    
    if (list.length > 0) {
      const { result } = await db.collection('subscribe').add({
        data: {
          status: 1,
          list,
          creator: FromUserName,
          createTime: CreateTime,
        }
      })
      return result
    }
  }
}
