-- Sem um ano letivo ativo, não é possível criar empréstimos nem matrículas.
INSERT INTO ano_letivo (designacao, data_inicio, data_fim, ativo)
SELECT '2026/2027', DATE '2026-09-01', DATE '2027-08-31', true
WHERE NOT EXISTS (SELECT 1 FROM ano_letivo);
