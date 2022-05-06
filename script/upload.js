const fs = require('fs');
const COS = require('cos-nodejs-sdk-v5')
const FormData = require('form-data');
const axios = require('axios')
const md5File = require('md5-file')
const path = require('path')

const config = require('../config')

const cos = new COS({
  SecretId: config.cos.secretId,
  SecretKey: config.cos.secretKey
});

let accessToken = ''
const getAccessToken = async() => {
  if (accessToken) return accessToken

  const { data } = await axios.get('https://api.weixin.qq.com/cgi-bin/token', {
    params: {
      grant_type: 'client_credential',
      appid: config.appid,
      secret: config.secret
    }
  })
  if (data.access_token) {
    accessToken = data.access_token
    return accessToken
  }
  throw new TypeError(data)
}

const uploadWxCloud = async(filePath) => {
  const cloudPath = 'cookbook'
  const token = await getAccessToken()
  const url = 'https://api.weixin.qq.com/tcb/uploadfile?access_token=' + token
  const { data } = await axios.post(url, {
    env: config.cloudEnvId,
    path: cloudPath
  })
  if (data.errcode == 0) {
    const { url, token, authorization, file_id, cos_file_id} = data;
    const form = new FormData()

    form.append('key', authorization);
    form.append('Signature', authorization);
    form.append('x-cos-security-token', token);
    form.append('x-cos-meta-fileid', cos_file_id);
    form.append('file', fs.createReadStream(filePath));

    return new Promise((resolve, reject) => {
      form.submit(url, (err) => {
        if (err) reject(err)
        resolve(file_id.replace(cloudPath, '') + authorization)
      })
    })
  } else {
    throw new TypeError(data.errmsg)
  }
}

const uploadImage = async (filePath) => {
  const body = fs.createReadStream(filePath);
  const key = md5File.sync(filePath);

  return new Promise((resolve, reject) => {
    cos.putObject({
      Bucket: 'how-to-cook-1255404841',
      Region: 'ap-shanghai',
      Key: key,
      Body: body
    }, (err, data) => {
      if (err) reject(err)
      resolve('https://' + data.Location)
    })
  })
}

module.exports.uploadWxCloud = uploadWxCloud;
module.exports.uploadImage = uploadImage;