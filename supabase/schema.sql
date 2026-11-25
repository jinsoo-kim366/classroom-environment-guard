-- 교실 환경 지킴이 · Supabase SQL Editor에 붙여 넣고 Run
-- readings: 마이크로비트 5분 기록 1줄 = 1행 (F-01, F-02, F-03에서 사용)
create table if not exists readings (
  ts         timestamp primary key,   -- 교실 현지 시각 (예: 2026-10-21 16:05:00)
  light      integer  not null,       -- 조도 0~1023
  motion     integer  not null,       -- 5분 동안 PIR 감지 횟수
  dust_mv    integer  not null,       -- 먼지 센서 전압 (mV)
  temp_c     real     not null,
  humid_pct  real     not null,
  press_hpa  real     not null
);

-- 브라우저(anon 키)로는 아무것도 못 읽고 못 쓰게 막는다.
-- 서버 함수만 service_role 키로 접근한다. (정책을 하나도 만들지 않으면 anon은 전부 거부됨)
alter table readings enable row level security;

-- 새 프로젝트는 SQL로 만든 테이블에 서버 역할 권한을 자동으로 주지 않을 수 있다 → 직접 준다 (anon에는 주지 않음)
grant usage on schema public to service_role;
grant select, insert, update, delete on table public.readings to service_role;
