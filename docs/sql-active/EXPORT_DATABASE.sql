-- ============================================================
-- DATABASE EXPORT QUERY - Run in Supabase SQL Editor
-- Copy the JSON output and save as database_export_feb26.json
-- ============================================================
SELECT json_build_object(
        'exported_at',
        NOW(),
        'tables',
        json_build_object(
            'tenants',
            json_build_object(
                'count',
                (
                    SELECT count(*)
                    FROM tenants
                ),
                'data',
                COALESCE(
                    (
                        SELECT json_agg(t)
                        FROM tenants t
                    ),
                    '[]'::json
                )
            ),
            'profiles',
            json_build_object(
                'count',
                (
                    SELECT count(*)
                    FROM profiles
                ),
                'data',
                COALESCE(
                    (
                        SELECT json_agg(p)
                        FROM profiles p
                    ),
                    '[]'::json
                )
            ),
            'staff',
            json_build_object(
                'count',
                (
                    SELECT count(*)
                    FROM staff
                ),
                'data',
                COALESCE(
                    (
                        SELECT json_agg(s)
                        FROM staff s
                    ),
                    '[]'::json
                )
            ),
            'services',
            json_build_object(
                'count',
                (
                    SELECT count(*)
                    FROM services
                ),
                'data',
                COALESCE(
                    (
                        SELECT json_agg(sv)
                        FROM services sv
                    ),
                    '[]'::json
                )
            ),
            'bookings',
            json_build_object(
                'count',
                (
                    SELECT count(*)
                    FROM bookings
                ),
                'data',
                COALESCE(
                    (
                        SELECT json_agg(b)
                        FROM bookings b
                    ),
                    '[]'::json
                )
            ),
            'clients',
            json_build_object(
                'count',
                (
                    SELECT count(*)
                    FROM clients
                ),
                'data',
                COALESCE(
                    (
                        SELECT json_agg(c)
                        FROM clients c
                    ),
                    '[]'::json
                )
            ),
            'business_hours',
            json_build_object(
                'count',
                (
                    SELECT count(*)
                    FROM business_hours
                ),
                'data',
                COALESCE(
                    (
                        SELECT json_agg(bh)
                        FROM business_hours bh
                    ),
                    '[]'::json
                )
            ),
            'call_logs',
            json_build_object(
                'count',
                (
                    SELECT count(*)
                    FROM call_logs
                ),
                'data',
                COALESCE(
                    (
                        SELECT json_agg(cl)
                        FROM call_logs cl
                    ),
                    '[]'::json
                )
            ),
            'agent_configs',
            json_build_object(
                'count',
                (
                    SELECT count(*)
                    FROM agent_configs
                ),
                'data',
                COALESCE(
                    (
                        SELECT json_agg(ac)
                        FROM agent_configs ac
                    ),
                    '[]'::json
                )
            ),
            'staff_leaves',
            json_build_object(
                'count',
                (
                    SELECT count(*)
                    FROM staff_leaves
                ),
                'data',
                COALESCE(
                    (
                        SELECT json_agg(sl)
                        FROM staff_leaves sl
                    ),
                    '[]'::json
                )
            )
        )
    ) AS database_export;