const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()

exports.main = async (event) => {
  const { action, id, type } = event;
  const { OPENID } = cloud.getWXContext();
  const coll = db.collection('cookbook');

  if (!id || !['star', 'like'].includes(type)) {
    return { errno: -1, errmsg: 'Invalid params' };
  }
  // 'star' -> 'starreds', 'like' -> 'likeds' — match getCookbook's field names
  const field = type === 'star' ? 'starreds' : 'likeds';

  let { data: docs } = await coll.where({ id }).get();
  if (!docs.length) {
    await coll.add({ data: { id, [field]: [] } });
    const res = await coll.where({ id }).get();
    docs = res.data;
  }
  const doc = docs[0];
  const items = doc[field] || [];

  if (action === 'status') {
    const active = items.some(item => item.creator === OPENID && !item.isDel);
    const count = items.filter(item => !item.isDel).length;
    return { errno: 0, data: { active, count } };
  }

  if (action === 'toggle') {
    const idx = items.findIndex(item => item.creator === OPENID);

    if (idx !== -1) {
      // Toggle existing
      items[idx] = {
        ...items[idx],
        isDel: !items[idx].isDel,
        updateTime: Date.now(),
      };
    } else {
      // Create new
      items.push({
        creator: OPENID,
        isDel: false,
        updateTime: Date.now(),
      });
    }

    await coll.doc(doc._id).update({ data: { [field]: items } });

    const active = items.some(item => item.creator === OPENID && !item.isDel);
    const count = items.filter(item => !item.isDel).length;
    return { errno: 0, data: { active, count } };
  }

  return { errno: -1, errmsg: 'Unknown action' };
};
