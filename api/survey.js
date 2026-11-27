// POST /api/survey · 사용자 테스트 응답 저장 (참가자용 /survey.html)
// GET  /api/survey · 모인 응답과 S1·S2 결과 계산 (결과용 /results.html)
const db = require("./_db");

const SITS = ["A", "B", "C", "D", "E"];
const CHOICES = ["열기", "닫음", "공청"];
const validPicks = (o) => o && SITS.every((k) => CHOICES.includes(o[k]));
const isCorrect = (answer) => (String(answer).match(/\d+/g) || []).includes("320"); // 정답: 10/22 빈 교실 조명 320분

module.exports = async (req, res) => {
  if (req.method === "POST") {
    const b = req.body || {};
    const sec = Number(b.s1Sec);
    if (!Number.isFinite(sec) || sec < 0 || sec > 3600) return res.status(400).json({ error: "S1 시간이 잘못됐습니다." });
    if (!validPicks(b.before) || !validPicks(b.after)) return res.status(400).json({ error: "S2 상황 5개를 모두 골라야 합니다." });
    const row = {
      s1_sec: +sec.toFixed(1),
      s1_answer: String(b.s1Answer || "").slice(0, 50),
      s1_correct: isCorrect(b.s1Answer),
      before: b.before, after: b.after,
      feedback: String(b.feedback || "").slice(0, 500),
    };
    const { error } = await db.from("survey_responses").insert(row);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }

  const { data: rows, error } = await db.from("survey_responses").select("*").order("created_at", { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  // S2: 상황마다 모든 참가자의 답이 하나로 모이지 않으면 '갈림'
  const split = (key) => rows.length < 2 ? null : SITS.filter((s) => new Set(rows.map((r) => r[key][s])).size > 1).length;
  res.json({
    count: rows.length,
    s1Pass: rows.filter((r) => r.s1_correct && r.s1_sec <= 30).length,
    splitBefore: split("before"),
    splitAfter: split("after"),
    rows,
  });
};
