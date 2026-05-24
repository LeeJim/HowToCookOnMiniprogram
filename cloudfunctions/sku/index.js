const cloud = require('wx-server-sdk');

cloud.init()
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { action, body, page = 0, size = 10 } = event
  const table = db.collection('sku');
  const _ = db.command;

  if (action === 'lookup') {
    const { barcode } = event;
    const { data } = await table
      .where({ creator: OPENID, barcode })
      .orderBy('create_time', 'desc')
      .limit(1)
      .get();
    if (data.length > 0) {
      const item = data[0];
      return {
        code: 0,
        data: {
          preserveDate: item.preserveDate || '',
          unit: item.unit || 'month',
          manufactureDate: item.manufactureDate || '',
        }
      };
    }
    return { code: 0, data: null };
  }

  if (action === 'get') {
    const { list } = await table.aggregate()
    .match({ creator: OPENID })
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
    const data = {
      barcode,
      name,
      preserveDate: preserveDate || '',
      unit: unit || '',
      expiredDate: expiredDate ? new Date(expiredDate) : null,
      pic,
      creator: OPENID,
      create_time: new Date(),
      update_time: new Date()
    };
    if (manufactureDate) {
      data.manufactureDate = new Date(manufactureDate);
    }
    const docid = await table.add({ data })
    return { code: 0, errmsg: 0, data: docid }
  }
};
