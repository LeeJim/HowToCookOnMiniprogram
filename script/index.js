const path = require('path')
const fs = require('fs')
const glob = require('glob')
const {marked} = require('marked')
const MagicString = require('magic-string')
const md5 = require('md5')
const axios = require('axios')
const FormData = require('form-data');
const cliProgress = require('cli-progress');

const config = require('../config')

const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

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

glob(path.resolve(__dirname, '../HowToCook/dishes/**/*.md'), {}, async (err, files) => {
  if (err) {
    console.log(err)
  }
  const dishes = []
  let no = 0

  bar.start(files.length, 0);
  for(let p of files) {
    const { name, dir } = path.parse(p)
    const [ ,category ] = /dishes\/([\w-]+)\//g.exec(p)
    const content = fs.readFileSync(path.resolve(p), { encoding: 'utf-8'})
    let menu = {
      no,
      id: md5(name),
      name,
      category,
      detail: [],
      desc: []
    }
    const flattenToken = async (token) => {
      const { type, tokens, text, href } = token
      switch(type) {
        case 'list':
          const items = await Promise.all(token.items.map(async item => await flattenToken(item)))
          return { type, items }
        case 'list_item':
          if (tokens.length == 1 && tokens[0].tokens.length == 1) {
            const final = tokens[0].tokens[0];
            return final.type == 'text' ? text : await flattenToken(final);
          }
          if (tokens.length == 1) {
            return await flattenToken(tokens[0])
          }
          // console.log(token);
          return  await Promise.all(tokens.map(async item => await flattenToken(item)))
        case 'row':
          return { type, row: token.rows }
        case 'text':
        case 'paragraph':
          if (!tokens) return text
          if (tokens.length == 1) {
            return tokens[0].type == 'text' ? text : await flattenToken(tokens[0])
          }
          return await  await Promise.all(tokens.map(async item => await flattenToken(item)))
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
          // todo upload image
          // token.href
          const data = await uploadImage(path.resolve(dir, href))
          return { type, text, href: data }
        case 'link':
          return { type, text, href }
        case 'space':
          return ''
        case 'blockquote':
          return text
        default:
          console.log(token) 
      }
      return token
    }

    no++;
    target = null;

    const tokens = marked.lexer(content, {
      baseUrl: dir,
      xhtml: true
    });

    for (let token of tokens) {
      const { text, type, depth } = token;

      if (type == 'heading') {
        if (depth == 1) {
          menu.title = text
        }
        if (depth == 2) {
          const tmp = {
            text,
            content: []
          }
          menu.detail.push(tmp)
          target = tmp.content
          if (text.includes('原料')) {
            tmp.text = '原料和工具'
          }
        }
        if (depth > 2) {
          target.push({ type, text })
        }
      } else if (type !== 'space') {
        if (target == null) {
          menu.desc.push(await flattenToken(token))
        } else {
          const tmp = await flattenToken(token)
          target.push(tmp)
        }
      }
    }
    bar.update(no)
    dishes.push(menu)
  }

  bar.stop()
  
  const jsonData = new MagicString('');
  const s = new MagicString(JSON.stringify(dishes, null, 2))
  dishes.forEach(item => {
    jsonData.append(JSON.stringify(item) + '\n')
  })

  s.prepend('export default ')
  fs.writeFileSync('./miniprogram/data.js', s.toString())
  fs.writeFileSync('./miniprogram/data.json', jsonData.toString())
})