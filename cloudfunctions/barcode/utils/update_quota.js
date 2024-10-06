exports.updateQuota = async (db, openid, type) => {
  const _ = db.command;
  return db.collection('quota').where({ openid, type }).update({
    data: {
      times: _.inc(-1),
      update_time: new Date()
    }
  });
}