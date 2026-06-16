import { useEffect, useState, useRef, useCallback } from 'react';
import { MessageSquare, Bot, User, Search, RefreshCw, Clock, Phone, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface Customer {
  id: string;
  wa_id: string;
  name: string;
  last_chat: string;
}

interface ChatLog {
  id: string;
  customer_id: string;
  sender: 'customer' | 'bot' | string;
  message: string;
  created_at: string;
}

export function ChatLogsManager() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [messages, setMessages] = useState<ChatLog[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat logs
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Fetch customer list
  const fetchCustomers = useCallback(async (silent = false) => {
    if (!silent) setLoadingCustomers(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('last_chat', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
      
      // Select first customer if none selected
      if (data && data.length > 0 && !selectedCustomer) {
        setSelectedCustomer(data[0]);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoadingCustomers(false);
    }
  }, [selectedCustomer]);

  // Fetch messages for selected customer
  const fetchMessages = useCallback(async (customerId: string, silent = false) => {
    if (!silent) setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('chat_logs')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoadingMessages(false);
      setTimeout(scrollToBottom, 50);
    }
  }, [scrollToBottom]);

  // Fetch customers on load
  useEffect(() => {
    fetchCustomers();
  }, []);

  // Fetch messages when selected customer changes
  useEffect(() => {
    if (selectedCustomer) {
      fetchMessages(selectedCustomer.id);
    } else {
      setMessages([]);
    }
  }, [selectedCustomer, fetchMessages]);

  // Real-time listener for new messages
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_logs' },
        (payload) => {
          const newLog = payload.new as ChatLog;
          
          // Refresh customer list to update the order/last_chat timestamps
          fetchCustomers(true);

          // If the message belongs to the active conversation, append it
          if (selectedCustomer && newLog.customer_id === selectedCustomer.id) {
            setMessages((prev) => {
              // Prevent duplicates if already fetched
              if (prev.some((m) => m.id === newLog.id)) return prev;
              return [...prev, newLog];
            });
            setTimeout(scrollToBottom, 100);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedCustomer, fetchCustomers, scrollToBottom]);

  // Handle manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCustomers(true);
    if (selectedCustomer) {
      await fetchMessages(selectedCustomer.id, true);
    }
    setRefreshing(false);
  };

  // Filtered customer list by search query
  const filteredCustomers = customers.filter(c =>
    (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.wa_id && c.wa_id.includes(searchQuery))
  );

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleString('en-PK', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-PK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6" style={{ height: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Stats Cards Row */}
      <div className="grid-3" style={{ flexShrink: 0 }}>
        <div className="stat-card">
          <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
          <p className="stat-label">Total Chats</p>
          <p className="stat-value">{customers.length}</p>
          <p className="stat-trend">WhatsApp Subscribers</p>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: 28, marginBottom: 8 }}>🤖</div>
          <p className="stat-label">AI Responses</p>
          <p className="stat-value">Active</p>
          <p className="stat-trend">24/7 Automated Assistant</p>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: 28, marginBottom: 8 }}>⚡</div>
          <p className="stat-label">Connection Status</p>
          <p className="stat-value" style={{ color: 'var(--success)' }}>Live</p>
          <p className="stat-trend">Webhook Connected</p>
        </div>
      </div>

      {/* Main Chat Interface Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '320px 1fr',
        gap: 20,
        flex: 1,
        minHeight: 0 // Crucial for inner scrollbars to work in CSS grids
      }}>
        
        {/* Left Side: Customers list */}
        <div className="card" style={{
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden'
        }}>
          {/* Search box & Refresh Header */}
          <div style={{
            padding: 16,
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            background: '#FAFAFA'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Conversations</span>
              <button 
                onClick={handleRefresh} 
                disabled={refreshing}
                className="btn-ghost" 
                style={{ padding: 6, borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Refresh logs"
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input"
                style={{ paddingLeft: 32, height: 36, fontSize: 13 }}
              />
            </div>
          </div>

          {/* Customer list scrollable area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
            {loadingCustomers ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Loading chats...</div>
            ) : filteredCustomers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>
                No active conversations found.
              </div>
            ) : (
              filteredCustomers.map((cust) => {
                const isActive = selectedCustomer?.id === cust.id;
                return (
                  <div
                    key={cust.id}
                    onClick={() => setSelectedCustomer(cust)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      background: isActive ? 'var(--primary-light)' : 'transparent',
                      color: isActive ? 'var(--primary)' : 'inherit',
                      transition: 'all 0.2s',
                      marginBottom: 4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      border: isActive ? '1px solid rgba(124, 58, 237, 0.2)' : '1px solid transparent'
                    }}
                    className="customer-item"
                  >
                    <div style={{
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      background: isActive ? 'var(--primary)' : '#E4E4E7',
                      color: isActive ? 'white' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 14,
                      flexShrink: 0
                    }}>
                      {cust.name ? cust.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: 13.5, margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {cust.name || 'WhatsApp Client'}
                      </p>
                      <p style={{ fontSize: 11, color: isActive ? 'var(--primary)' : 'var(--text-muted)', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Phone size={10} /> +{cust.wa_id}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Conversation details */}
        <div className="card" style={{
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden'
        }}>
          {selectedCustomer ? (
            <>
              {/* Header */}
              <div style={{
                padding: '16px 24px',
                borderBottom: '1px solid var(--border)',
                background: '#FAFAFA',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700
                  }}>
                    {selectedCustomer.name ? selectedCustomer.name.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div>
                    <h4 style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>{selectedCustomer.name || 'WhatsApp Client'}</h4>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Phone size={11} /> +{selectedCustomer.wa_id}
                    </p>
                  </div>
                </div>
                
                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={12} />
                  <span>Last active: {new Date(selectedCustomer.last_chat).toLocaleString('en-PK', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                </div>
              </div>

              {/* Chat timeline messages list */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '24px 20px',
                background: '#F8F9FA',
                display: 'flex',
                flexDirection: 'column',
                gap: 16
              }}>
                {loadingMessages ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                    Loading conversation thread...
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: 8 }}>
                    <MessageSquare size={32} style={{ opacity: 0.3 }} />
                    <p style={{ fontSize: 13 }}>No messages in this chat thread.</p>
                  </div>
                ) : (
                  <>
                    {/* Render messages */}
                    {messages.map((msg, index) => {
                      const isBot = msg.sender === 'bot' || msg.sender === 'aria';
                      
                      // Check if we should render a date separator
                      const prevMsg = index > 0 ? messages[index - 1] : null;
                      const showDateSeparator = !prevMsg || 
                        new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();

                      return (
                        <div key={msg.id || index} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {showDateSeparator && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              margin: '12px 0 4px'
                            }}>
                              <span style={{
                                fontSize: 11,
                                fontWeight: 600,
                                background: '#E4E4E7',
                                color: 'var(--text-muted)',
                                padding: '4px 10px',
                                borderRadius: 100,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6
                              }}>
                                <Calendar size={10} />
                                {formatDate(msg.created_at)}
                              </span>
                            </div>
                          )}

                          <div style={{
                            display: 'flex',
                            justifyContent: isBot ? 'flex-start' : 'flex-end',
                            width: '100%',
                            gap: 10
                          }}>
                            {/* Avatar for bot */}
                            {isBot && (
                              <div style={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                background: 'var(--primary-light)',
                                color: 'var(--primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                <Bot size={14} />
                              </div>
                            )}

                            {/* Message bubble */}
                            <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '70%', alignItems: isBot ? 'flex-start' : 'flex-end' }}>
                              <div style={{
                                padding: '10px 14px',
                                borderRadius: 12,
                                borderTopLeftRadius: isBot ? 2 : 12,
                                borderTopRightRadius: isBot ? 12 : 2,
                                background: isBot ? 'var(--primary)' : 'white',
                                color: isBot ? 'white' : 'var(--text-main)',
                                fontSize: 13,
                                lineHeight: 1.5,
                                border: isBot ? 'none' : '1px solid var(--border)',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word'
                              }}>
                                {msg.message}
                              </div>
                              <span style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4, padding: '0 2px' }}>
                                {formatTime(msg.created_at)}
                              </span>
                            </div>

                            {/* Avatar for customer */}
                            {!isBot && (
                              <div style={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                background: '#E4E4E7',
                                color: 'var(--text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                <User size={14} />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: 12, padding: 40 }}>
              <MessageSquare size={48} style={{ opacity: 0.2 }} />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>No Chat Selected</h3>
              <p style={{ fontSize: 13, maxWidth: 300, textAlign: 'center' }}>Select a customer from the left sidebar to view their full WhatsApp conversation log with the AI bot.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
