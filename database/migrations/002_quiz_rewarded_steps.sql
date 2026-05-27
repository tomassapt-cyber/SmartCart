-- ============================================================
-- Migration 002: Quiz reward tracking
-- ============================================================
-- Idempotente. Aplica no Supabase Dashboard → SQL Editor.
--
-- Objectivo: garantir que cada pergunta do quiz só atribui pontos UMA vez,
-- mesmo que o utilizador edite ou refaça o quiz. Guardamos a lista de keys
-- (display_name, gender, skin_type, etc.) que já contribuíram para o saldo.
-- ============================================================

alter table public.profiles
  add column if not exists quiz_rewarded_steps text[] default '{}';

-- Backfill: para users que já tinham last_quiz_at, assume que TODAS as
-- perguntas então existentes deram pontos (não conseguimos reconstruir o
-- estado anterior, mas evitamos dar pontos retroactivos a quem já tinha).
update public.profiles
   set quiz_rewarded_steps = ARRAY[
     'display_name','gender','birth_year','district',
     'skin_type','skin_concerns','skin_allergies','routine_steps',
     'skincare_goal','hair_type'
   ]::text[]
 where last_quiz_at is not null
   and (quiz_rewarded_steps is null or array_length(quiz_rewarded_steps, 1) is null);
