const path = require('path')
const fs = require('fs')
const axios = require('axios')
const FormData = require('form-data')

const config = require('../config')

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

const uploadImage = async (filePath) => {
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

const flattenToken = async (token, dir) => {
  const flatten = async (token) => {
    const { type, tokens, text, href, depth } = token
    switch(type) {
      case 'heading':
        return { type, text, depth }
      case 'list':
        const items = await Promise.all(token.items.map(async item => await flatten(item)))
        return { type, items }
      case 'list_item':
        if (tokens.length == 1 && tokens[0].tokens.length == 1) {
          const final = tokens[0].tokens[0];
          return final.type == 'text' ? text : await flatten(final);
        }
        if (tokens.length == 1) {
          return await flatten(tokens[0])
        }
        // console.log(token);
        return  await Promise.all(tokens.map(async item => await flatten(item)))
      case 'row':
        return { type, row: token.rows }
      case 'text':
      case 'paragraph':
        if (!tokens) return text
        if (tokens.length == 1) {
          return tokens[0].type == 'text' ? text : await flatten(tokens[0])
        }
        return await  await Promise.all(tokens.map(async item => await flatten(item)))
      case 'strong':
      case 'codespan':
      case 'em':
        return { type, text }
      case 'html':
        const ans = /<img.+src="([\w\.\/-]+)"/.exec(text)
        if (ans) {
          const data = await uploadImage(path.resolve(dir, ans[1]))
          return { type: 'image', href: data, text: '图片' }
        }
        return ''
      case 'image':
        const data = await uploadImage(path.resolve(dir, href))
        return { type, text, href: data }
      case 'link':
        if (href.startsWith('http')) {
          return { type, text, href }
        }
        return { type: 'page', text, href }
      case 'space':
        return ''
      case 'code':
      case 'blockquote':
        return { type, text }
      default:
        console.log(token) 
    }
    return token
  }
  return await flatten(token)
}

module.exports = {
 getAccessToken,
 flattenToken,
 uploadImage,
}