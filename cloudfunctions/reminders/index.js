
const cloud = require('wx-server-sdk')
const dayjs = require('dayjs')

// cloud.init({
//   env: cloud.default,
// })
cloud.init()
const db = cloud.database()

exports.main = async (event, context) => {
  const { total } = await db.collection('userinfo').count();

  let i = 0;
  while (i < total) {
    const _ = db.command;
    const { data: [user] } = await db.collection('userinfo').skip(i++).limit(1).get();
    const { data: skus } = await db.collection('sku').where({
      creator: user.openid,
      expiredDate: _.lte(dayjs().add(7, 'day').toDate())
    }).get();
    if (skus.length === 0) {
      continue;
    }

    const name = skus.length === 1 ? skus[0].name : `${skus.length}个商品`
    const minExpiredDate = skus.reduce((min, sku) => 
      dayjs(sku.expiredDate).isBefore(min) ? dayjs(sku.expiredDate) : min, 
      dayjs(skus[0].expiredDate)
    ).format('YYYY.MM.D')
    const days = dayjs(minExpiredDate).diff(dayjs(), 'day')

    try {
      const result = await cloud.openapi.subscribeMessage.send({
          "touser": user.openid,
          "page": 'pages/stock-list/index',
          "lang": 'zh_CN',
          "data": {
            "thing1": {
              "value": name // 物品名称
            },
            "date2": {
              "value": minExpiredDate // 到期日期
            },
            "phrase3": {
              "value": '食品' // 物品类型
            },
            "number5": {
              "value": days + 1 // 剩余天数
            }
          },
          "templateId": 'l5caNms6dSAey7__z4JkECg4mTUSro_4aA6tyyRXZxA',
          "miniprogramState": 'developer'
        })
      console.log(result)
    } catch (err) {
      console.error(err)
    }
    console.log(user);
  }
} 

