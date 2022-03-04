const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

const groupBy = (arr, identity) => {
  const rect = {}
  arr.forEach(item => {
    const key = item[identity]
    if (!(key in rect)) {
      rect[key] = []
    }
    rect[key].push(item)
  })
  return rect;
}

export default {
  formatTime,
  groupBy
}
