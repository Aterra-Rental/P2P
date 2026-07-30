-- SELECT
--     table_name,
--     column_name,
--     data_type,
--     is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
-- ORDER BY table_name, ordinal_position;

-- SELECT
--     tc.table_name,
--     kcu.column_name
-- FROM
--     information_schema.table_constraints tc
-- JOIN
--     information_schema.key_column_usage kcu
-- ON
--     tc.constraint_name = kcu.constraint_name
-- WHERE
--     tc.constraint_type = 'PRIMARY KEY'
-- ORDER BY
--     tc.table_name;

SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS referenced_table,
    ccu.column_name AS referenced_column
FROM
    information_schema.table_constraints AS tc
JOIN
    information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN
    information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE
    tc.constraint_type = 'FOREIGN KEY'
ORDER BY
    tc.table_name;

    SELECT
    table_name,
    constraint_name,
    constraint_type
FROM
    information_schema.table_constraints
WHERE
    table_schema = 'public'
ORDER BY
    table_name;


    SELECT
    tablename,
    indexname,
    indexdef
FROM
    pg_indexes
WHERE
    schemaname = 'public'
ORDER BY
    tablename;

    SELECT
    relname AS table_name,
    n_live_tup AS estimated_rows
FROM
    pg_stat_user_tables
ORDER BY
    relname;

    SELECT
    c.table_name,
    c.column_name,
    c.data_type,
    c.character_maximum_length,
    c.is_nullable,
    c.column_default
FROM information_schema.columns c
WHERE c.table_schema='public'
ORDER BY c.table_name, c.ordinal_position;