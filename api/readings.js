// POST /api/readings · F-01 측정 기록 올리기
// 요청: { rows: [{ ts, light, motion, dust_mv, temp_c, humid_pct, press_hpa }, ...] }
// 응답: { saved, rejected, rejectedExamples }
const db = require("./_db");

// 센서가 낼 수 있는 값의 범위. 이 밖의 값이 든 줄은 저장하지 않는다.
const RANGE = {
  light: [0, 1023],
  motion: [0, 1000],
  dust_mv: [0, 5000],
  temp_c: [-10, 50],
  humid_pct: [0, 100],
  press_hpa: [900, 1100],
};
const TS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00$/;

function problem(row) {
  if (!TS.test(row.ts)) return "시각 형식이 다름";
  for (const [key, [lo, hi]] of Object.entries(RANGE)) {
    const v = row[key];
    if (typeof v !== "number" || !Number.isFinite(v)) return `${key} 값 없음`;
    if (v < lo || v > hi) return `${key} = ${v} (범위 ${lo}~${hi} 밖)`;
  }
  return null;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST로만 보낼 수 있습니다." });

  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
  if (rows.length === 0) return res.status(400).json({ error: "보낸 줄이 없습니다." });
  if (rows.length > 5000) return res.status(400).json({ error: "한 번에 5,000줄까지 올릴 수 있습니다." });

  const good = [];
  const bad = [];
  for (const r of rows) {
    const why = problem(r);
    if (why) bad.push({ ts: r.ts, why });
    else good.push({
      ts: r.ts, light: Math.round(r.light), motion: Math.round(r.motion), dust_mv: Math.round(r.dust_mv),
      temp_c: r.temp_c, humid_pct: r.humid_pct, press_hpa: r.press_hpa,
    });
  }

  if (good.length > 0) {
    // 같은 시각이 이미 있으면 새 값으로 덮어쓴다 → 같은 파일을 두 번 올려도 줄 수가 늘지 않음
    const { error } = await db.from("readings").upsert(good, { onConflict: "ts" });
    if (error) return res.status(500).json({ error: `저장 실패: ${error.message}` });
  }

  res.json({ saved: good.length, rejected: bad.length, rejectedExamples: bad.slice(0, 5) });
};
