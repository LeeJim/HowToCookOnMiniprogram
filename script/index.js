const path = require('path')
const fs = require('fs')
const glob = require('glob')
const {marked} = require('marked')
const MagicString = require('magic-string')
const md5 = require('md5')

const flattenToken = (token) => {
  const { type, tokens, text, href } = token
  switch(type) {
    case 'list':
      const items = token.items.map(item => flattenToken(item))
      return { type, items }
    case 'list_item':
      if (tokens.length == 1 && tokens[0].tokens.length == 1) {
        const final = tokens[0].tokens[0];
        return final.type == 'text' ? text : flattenToken(final);
      }
      if (tokens.length == 1) {
        return flattenToken(tokens[0])
      }
      // console.log(token);
      return tokens.map(item => flattenToken(item))
    case 'row':
      return { type, row: token.rows }
    case 'text':
    case 'paragraph':
      if (!tokens) return text
      if (tokens.length == 1) {
        return tokens[0].type == 'text' ? text : flattenToken(tokens[0])
      }
      return tokens.map(item => flattenToken(item))
    case 'strong':
    case 'codespan':
    case 'em':
      return { type, text }
    case 'html':
      const ans = /<img.+src="([\w\.\/-]+)"/.exec(text)
      if (ans) {
        return { type: 'image', href: ans[1], text: '图片' }
      }
      return ''
    case 'image':
      // todo upload image
      // token.href
      return { type, text, href }
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

glob(path.resolve(__dirname, '../HowToCook/dishes/**/*.md'), {}, (err, files) => {
  if (err) {
    console.log(err)
  }
  const dishes = []
  let no = 0

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

    no++;
    target = null;

    marked.lexer(content, {
      baseUrl: dir,
      xhtml: true
    }).forEach((token) => {
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
          menu.desc.push(flattenToken(token))
        } else {
          const tmp = flattenToken(token)
          target.push(tmp)
        }
      }
    })
    dishes.push(menu)
  }
  
  const jsonData = new MagicString('');
  const s = new MagicString(JSON.stringify(dishes, null, 2))
  dishes.forEach(item => {
    jsonData.append(JSON.stringify(item) + '\n')
  })

  s.prepend('export default ')
  fs.writeFileSync('./miniprogram/data.js', s.toString())
  fs.writeFileSync('./miniprogram/data.json', jsonData.toString())
})