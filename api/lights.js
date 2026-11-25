// GET /api/lights?d=2026-10-22 · F-03 빈 교실 조명 구간
// 규칙: 조명 켜짐(조도 500 이상) + 움직임 0인 5분 기록이 3개 넘게(15분 이상) 이어진 구간
// 응답: { date, rows, litMinutes, wasteMinutes, periods: [{ start, end, minutes }] }
const db = require("./_db");
const { addMin } = require("./_time");

const LIGHT_ON = 500;
const MIN_STREAK = 3; // 5분 기록 3개 = 15분

module.exports = async (req, res) => {
  const d = req.query.d;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d || "")) return res.status(400).json({ error: "날짜는 2026-10-22 형식으로 보내야 합니다." });

  const { data: rows, error } = await db.from("readings").select("ts, light, motion")
    .gte("ts", `${d}T00:00:00`).lte("ts", `${d}T23:59:59`).order("ts", { ascending: true });
  if (error) return res.status(500).json({ error: error.message });

  const periods = [];
  let run = [];
  const close = () => {
    if (run.length >= MIN_STREAK) {
      periods.push({ start: run[0].ts, end: addMin(run.at(-1).ts, 5), minutes: run.length * 5 });
    }
    run = [];
  };
  for (const r of rows) {
    const empty = r.light >= LIGHT_ON && r.motion === 0;
    const continues = run.length && addMin(run.at(-1).ts, 5) === r.ts; // 빈 시간이 끼면 끊는다
    if (empty && (continues || !run.length)) run.push(r);
    else { close(); if (empty) run.push(r); }
  }
  close();

  res.json({
    date: d,
    rows: rows.length,
    litMinutes: rows.filter((r) => r.light >= LIGHT_ON).length * 5,
    wasteMinutes: periods.reduce((s, p) => s + p.minutes, 0),
    periods,
  });
};
