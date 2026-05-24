const cloud = require('wx-server-sdk');
const { createQuota } = require('./utils/create_quota');
const { getBarcode, uploadImage } = require('./utils/get_barcode');
const { updateQuota } = require('./utils/update_quota');

cloud.init()
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { barcode, action, quotaType = 'barcode' } = event

  if (action === 'fixImage') {
    const { data: docs } = await db.collection('barcodes').where({ barcode }).get();
    if (!docs.length) return { code: 404, errmsg: 'Barcode not found' };

    const doc = docs[0];
    if (!doc.pic || !doc.pic.startsWith('http')) {
      return { code: 0, data: { pic: doc.pic } }; // Already cloud URL
    }

    try {
      const fileID = await uploadImage(doc.pic, barcode);
      await db.collection('barcodes').doc(doc._id).update({ data: { pic: fileID } });
      return { code: 0, data: { pic: fileID } };
    } catch (e) {
      console.error('fixImage fail:', e.message);
      return { code: 500, errmsg: e.message };
    }
  }

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

    // 用户保存过该条码的商品 → 免费获取
    const { data: savedSkus } = await db.collection('sku')
      .where({ creator: OPENID, barcode })
      .limit(1)
      .get();
    if (savedSkus.length > 0) {
      try {
        const data = await getBarcode(db, barcode, OPENID);
        return { code: 0, data: { ...data, userinfo } };
      } catch (e) {
        return { code: 404, errmsg: 'can not get the barcode' }
      }
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
