\pset pager off
\pset border 2
\pset null '[NULL]'
\timing on

\o D:/myproject/database_check_report.txt

\echo
\echo ============================================================
\echo 1. DATABASE CONNECTION AND VERSION
\echo ============================================================

SELECT
    current_database() AS database_name,
    current_user AS connected_user,
    inet_server_addr() AS server_address,
    inet_server_port() AS server_port,
    version() AS postgresql_version,
    current_timestamp AS report_created_at;

\echo
\echo ============================================================
\echo 2. DATABASE SIZE
\echo ============================================================

SELECT
    current_database() AS database_name,
    pg_size_pretty(pg_database_size(current_database())) AS database_size;

\echo
\echo ============================================================
\echo 3. SCHEMAS
\echo ============================================================

SELECT
    schema_name
FROM information_schema.schemata
ORDER BY schema_name;

\echo
\echo ============================================================
\echo 4. ALL PUBLIC TABLES AND SIZES
\echo ============================================================

SELECT
    schemaname,
    tablename,
    tableowner,
    pg_size_pretty(
        pg_total_relation_size(
            quote_ident(schemaname) || '.' || quote_ident(tablename)
        )
    ) AS total_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

\echo
\echo ============================================================
\echo 5. EXACT ROW COUNT FOR EVERY TABLE
\echo ============================================================

SELECT format(
    'SELECT %L AS table_name, COUNT(*) AS row_count FROM %I.%I;',
    schemaname || '.' || tablename,
    schemaname,
    tablename
)
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename
\gexec

\echo
\echo ============================================================
\echo 6. ALL COLUMNS
\echo ============================================================

SELECT
    table_name,
    ordinal_position,
    column_name,
    data_type,
    character_maximum_length,
    numeric_precision,
    numeric_scale,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

\echo
\echo ============================================================
\echo 7. PRIMARY KEYS, UNIQUE CONSTRAINTS AND CHECK CONSTRAINTS
\echo ============================================================

SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS columns
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
    ON tc.constraint_schema = kcu.constraint_schema
   AND tc.constraint_name = kcu.constraint_name
   AND tc.table_name = kcu.table_name
WHERE tc.table_schema = 'public'
GROUP BY
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type
ORDER BY
    tc.table_name,
    tc.constraint_type,
    tc.constraint_name;

\echo
\echo ============================================================
\echo 8. FOREIGN KEYS
\echo ============================================================

SELECT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS referenced_table,
    ccu.column_name AS referenced_column,
    rc.update_rule,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_schema = kcu.constraint_schema
   AND tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_schema = tc.constraint_schema
   AND ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc
    ON rc.constraint_schema = tc.constraint_schema
   AND rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position;

\echo
\echo ============================================================
\echo 9. CONSTRAINT VALIDATION STATUS
\echo ============================================================

SELECT
    ns.nspname AS schema_name,
    tbl.relname AS table_name,
    con.conname AS constraint_name,
    CASE con.contype
        WHEN 'p' THEN 'PRIMARY KEY'
        WHEN 'f' THEN 'FOREIGN KEY'
        WHEN 'u' THEN 'UNIQUE'
        WHEN 'c' THEN 'CHECK'
        WHEN 'x' THEN 'EXCLUSION'
        ELSE con.contype::text
    END AS constraint_type,
    con.convalidated AS validated,
    pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class tbl
    ON tbl.oid = con.conrelid
JOIN pg_namespace ns
    ON ns.oid = tbl.relnamespace
WHERE ns.nspname = 'public'
ORDER BY tbl.relname, con.conname;

\echo
\echo ============================================================
\echo 10. INDEXES
\echo ============================================================

SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

\echo
\echo ============================================================
\echo 11. SEQUENCES
\echo ============================================================

SELECT
    schemaname,
    sequencename,
    data_type,
    start_value,
    min_value,
    max_value,
    increment_by,
    cycle,
    cache_size,
    last_value
FROM pg_sequences
WHERE schemaname = 'public'
ORDER BY sequencename;

\echo
\echo ============================================================
\echo 12. USER ACCOUNTS - PASSWORD HASHES EXCLUDED
\echo ============================================================

SELECT
    user_id,
    email,
    created_at
FROM public.user_login
ORDER BY user_id;

\echo
\echo ============================================================
\echo 13. ADMIN ACCOUNTS - PASSWORD HASHES EXCLUDED
\echo ============================================================

SELECT
    admin_id,
    email,
    created_at
FROM public.admin_login
ORDER BY admin_id;

\echo
\echo ============================================================
\echo 14. USER DETAILS
\echo ============================================================

SELECT
    user_id,
    firstname,
    lastname,
    phonenumber,
    nationalidentity_id,
    dob,
    address,
    verify_status,
    national_id_front,
    national_id_back,
    profile_picture,
    reject_reason,
    reject_comment,
    reviewed_at,
    reviewed_by,
    bio,
    show_email,
    show_phone,
    profile_visibility,
    username,
    display_name,
    joined_at
FROM public.user_details
ORDER BY user_id;

\echo
\echo ============================================================
\echo 15. USER WALLETS
\echo ============================================================

SELECT *
FROM public.user_wallet
ORDER BY wallet_id;

\echo
\echo ============================================================
\echo 16. ROOMS
\echo ============================================================

SELECT *
FROM public.room
ORDER BY room_id;

\echo
\echo ============================================================
\echo 17. BUYERS
\echo ============================================================

SELECT *
FROM public.buyer
ORDER BY room_id;

\echo
\echo ============================================================
\echo 18. SELLERS
\echo ============================================================

SELECT *
FROM public.seller
ORDER BY room_id;

\echo
\echo ============================================================
\echo 19. ROOM MESSAGES
\echo ============================================================

SELECT *
FROM public.room_messages
ORDER BY message_id;

\echo
\echo ============================================================
\echo 20. ROOM REMINDERS
\echo ============================================================

SELECT *
FROM public.room_reminders
ORDER BY reminder_id;

\echo
\echo ============================================================
\echo 21. DEAL PROOFS
\echo ============================================================

SELECT *
FROM public.deal_proofs
ORDER BY proof_id;

\echo
\echo ============================================================
\echo 22. DISPUTES
\echo ============================================================

SELECT *
FROM public.disputes
ORDER BY dispute_id;

\echo
\echo ============================================================
\echo 23. DISPUTE RESOLUTIONS
\echo ============================================================

SELECT *
FROM public.dispute_resolution
ORDER BY resolution_id;

\echo
\echo ============================================================
\echo 24. FAQ QUESTIONS
\echo ============================================================

SELECT *
FROM public.faq_questions
ORDER BY question_id;

\echo
\echo ============================================================
\echo 25. TRANSACTION HISTORY
\echo ============================================================

SELECT *
FROM public.transactions_history
ORDER BY transaction_id;

\echo
\echo ============================================================
\echo 26. BROKEN USER DETAILS REFERENCES
\echo Expected result: 0 rows
\echo ============================================================

SELECT ud.*
FROM public.user_details ud
LEFT JOIN public.user_login ul
    ON ul.user_id = ud.user_id
WHERE ul.user_id IS NULL;

\echo
\echo ============================================================
\echo 27. BROKEN WALLET REFERENCES
\echo Expected result: 0 rows
\echo ============================================================

SELECT uw.*
FROM public.user_wallet uw
LEFT JOIN public.user_login ul
    ON ul.user_id = uw.user_id
WHERE ul.user_id IS NULL;

\echo
\echo ============================================================
\echo 28. BROKEN ROOM CREATOR REFERENCES
\echo Expected result: 0 rows
\echo ============================================================

SELECT r.*
FROM public.room r
LEFT JOIN public.user_details ud
    ON ud.user_id = r.created_by
WHERE ud.user_id IS NULL;

\echo
\echo ============================================================
\echo 29. BROKEN INVITED USER REFERENCES
\echo Expected result: 0 rows
\echo ============================================================

SELECT r.*
FROM public.room r
LEFT JOIN public.user_details ud
    ON ud.user_id = r.invited_user_id
WHERE r.invited_user_id IS NOT NULL
  AND ud.user_id IS NULL;

\echo
\echo ============================================================
\echo 30. BROKEN BUYER REFERENCES
\echo Expected result: 0 rows
\echo ============================================================

SELECT b.*
FROM public.buyer b
LEFT JOIN public.room r
    ON r.room_id = b.room_id
LEFT JOIN public.user_details ud
    ON ud.user_id = b.buyer_id
WHERE r.room_id IS NULL
   OR ud.user_id IS NULL;

\echo
\echo ============================================================
\echo 31. BROKEN SELLER REFERENCES
\echo Expected result: 0 rows
\echo ============================================================

SELECT s.*
FROM public.seller s
LEFT JOIN public.room r
    ON r.room_id = s.room_id
LEFT JOIN public.user_details ud
    ON ud.user_id = s.seller_id
WHERE r.room_id IS NULL
   OR ud.user_id IS NULL;

\echo
\echo ============================================================
\echo 32. DUPLICATE EMAIL CHECK
\echo Expected result: 0 rows
\echo ============================================================

SELECT
    email,
    COUNT(*) AS duplicate_count
FROM public.user_login
GROUP BY email
HAVING COUNT(*) > 1;

\echo
\echo ============================================================
\echo 33. DUPLICATE USERNAME CHECK
\echo Expected result: 0 rows
\echo ============================================================

SELECT
    username,
    COUNT(*) AS duplicate_count
FROM public.user_details
WHERE username IS NOT NULL
GROUP BY username
HAVING COUNT(*) > 1;

\echo
\echo ============================================================
\echo 34. DUPLICATE ROOM CODE CHECK
\echo Expected result: 0 rows
\echo ============================================================

SELECT
    room_code,
    COUNT(*) AS duplicate_count
FROM public.room
GROUP BY room_code
HAVING COUNT(*) > 1;

\echo
\echo ============================================================
\echo DATABASE CHECK COMPLETE
\echo ============================================================

\o