// GET /api/dust?t=2026-10-26T20:00 · F-06 먼지 높음 알림 [AI · HAIP M3]
// HAIP가 넘긴 M3 모델을 '시각별 기준값 24개'로 바꾼 표를 그대로 쓴다 (마이크로비트와 같은 규칙).
// GET /api/dust?replay=all → 저장된 기록 전체를 재생해 재현율을 계산한다 (테스트 T2).
const db = require("./_db");
const { addMin } = require("./_time");
const { TRIGGER } = require("../model.json");

const HIGH_MV = 300; // HAIP의 '먼지 높음' 정의

module.exports = async (req, res) => {
  if (req.query.replay === "all") {
    const all = [];
    for (let from = 0; ; from += 1000) { // Supabase는 한 번에 1,000줄까지 준다
      const { data, error } = await db.from("readings").select("ts, dust_mv")
        .order("ts", { ascending: true }).range(from, from + 999);
      if (error) return res.status(500).json({ error: error.message });
      all.push(...data);
      if (data.length < 1000) break;
    }
    const byTs = new Map(all.map((r) => [r.ts, r.dust_mv]));
    let high = 0, caught = 0, falseAlarms = 0, checked = 0;
    for (const r of all) {
      const prev = byTs.get(addMin(r.ts, -5));
      if (prev === undefined) continue; // 5분 전 기록이 없으면 판단하지 않음
      checked++;
      const alarm = prev >= TRIGGER[new Date(r.ts).getHours()];
      if (r.dust_mv >= HIGH_MV) { high++; if (alarm) caught++; } else if (alarm) falseAlarms++;
    }
    return res.json({ checked, high, caught, missed: high - caught, falseAlarms, recall: high ? +(caught / high).toFixed(3) : null });
  }

  const t = req.query.t;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(t || "")) return res.status(400).json({ error: "시각은 2026-10-26T20:00 형식으로 보내야 합니다." });
  const at = `${t}:00`;
  const { data, error } = await db.from("readings").select("ts, dust_mv").eq("ts", addMin(at, -5)).limit(1);
  if (error) return res.status(500).json({ error: error.message });
  if (!data.length) return res.json({ available: false, reason: "5분 전 기록이 없어 판단할 수 없습니다." });

  const hour = new Date(at).getHours();
  const prev = data[0].dust_mv;
  res.json({ available: true, alarm: prev >= TRIGGER[hour], dust5minAgo: prev, trigger: TRIGGER[hour], hour });
};
