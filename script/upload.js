const fs = require('fs');
const crypto = require('crypto');
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
let accessTokenExpiry = 0

const getAccessToken = async() => {
  // Reuse token if not expired (with 5min buffer)
  if (accessToken && Date.now() < accessTokenExpiry) {
    return accessToken
  }

  const { data } = await axios.get('https://api.weixin.qq.com/cgi-bin/token', {
    params: {
      grant_type: 'client_credential',
      appid: config.appid,
      secret: config.secret
    }
  })
  if (data.access_token) {
    accessToken = data.access_token
    // Token expires in 7200 seconds, refresh with 5 min buffer
    accessTokenExpiry = Date.now() + (data.expires_in - 300) * 1000
    return accessToken
  }
  throw new Error(`Failed to get access_token: ${JSON.stringify(data)}`)
}

/**
 * Upload file to WeChat Cloud Storage (云开发存储)
 * @param {string} filePath - absolute path to the local file
 * @returns {Promise<string>} - cloud file ID (e.g., cloud://env-id.xxx/path/file.jpg)
 */
const uploadWxCloud = async(filePath) => {
  const ext = path.extname(filePath);
  const hash = crypto.createHash('md5').update(fs.readFileSync(filePath)).digest('hex');
  const cloudPath = `cookbook/${hash}${ext}`;

  const token = await getAccessToken();
  const apiUrl = 'https://api.weixin.qq.com/tcb/uploadfile?access_token=' + token;

  // Step 1: Get upload credentials
  const { data } = await axios.post(apiUrl, {
    env: config.cloudEnvId,
    path: cloudPath
  });

  if (data.errcode !== 0) {
    throw new Error(`Failed to get upload credentials: ${data.errmsg || JSON.stringify(data)}`);
  }

  const { url, token: cosToken, authorization, file_id, cos_file_id } = data;

  // Step 2: Upload file to COS
  const form = new FormData();
  form.append('key', cloudPath);
  form.append('Signature', authorization);
  form.append('x-cos-security-token', cosToken);
  form.append('x-cos-meta-fileid', cos_file_id);
  form.append('file', fs.createReadStream(filePath));

  return new Promise((resolve, reject) => {
    const request = form.submit(url, (err, res) => {
      if (err) {
        reject(err);
        return;
      }

      // Check HTTP status code
      if (res.statusCode >= 400) {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => reject(new Error(`Upload failed with status ${res.statusCode}: ${body}`)));
        res.resume();
        return;
      }

      // Consume response data to free up memory
      res.resume();

      // Return the cloud file ID
      // This can be used with wx.cloud.downloadFile() or wx.cloud.getTempFileURL() in mini program
      resolve(file_id);
    });

    // Handle request-level errors
    request.on('error', reject);
  });
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
module.exports.getAccessToken = getAccessToken;