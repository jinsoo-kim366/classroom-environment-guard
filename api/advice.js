// GET /api/advice?t=2026-10-26T20:00 · F-04 환기 판단 카드 [AI: HAIP M3 먼지 알림 + 기준표]
// Claude API(유료) 대신, HAIP 모델의 '먼지 높음' 판단과 시험 전에 정한 기준표로 판단한다.
// 기준표: 먼지 높음(HAIP) → 공기청정기 · 사람 있음 + (습도 > 60% 또는 온도 > 26℃) → 지금 환기 · 그 밖 → 환기 불필요
// 응답: { found, decision, temp, reason, inputs: { at, temp_c, humid_pct, motion15, dust5minAgo, trigger, dustHigh } }
const db = require("./_db");
const { addMin } = require("./_time");
const { TRIGGER } = require("../model.json");

function recommendedTemp(month) {
  if (month >= 6 && month <= 9) return 26; // 냉방 기준
  if (month >= 10 || month <= 3) return 20; // 난방 기준
  return null; // 4~5월: 냉난방 안 함
}

module.exports = async (req, res) => {
  const t = req.query.t;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(t || "")) return res.status(400).json({ error: "시각은 2026-10-26T20:00 형식으로 보내야 합니다." });
  const at = `${t}:00`;

  // 고른 시각 앞 25분 기록 (가장 가까운 기록 + 15분 움직임 + 5분 전 먼지)
  const { data: rows, error } = await db.from("readings").select("*")
    .gte("ts", addMin(at, -25)).lte("ts", at).order("ts", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });

  const r = rows[0];
  if (!r || (new Date(at) - new Date(r.ts)) / 60000 > 10) return res.json({ found: false });

  const motion15 = rows.filter((x) => x.ts >= addMin(r.ts, -15)).reduce((s, x) => s + x.motion, 0);
  const prev = rows.find((x) => x.ts === addMin(r.ts, -5));
  const d = new Date(r.ts);
  const trigger = TRIGGER[d.getHours()];
  const dustHigh = prev ? prev.dust_mv >= trigger : null; // 5분 전 기록이 없으면 먼지 판단 불가
  const people = motion15 > 0;
  const temp = recommendedTemp(d.getMonth() + 1);

  let decision, reason;
  if (dustHigh) {
    decision = "공기청정기를 켜세요";
    reason = `HAIP 모델이 먼지 높음으로 판단했어요 (5분 전 ${prev.dust_mv} mV ≥ ${d.getHours()}시 기준 ${trigger} mV). 창문 대신 공기청정기를 켜 주세요.`;
  } else if (people && (r.humid_pct > 60 || r.temp_c > 26)) {
    decision = "지금 환기하세요";
    reason = r.humid_pct > 60
      ? `사람이 있고 습도가 ${r.humid_pct.toFixed(1)}%로 60%를 넘어요. 창문을 5~10분 열어 주세요.`
      : `사람이 있고 온도가 ${r.temp_c.toFixed(1)}℃로 26℃를 넘어요. 창문을 5~10분 열어 주세요.`;
  } else {
    decision = "환기하지 않아도 돼요";
    reason = people
      ? `사람이 있지만 습도 ${r.humid_pct.toFixed(1)}%, 온도 ${r.temp_c.toFixed(1)}℃로 기준 안이에요.`
      : "최근 15분 동안 움직임이 없어 교실이 빈 것으로 보여요.";
  }

  res.json({
    found: true, decision, temp, reason,
    inputs: { at: r.ts, temp_c: r.temp_c, humid_pct: r.humid_pct, motion15,
      dust5minAgo: prev ? prev.dust_mv : null, trigger, dustHigh },
  });
};
