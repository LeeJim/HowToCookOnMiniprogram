const cloud = require('wx-server-sdk');

cloud.init({ env: 'restart-9gd2a4k63f58d0c2' })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { action, body, page = 0, size = 10 } = event
  const table = db.collection('sku');
  const _ = db.command;

  if (action === 'get') {
    const { list } = await table.aggregate()
    .match({ creator: OPENID, expiredDate: _.gte(new Date()) })
    .sort({ expiredDate: 1 })
    .skip(page * size)
    .limit(size)
    .lookup({
      from: 'barcodes',
      localField: 'barcode',
      foreignField: 'barcode',
      as: 'standardInfo'
    })
    .unwind({ path: '$standardInfo', preserveNullAndEmptyArrays: true })
    .end();

    return { data: list, code: 0 }
  }

  if (action === 'save') {
    const { barcode, name, manufactureDate, preserveDate, unit, expiredDate, pic } = body;
    const docid = await table.add({
      data: {
        barcode,
        name,
        manufactureDate: new Date(manufactureDate),
        preserveDate,
        unit,
        expiredDate: new Date(expiredDate),
        pic,
        creator: OPENID,
        create_time: new Date(),
        update_time: new Date()
      }
    })
    return { code: 0, errmsg: 0, data: docid }
  }
};
