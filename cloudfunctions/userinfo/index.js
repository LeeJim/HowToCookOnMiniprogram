const cloud = require('wx-server-sdk');

cloud.init()
const db = cloud.database()

exports.main = async (event) => {
    const { OPENID } = cloud.getWXContext()
    const { action, body } = event
    const table = db.collection('userinfo');

    try {
        if (action === 'get') {
            const { data } = await table.where({ openid: OPENID }).get();
            const userinfo = data[0] || null;
            return {
                code: 0,
                message: '获取成功',
                data: userinfo,
            }
        }
        if (action === 'update') {
            const { avatarUrl, nickName, nickname } = body || {};
            const name = nickName || nickname || '';
            const updateData = { update_time: new Date() };
            if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
            if (name) updateData.nickName = name;

            const { data } = await table.where({ openid: OPENID }).get();
            const userinfo = data[0];

            if (!userinfo) {
                await table.add({
                    data: {
                        avatarUrl: avatarUrl || '',
                        nickName: name,
                        openid: OPENID,
                        create_time: new Date(),
                        update_time: new Date(),
                    }
                })
            } else {
                await table.doc(userinfo._id).update({ data: updateData })
            }
            return {
                code: 0,
                message: '更新成功',
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