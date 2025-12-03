-- Naprawa błędnych godzin w bazie danych
-- Problem: godziny były mnożone × 100 przy zapisie (136h zapisane jako 13600)
-- Rozwiązanie: podziel wszystkie godziny > 1000 przez 100

-- Sprawdź ile wpisów wymaga naprawy
SELECT 
  COUNT(*) as total_entries,
  SUM(CASE WHEN hours_worked > 1000 THEN 1 ELSE 0 END) as entries_to_fix,
  MIN(hours_worked) as min_hours,
  MAX(hours_worked) as max_hours
FROM time_entries;

-- Pokaż przykładowe błędne wpisy
SELECT 
  id,
  assignment_id,
  work_date,
  hours_worked,
  ROUND(hours_worked / 100, 2) as corrected_hours,
  description
FROM time_entries
WHERE hours_worked > 1000
LIMIT 10;

-- UWAGA: Przed wykonaniem UPDATE, sprawdź powyższe wyniki!
-- Jeśli wszystko wygląda dobrze, odkomentuj poniższą linię:

-- UPDATE time_entries 
-- SET hours_worked = ROUND(hours_worked / 100)
-- WHERE hours_worked > 1000;

-- Sprawdź wynik po aktualizacji
-- SELECT 
--   COUNT(*) as total_entries,
--   MIN(hours_worked) as min_hours,
--   MAX(hours_worked) as max_hours,
--   AVG(hours_worked) as avg_hours
-- FROM time_entries;
