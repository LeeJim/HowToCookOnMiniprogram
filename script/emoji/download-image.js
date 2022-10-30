const path = require('path')
const fs = require('fs')
const axios = require('axios')
var tunnel = require('tunnel');
 
var tunnelingAgent = tunnel.httpsOverHttp({
  proxy: {
    host: '127.0.0.1',
    port: 7890
  }
});

const emojiData = require('./data.json');
const { knownSupportedEmoji } = require('../../miniprogram/pages/kitchen/supported.js')
const fix = (str) => str.split("-")
.filter(x => x !== "fe0f")
.join("_")
let counter = 0;
let retry = [];
let skipped = 0;

const download = async (url, filename) => {
  const _path = path.resolve(__dirname, '../../assets/emoji/', filename);
  const lastIndex = filename.lastIndexOf('/')

  if (fs.existsSync(_path)) {
    const stat = fs.statSync(_path);
    
    if (stat.size > 0) {
      console.log(++skipped, ' skipped');
      return;
    }
  }
      
  if (lastIndex > -1) {
    fs.mkdirSync(path.resolve(__dirname, '../../assets/emoji/' + filename.slice(0, lastIndex)), { recursive: true })
  }
  const writer = fs.createWriteStream(_path);
  try {
    const res = await axios.request({
      url,
      httpsAgent: tunnelingAgent,
      proxy: false,
      timeout: 5000,
      responseType: 'stream'
    })
    res.data.pipe(writer)
    counter++;
    console.log(counter, 'has finished');
  } catch(e) {
    console.log(url, e.message);
    retry.push({ url, filename})
  }
}

const main = async () => {
  for(let emoji of knownSupportedEmoji) {
    const name = `emoji_u${fix(emoji)}.svg`;
    const url = `https://raw.githubusercontent.com/googlefonts/noto-emoji/main/svg/${name}`;
    console.log(url);
    await download(url, name);
    
    // if (emoji in emojiData) {
    //   for (let combo of emojiData[emoji]) {
    //     const { date, leftEmoji, rightEmoji } = combo;
    //     const name = `${date}/u${fix(leftEmoji)}/u${fix(leftEmoji)}_u${fix(rightEmoji)}.png`;
    //     const comboUrl = `https://www.gstatic.com/android/keyboard/emojikitchen/${name}`
    //     await download(comboUrl, name)
    //   }
    // }
    console.log(emoji, 'has downloaded');
  }
}

fs.writeFileSync('./retry.json', JSON.stringify({ retry }));

main()
