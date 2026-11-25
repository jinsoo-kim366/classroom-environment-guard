// 시각 문자열 도우미. DB의 ts는 시간대 없는 교실 현지 시각("2026-10-23T15:00:00")이다.
const pad = (n) => String(n).padStart(2, "0");
const toStr = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
const addMin = (ts, m) => toStr(new Date(new Date(ts).getTime() + m * 60000));
module.exports = { toStr, addMin };
