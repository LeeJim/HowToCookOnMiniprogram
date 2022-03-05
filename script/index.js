const path = require('path')
const fs = require('fs')
const glob = require('glob')
const {marked} = require('marked')
const MagicString = require('magic-string')



glob(path.resolve(__dirname, '../HowToCook/dishes/**/*.md'), {}, (err, files) => {
  if (err) {
    console.log(err)
  }
  const dishes = []
  let id = 0

  for(let p of files) {
    const { name } = path.parse(p)
    const [ ,category ] = /dishes\/([\w-]+)\//g.exec(p)
    const content = fs.readFileSync(path.resolve(p), { encoding: 'utf-8'})
    let detail = {
      id,
      name,
      category,
      child: []
    }
    let objectPath = [detail]

    id++;
    target = detail
    marked.lexer(content).forEach((token) => {
      if (token.type == 'heading') {
        const rect = {
          type: token.type,
          value: token.text,
          child: [],
        }
        let i = 1
        do {
          target = objectPath[token.depth - i++] // 原本是 token.depth - 1，但标题有可能跨级
        } while (!target)

        objectPath[token.depth] = rect
        target.child.push(rect)
        
        target = rect
      } else if (token.type !== 'space') {
        let value = token.text
        if (token.type === 'list') {
          value = token.items.map(item => item.text.replaceAll('**', ''))
        }
        if (token.type == 'table') {
          value = token.rows
        }

        target.child.push({
          value,
          type: token.type,
        })
      }
    })
    dishes.push(detail)
  }
  
  const s = new MagicString(JSON.stringify({ dishes }))
  s.prepend('export default ')
  // s.append('}')
  fs.writeFileSync('./miniprogram/data.js', s.toString())
})