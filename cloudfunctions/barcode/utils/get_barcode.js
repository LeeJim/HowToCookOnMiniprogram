const axios = require('axios');
const CryptoJS = require('crypto-js');
const cloud = require('wx-server-sdk');

cloud.init()

const SECRET_ID = 'V9PgSHCOrwi8Eil7';
const SECRET_KEY = '6b8XMzqDu5IEt0gsUweBgu0xcUmn8nHw';
const API_URL = 'https://ap-shanghai.cloudmarket-apigw.com/service-32z6n3ab/chkBarCode';

function randomUUID() {
  const hex = '0123456789abcdef';
  let uuid = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) uuid += '-';
    else if (i === 14) uuid += '4';
    else if (i === 19) uuid += hex[(Math.floor(Math.random() * 4) + 8)];
    else uuid += hex[Math.floor(Math.random() * 16)];
  }
  return uuid;
}

function signRequest() {
  const datetime = new Date().toGMTString();
  const uuid = randomUUID();
  const signStr = 'x-date: ' + datetime;
  const sign = CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA1(signStr, SECRET_KEY));
  const auth = '{"id": "' + SECRET_ID + '", "x-date": "' + datetime + '", "signature": "' + sign + '"}';
  return { datetime, uuid, auth };
}

function mapResponse(body) {
  const b = body.showapi_res_body;
  return {
    barcode: b.code || '',
    name: b.goodsName || '',
    brand: b.trademark || '',
    company: b.manuName || '',
    type: b.spec || '',
    origincountry: b.ycg || '',
    description: b.goodsType || '',
    netcontent: b.note || '',
    packagetype: '',
    pic: b.img || b.sptmImg || '',
  };
}

async function uploadImage(imageUrl, barcode) {
  if (!imageUrl || !imageUrl.startsWith('http')) return imageUrl;
  try {
    const res = await axios({
      url: imageUrl,
      responseType: 'arraybuffer',
      timeout: 8000,
    });
    const ext = (imageUrl.split('.').pop() || 'jpg').split('?')[0];
    const cloudPath = `barcodes/${barcode}_${Date.now()}.${ext}`;
    const { fileID } = await cloud.uploadFile({
      cloudPath,
      fileContent: Buffer.from(res.data),
    });
    return fileID;
  } catch (e) {
    console.error('upload image fail:', e.message);
    return imageUrl; // fallback to original URL
  }
}

exports.uploadImage = uploadImage;

exports.getBarcode = async (db, barcode, openid) => {
  // Check DB first
  const { data: existing } = await db.collection('barcodes')
    .where({ barcode })
    .limit(1)
    .get();

  if (existing.length > 0) {
    const doc = existing[0];
    // 兼容旧数据：HTTP 图片转存到云存储
    if (doc.pic && doc.pic.startsWith('http')) {
      const fileID = await uploadImage(doc.pic, barcode);
      if (fileID && fileID.startsWith('cloud://')) {
        await db.collection('barcodes').doc(doc._id).update({ data: { pic: fileID } });
        doc.pic = fileID;
      }
    }
    return doc;
  }

  // Fetch from API
  const { uuid, auth } = signRequest();
  const url = API_URL + '?code=' + encodeURIComponent(barcode);

  const res = await axios({
    url,
    timeout: 5000,
    headers: {
      'request-id': uuid,
      'Authorization': auth,
    }
  });

  if (res.status === 200 && res.data) {
    const body = res.data;
    if (body.showapi_res_code === 0 && body.showapi_res_body) {
      const mapped = mapResponse(body);

      // Upload image to cloud storage (WeChat blocks HTTP images)
      if (mapped.pic) {
        mapped.pic = await uploadImage(mapped.pic, barcode);
      }

      await db.collection('barcodes').add({
        data: {
          ...mapped,
          creator: openid,
          create_time: new Date(),
        }
      });
      return mapped;
    }
    throw new Error(body.showapi_res_error || 'Barcode not found');
  }

  throw new Error('Barcode API error: ' + res.status);
}