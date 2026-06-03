const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()
const _ = db.command

const LEVELS = [
  { name: '初入厨房', icon: '🥚', minStreak: 1 },
  { name: '烹饪学徒', icon: '🍳', minStreak: 7 },
  { name: '掌勺师傅', icon: '🔪', minStreak: 30 },
  { name: '私房大厨', icon: '🧑‍🍳', minStreak: 90 },
  { name: '厨神在世', icon: '👨‍🍳', minStreak: 365 },
];

function getToday() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function computeLevel(streak) {
  let current = LEVELS[0];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (streak >= LEVELS[i].minStreak) {
      current = LEVELS[i];
      break;
    }
  }
  const idx = LEVELS.indexOf(current);
  const next = LEVELS[idx + 1] || null;
  return { ...current, next };
}

exports.main = async (event) => {
  const { action } = event;
  const { OPENID } = cloud.getWXContext();
  const coll = db.collection('checkins');

  try {
    const { data: records } = await coll.where({ _openid: OPENID }).get();
    const record = records[0] || { streak: 0, lastDate: '' };

    if (action === 'status') {
      const level = computeLevel(record.streak || 0);
      const checkedToday = record.lastDate === getToday();
      const streak = record.streak || 0;
      const daysUntilNext = level.next ? level.next.minStreak - streak : 0;
      const progressMax = level.next ? level.next.minStreak : streak || 1;

      return {
        errno: 0,
        data: {
          streak,
          checkedToday,
          level,
          daysUntilNext,
          progress: streak,
          progressMax,
          allLevels: LEVELS,
        }
      };
    }

    if (action === 'checkin') {
      const today = getToday();
      if (record.lastDate === today) {
        const level = computeLevel(record.streak || 0);
        return { errno: 0, data: { alreadyCheckedIn: true, streak: record.streak, level } };
      }

      const yesterday = new Date(Date.now() - 86400000);
      const y = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
      const newStreak = record.lastDate === y ? (record.streak || 0) + 1 : 1;

      if (record._id) {
        await coll.doc(record._id).update({
          data: { streak: newStreak, lastDate: today, updateTime: Date.now() }
        });
      } else {
        await coll.add({
          data: { _openid: OPENID, streak: newStreak, lastDate: today, updateTime: Date.now() }
        });
      }

      const level = computeLevel(newStreak);
      return { errno: 0, data: { streak: newStreak, level } };
    }

    return { errno: -1, errmsg: 'Unknown action' };
  } catch (err) {
    console.error('checkin error:', err);
    return { errno: -1, errmsg: err.message };
  }
};
