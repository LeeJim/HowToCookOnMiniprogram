exports.createQuota = async (db, openid) => {
  return await db.collection('quota').add({
    data: {
      type: 'barcode',
      openid,
      times: 2,
      create_time: new Date(),
      update_time: new Date()
    }
  })
}