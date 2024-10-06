const axios = require('axios');
const cloud = require('wx-server-sdk');

const appcode = '8db126b4c57b4edd8ab8b7355cb3db72';

exports.getBarcode = async (db, barcode, openid) => {
  const res = await axios({
    url: 'https://jisutxmcx.market.alicloudapi.com/barcode2/query',
    headers: {
      'Authorization': 'APPCODE ' + appcode
    },
    params: {
      barcode
    }
  });
  if (res.status === 200) {
    const { data } = res;
    
    if (data.status == 0) {
      const { result } = data;
      const body = {};
      

      const params = { ...result, ...body, rawPic: data.result.pic, creator: openid, create_time: new Date() };
      const save = () => db.collection('barcodes').add({ data: params });
      try {
        const { _id: docid } = await db.collection('barcodes').add({ data: params })
        if (result.pic) {
          await Promise.race([async () => {
            const imgRes = await axios.get(data.result.pic, {
              responseType: 'stream'
            })
            const filenameExtension = data.result.pic.split('.').pop();
            const filename = data.result.barcode + '_' + Date.now() + '.' + filenameExtension;
            const { fileID } = await cloud.uploadFile({
              cloudPath: filename,
              fileContent: imgRes.data
            })
            await db.collection('barcodes').doc(docid).update({
              data: {
                pic: fileID
              }
            })
          }, new Promise((resolve) => setTimeout(resolve, 3000))])
        }
        return params;
      } catch(e) {
        console.error('save qrcode fail', e.message)
        return {}
      }
    } else {
      console.error('get qrcodes fail: ', data.status, '-', data.msg);
      return {}
    }
  }

  return {}
}