// 서버 함수끼리 같이 쓰는 Supabase 연결. 파일 이름이 _로 시작하면 Vercel은 주소로 열지 않는다.
const { createClient } = require("@supabase/supabase-js");

module.exports = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY, // Vercel 환경 변수에만 둔다. 코드·GitHub에 쓰지 않는다.
  { auth: { persistSession: false } }
);
