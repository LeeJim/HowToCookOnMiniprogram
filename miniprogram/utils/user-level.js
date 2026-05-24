export const LEVELS = [
  { name: '初入厨房', icon: '🥚', minStreak: 1 },
  { name: '烹饪学徒', icon: '🍳', minStreak: 7 },
  { name: '掌勺师傅', icon: '🔪', minStreak: 30 },
  { name: '私房大厨', icon: '🧑‍🍳', minStreak: 90 },
  { name: '厨神在世', icon: '👨‍🍳', minStreak: 365 },
];

export async function checkIn() {
  const { result } = await wx.cloud.callFunction({
    name: 'checkin',
    data: { action: 'checkin' },
  });
  return result.data;
}

export async function getCheckInStatus() {
  const { result } = await wx.cloud.callFunction({
    name: 'checkin',
    data: { action: 'status' },
  });
  return result.data;
}
