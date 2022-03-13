const path = require('path')
const fs = require('fs')
const glob = require('glob')
const { marked } = require('marked')
const MagicString = require('magic-string')
const { flattenToken } = require('./helper')

const dest = path.resolve(__dirname, '../miniprogram/pages/learn/data.js')

glob(path.resolve(__dirname, '../HowToCook/tips/**/*.md'), {}, async (err, files) => {
  if (err) console.log(err)
  const ans = []
  let no = 0;
  
  for (let p of files) {
    const { name: title, dir } = path.parse(p)
    const content = fs.readFileSync(path.resolve(p), { encoding: 'utf-8'})
    const tokens = marked.lexer(content);
    const article = {
      no: no++,
      title,
      content: [],
    }

    for (let token of tokens) {
      const { type } = token
      const { content } = article;

      if (type == 'space') continue

      content.push(await flattenToken(token, dir))
    }

    ans.push(article)

    const s = new MagicString(JSON.stringify(ans))
    s.prepend('export default ')

    fs.writeFileSync(dest, s.toString())
  }
})