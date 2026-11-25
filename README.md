# 교실 환경 지킴이 (Classroom Air Guard)
PPSD 기말 프로젝트 · Squad 07 · 마이크로비트 교실 기록 + HAIP M3 먼지 알림 + Claude 환기 카드

## 파일
- `upload.html` — F-01 측정 기록 올리기 화면
- `api/readings.js` — F-01 서버 함수 (POST /api/readings, 값 범위 검사 후 Supabase 저장)
- `api/_db.js` — Supabase 연결 (키는 Vercel 환경 변수에서 읽음)
- `supabase/schema.sql` — readings 테이블

## 처음 설정
1. Supabase 새 프로젝트 → SQL Editor → `supabase/schema.sql` 붙여 넣고 Run
2. Supabase Project Settings → API 에서 Project URL, service_role 키 확인
3. Vercel → 이 GitHub 저장소 Import → Environment Variables에 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 추가 → Deploy
4. 배포 주소 뒤에 `/upload.html` 을 붙여 열고 10월 CSV 올리기

## 완성 확인 (F-01)
- 10월 CSV(1,224줄) → 1,222줄 저장 (같은 시각 2줄은 켜질 때 튄 값이라 뒤 줄로 정리)
- 습도 120 같은 범위 밖 값이 든 줄은 저장하지 않고 거절 개수와 이유가 화면에 나옴
