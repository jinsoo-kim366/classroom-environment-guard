-- 사용자 테스트 응답 (참가자가 /survey.html에서 직접 제출). 이름 등 개인정보는 받지 않는다.
create table if not exists survey_responses (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  s1_sec      real,              -- S1: 시작부터 답 제출까지 걸린 시간(초)
  s1_answer   text,              -- S1: 참가자가 적은 답 그대로
  s1_correct  boolean,           -- S1: 320분이 맞는지 (서버가 판단)
  before      jsonb not null,    -- S2: 숫자만 보고 고른 답 {A..E}
  after       jsonb not null,    -- S2: 카드 보고 고른 답 {A..E}
  feedback    text
);
alter table survey_responses enable row level security;
grant select, insert on table public.survey_responses to service_role;
