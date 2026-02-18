-- =============================================
-- FIX: Grant EXECUTE permissions to anon role
-- Run this in Supabase SQL Editor
-- =============================================
-- Grant execute on all dashboard RPC functions to anon
GRANT EXECUTE ON FUNCTION rpc_dashboard_stats(UUID) TO anon;
GRANT EXECUTE ON FUNCTION rpc_weekly_revenue(UUID) TO anon;
GRANT EXECUTE ON FUNCTION rpc_recent_activity(UUID) TO anon;
GRANT EXECUTE ON FUNCTION rpc_analytics_revenue(UUID, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION rpc_analytics_services(UUID) TO anon;
GRANT EXECUTE ON FUNCTION rpc_analytics_statuses(UUID) TO anon;
GRANT EXECUTE ON FUNCTION rpc_staff_board(UUID) TO anon;
GRANT EXECUTE ON FUNCTION rpc_block_staff_today(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION rpc_unblock_staff_today(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION rpc_get_tenant_id(TEXT) TO anon;
-- Also grant to authenticated role for future use
GRANT EXECUTE ON FUNCTION rpc_dashboard_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_weekly_revenue(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_recent_activity(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_analytics_revenue(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_analytics_services(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_analytics_statuses(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_staff_board(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_block_staff_today(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_unblock_staff_today(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_get_tenant_id(TEXT) TO authenticated;
SELECT '✅ Permissions granted!' AS status;