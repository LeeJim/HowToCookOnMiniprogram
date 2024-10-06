const cloud = require('wx-server-sdk');
const { createQuota } = require('./utils/create_quota');
const { getBarcode } = require('./utils/get_barcode');
const { updateQuota } = require('./utils/update_quota');

cloud.init({ env: 'restart-9gd2a4k63f58d0c2' })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { barcode, action, quotaType = 'barcode' } = event

  if (action === 'get') {
    const { list } = await db.collection('barcodes').aggregate()
    .lookup({
      from: 'userinfo',
      localField: 'creator',
      foreignField: 'openid',
      as: 'userinfo'
    })
    .match({
      barcode
    })
    .unwind({ path: '$userinfo', preserveNullAndEmptyArrays: true })
    .end()
  
    if (list.length > 0) {
      return { code: 0, data: list[0] }
    }
    return { code: 404, data: [] }
  }

  if (action === 'fetch') {
    const { data: [userinfo] } = await db.collection('userinfo').where({ openid: OPENID }).get();
    if (!userinfo) {
      return { code: 403, errmsg: 'userinfo is empty' }
    }
    const quotaRes = await db.collection('quota').where({ openid: OPENID, type: quotaType }).get()
  
    if (quotaRes.data.length > 0) {
      const [quota] = quotaRes.data;
      if (quota.times > 0) {
        try {
          const data = await getBarcode(db, barcode, OPENID);
          await updateQuota(db, OPENID, quotaType);
          return { code: 0, data: { ...data, userinfo } };
        } catch(e) {
          console.error('save barcode fail: ', e.message);
          return { code: 404, errmsg: 'can not get the barcode' }
        }
      }
      return { code: 403, errmsg: 'quota is empty' }
    }
  
    try {
      await createQuota(db, OPENID);
      const data = await getBarcode(db, barcode, OPENID);
      return { code: 0, data: { ...data, userinfo } };
    } catch(e) {
      console.error('save barcode fail: ', e.message);
      return { code: 500, errmsg: e.message}
    }
  }

  return { code: 500, errmsg: 'unknown' }

  // if (MsgType == 'event' && Event == 'subscribe_msg_popup_event') {
  //   let list = []
  //   if (Array.isArray(List)) {
  //     list = List.filter(item => item.SubscribeStatusString == 'accept')
  //   } else if (List.SubscribeStatusString == 'accept') {
  //     list = [List]
  //   }
    
  //   if (list.length > 0) {
  //     const { result } = await db.collection('subscribe').add({
  //       data: {
  //         status: 1,
  //         list,
  //         creator: FromUserName,
  //         createTime: CreateTime,
  //       }
  //     })
  //     return result
  //   }
  // }
}
