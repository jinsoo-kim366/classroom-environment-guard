// GET /api/state?t=2026-10-23T15:00 · F-02 고른 시각의 교실 상태
// t가 없으면 가장 마지막 기록을 보여 준다.
// 응답: { found, at, reading, motion15, gapMinutes, range: { first, last } }
const db = require("./_db");

const T = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const minutesBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 60000);

module.exports = async (req, res) => {
  const t = req.query.t;
  if (t && !T.test(t)) return res.status(400).json({ error: "시각은 2026-10-23T15:00 형식으로 보내야 합니다." });

  // 기록의 처음과 끝 (날짜 고르는 칸의 범위로 씀)
  const [{ data: first, error: e1 }, { data: last, error: e2 }] = await Promise.all([
    db.from("readings").select("ts").order("ts", { ascending: true }).limit(1),
    db.from("readings").select("ts").order("ts", { ascending: false }).limit(1),
  ]);
  if (e1 || e2) return res.status(500).json({ error: (e1 || e2).message });
  if (!first.length) return res.json({ found: false, range: null });
  const range = { first: first[0].ts, last: last[0].ts };

  const at = t ? `${t}:00` : range.last;
  // 고른 시각과 그 앞 25분을 가져온다 (가장 가까운 기록 + 그 기록 기준 15분 창)
  const pad = (n) => String(n).padStart(2, "0");
  const str = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
  const fromStr = str(new Date(new Date(at).getTime() - 25 * 60000));

  const { data: rows, error } = await db.from("readings").select("*")
    .gte("ts", fromStr).lte("ts", at).order("ts", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });

  const reading = rows[0];
  // 고른 시각보다 10분 넘게 오래된 기록뿐이면 '기록 없음' (예: 주말 빈 구간)
  if (!reading || minutesBetween(reading.ts, at) > 10) {
    return res.json({ found: false, at, range });
  }
  // 그 기록을 끝으로 하는 15분(기록 4개: 0, 5, 10, 15분 전)의 움직임 합
  const windowStart = str(new Date(new Date(reading.ts).getTime() - 15 * 60000));
  const motion15 = rows.filter((r) => r.ts >= windowStart).reduce((sum, r) => sum + r.motion, 0);
  res.json({ found: true, at, reading, motion15, gapMinutes: minutesBetween(reading.ts, at), range });
};
