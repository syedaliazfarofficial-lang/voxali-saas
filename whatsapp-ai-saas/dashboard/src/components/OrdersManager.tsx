import { useEffect, useState } from 'react';
import { Package, Clock, CheckCircle, XCircle, Phone, MapPin, User, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface Order {
  id: string;
  customer_name: string;
  wa_id: string;
  items_summary: string;
  order_items: any[];
  total_price: number;
  delivery_address: string;
  order_status: string;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending:    { label: 'Pending',     color: '#F59E0B', bg: '#FEF3C7', icon: Clock },
  preparing:  { label: 'Preparing',   color: '#3B82F6', bg: '#DBEAFE', icon: Package },
  delivered:  { label: 'Delivered',   color: '#10B981', bg: '#D1FAE5', icon: CheckCircle },
  cancelled:  { label: 'Cancelled',   color: '#EF4444', bg: '#FEE2E2', icon: XCircle },
};

export function OrdersManager() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { fetchOrders(); }, []);

  async function fetchOrders() {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('orders').update({ order_status: status }).eq('id', id);
    fetchOrders();
  }

  const filtered = filter === 'all' ? orders : orders.filter(o => o.order_status === filter);

  const pendingCount = orders.filter(o => o.order_status === 'pending').length;
  const todayCount = orders.filter(o => {
    const d = new Date(o.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;
  const totalRevenue = orders
    .filter(o => o.order_status !== 'cancelled')
    .reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid-3">
        <div className="stat-card">
          <div style={{ fontSize: 28, marginBottom: 8 }}>📦</div>
          <p className="stat-label">Total Orders</p>
          <p className="stat-value">{orders.length}</p>
          <p className="stat-trend">{todayCount} today</p>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
          <p className="stat-label">Pending</p>
          <p className="stat-value" style={{ color: pendingCount > 0 ? '#F59E0B' : undefined }}>{pendingCount}</p>
          <p className="stat-trend">{pendingCount > 0 ? 'Needs attention!' : 'All clear'}</p>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: 28, marginBottom: 8 }}>💰</div>
          <p className="stat-label">Revenue</p>
          <p className="stat-value">Rs. {totalRevenue.toLocaleString()}</p>
          <p className="stat-trend">All confirmed orders</p>
        </div>
      </div>

      {/* Filter Tabs & Refresh */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {['all', 'pending', 'preparing', 'delivered', 'cancelled'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={filter === f ? 'btn-primary' : 'btn-ghost'}
                style={{ padding: '7px 14px', fontSize: 12, textTransform: 'capitalize' }}
              >
                {f === 'all' ? `All (${orders.length})` : `${f} (${orders.filter(o => o.order_status === f).length})`}
              </button>
            ))}
          </div>
          <button onClick={fetchOrders} className="btn-ghost" style={{ padding: 8 }}>
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Orders List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading orders...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Package size={22} /></div>
            <h3 className="empty-title">No Orders Yet</h3>
            <p className="empty-desc">When customers order via WhatsApp, orders will appear here in real-time.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(order => {
              const status = STATUS_CONFIG[order.order_status] || STATUS_CONFIG.pending;
              const StatusIcon = status.icon;
              const time = new Date(order.created_at).toLocaleString('en-PK', { 
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
              });

              return (
                <div key={order.id} className="order-card">
                  {/* Header */}
                  <div className="order-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="order-number">#{order.id.slice(0, 6).toUpperCase()}</span>
                      <span className="order-time">{time}</span>
                    </div>
                    <span className="order-status-badge" style={{ color: status.color, background: status.bg }}>
                      <StatusIcon size={13} />
                      {status.label}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="order-body">
                    <div className="order-info">
                      <div className="order-info-row">
                        <User size={14} />
                        <span>{order.customer_name || 'Unknown'}</span>
                      </div>
                      <div className="order-info-row">
                        <Phone size={14} />
                        <span>{order.wa_id ? `+${order.wa_id}` : 'N/A'}</span>
                      </div>
                      <div className="order-info-row">
                        <MapPin size={14} />
                        <span>{order.delivery_address || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="order-items-section">
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Items</p>
                      <p style={{ fontSize: 13, lineHeight: 1.6 }}>{order.items_summary || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="order-footer">
                    <p className="order-total">Rs. {Number(order.total_price || 0).toLocaleString()}</p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {order.order_status === 'pending' && (
                        <>
                          <button onClick={() => updateStatus(order.id, 'preparing')} className="btn-primary" style={{ padding: '6px 12px', fontSize: 11 }}>
                            🍳 Start Preparing
                          </button>
                          <button onClick={() => updateStatus(order.id, 'cancelled')} className="btn-ghost" style={{ padding: '6px 12px', fontSize: 11, color: '#EF4444' }}>
                            ✕ Cancel
                          </button>
                        </>
                      )}
                      {order.order_status === 'preparing' && (
                        <button onClick={() => updateStatus(order.id, 'delivered')} className="btn-primary" style={{ padding: '6px 12px', fontSize: 11, background: '#10B981' }}>
                          ✅ Mark Delivered
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
