const cloud = require('wx-server-sdk');

cloud.init({ env: 'restart-9gd2a4k63f58d0c2' })
const db = cloud.database()

exports.main = async (event) => {
    const { OPENID } = cloud.getWXContext()
    const { action, body } = event
    const table = db.collection('userinfo');

    try {
        if (action === 'get') {
            const { data: [userinfo] } = await table.where({ openid: OPENID }).get();
            return {
                code: 0,
                message: '获取成功',
                data: userinfo,
            }
        }
        if (action === 'update') {
            const { avatarUrl, nickName } = body;

            const { data: [userinfo] } = await table.where({ openid: OPENID }).get();
            if (!userinfo) {
                await table.add({
                    data: {
                        avatarUrl,
                        nickName,
                        openid: OPENID,
                        create_time: new Date(),
                        update_time: new Date(),
                    }
                })
            } else {
                await table.where({ openid: OPENID }).update({
                    data: {
                        avatarUrl,
                        nickName,
                        update_time: new Date(),
                    }
                })
            }
            return {
                code: 0,
                message: '更新成功',
                data: userinfo,
            }
        }
    }
    catch (e) {
        return {
            code: 500,
            message: e.message,
        }
    }
}