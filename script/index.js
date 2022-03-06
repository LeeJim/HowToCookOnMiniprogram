const path = require('path')
const fs = require('fs')
const glob = require('glob')
const {marked} = require('marked')
const MagicString = require('magic-string')
const md5 = require('md5')



glob(path.resolve(__dirname, '../HowToCook/dishes/**/*.md'), {}, (err, files) => {
  if (err) {
    console.log(err)
  }
  const dishes = []
  let no = 0

  for(let p of files) {
    const { name } = path.parse(p)
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

    marked.lexer(content).forEach((token) => {
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
          menu.desc.push({
            text,
            type
          })
        } else {
          const tmp = { type, text }

          if (type === 'list') {
            tmp.items = token.items.map(item => item.text.replaceAll('**', ''))
          }
          if (type == 'table') {
            tmp.rows = token.rows
          }
  
          target.push(tmp)
        }
      }
    })
    dishes.push(menu)
  }
  
  const jsonData = new MagicString('');
  const s = new MagicString(JSON.stringify(dishes))
  dishes.forEach(item => {
    jsonData.append(JSON.stringify(item) + '\n')
  })

  s.prepend('export default ')
  fs.writeFileSync('./miniprogram/data.js', s.toString())
  fs.writeFileSync('./miniprogram/data.json', jsonData.toString())
})