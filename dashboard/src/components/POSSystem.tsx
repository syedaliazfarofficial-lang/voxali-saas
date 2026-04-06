import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useTenant } from '../context/TenantContext'
import { useAuth } from '../context/AuthContext'
import { showToast } from './ui/ToastNotification'
import {
  CreditCard, Banknote, ShoppingBag, Scissors, CalendarCheck,
  Search, Plus, Minus, Trash2, X, CheckCircle, SplitSquareVertical, Receipt, Gift
} from 'lucide-react'
import { generateReceiptPDF } from '../utils/receiptGenerator'

import { Package as PackageIcon } from 'lucide-react'

type ItemType = 'service' | 'product' | 'custom' | 'package' | 'gift_card'

interface CartItem {
  id: string
  type: ItemType
  name: string
  price: number
  quantity: number
  service_id?: string // For walk-in services
  stylist_name?: string // For linked bookings
  template_id?: string // For selling packages
  recipient_email?: string // For selling gift cards
}

interface ProductInfo {
  id: string
  name: string
  price: number
  sku: string
  stock: number
}

interface PackageInfo {
  id: string
  name: string
  price: number
  total_uses: number
}

interface ServiceInfo {
  id: string
  name: string
  price: number
  duration: number
}

interface BookingInfo {
  id: string
  client_id?: string
  client_name: string
  service_names: string
  total_price: number
  deposit_paid: number
  start_time: string
  raw_start_time: string
  status: string
  stylist_name: string
}

export function POSSystem() {
  const { tenantId, timezone, salonName, logoUrl } = useTenant()
  const { user, staffRecord } = useAuth()
  
  // Views
  const [activeTab, setActiveTab] = useState<'walkin' | 'bookings' | 'retail' | 'packages' | 'giftcards'>('walkin')
  
  // Data State
  const [services, setServices] = useState<ServiceInfo[]>([])
  const [products, setProducts] = useState<ProductInfo[]>([])
  const [todayBookings, setTodayBookings] = useState<BookingInfo[]>([])
  const [packageTemplates, setPackageTemplates] = useState<PackageInfo[]>([])
  const [loading, setLoading] = useState(false)
  
  // Package Management (POS)
  const [newGCAmount, setNewGCAmount] = useState('')
  const [newGCEmail, setNewGCEmail] = useState('')

  // Product Management
  const [showAddProductModal, setShowAddProductModal] = useState(false)
  const [newProduct, setNewProduct] = useState({ name: '', sku: '', price: '', stock: '10' })
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('')

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([])
  const [customTip, setCustomTip] = useState<number>(0)
  
  // Checkout Context
  const [linkedBookingId, setLinkedBookingId] = useState<string | null>(null)
  const [linkedClientId, setLinkedClientId] = useState<string | null>(null)
  const [depositAlreadyPaid, setDepositAlreadyPaid] = useState<number>(0)
  const [availablePackages, setAvailablePackages] = useState<any[]>([])
  
  // Gift Card Application
  const [showGiftCardInput, setShowGiftCardInput] = useState(false)
  const [giftCardCode, setGiftCardCode] = useState('')
  const [appliedGiftCard, setAppliedGiftCard] = useState<any>(null)
  const [checkingGiftCard, setCheckingGiftCard] = useState(false)

  // Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'split' | 'package'>('card')
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null)
  const [cardEntryMethod, setCardEntryMethod] = useState<'terminal' | 'manual'>('terminal')
  const [terminalStatus, setTerminalStatus] = useState<'idle' | 'connecting' | 'waiting' | 'success'>('idle')
  const [cashAmount, setCashAmount] = useState<number>(0)
  const [isProcessing, setIsProcessing] = useState(false)

  // 1. Fetch available inventory / services / bookings
  useEffect(() => {
    if (!tenantId) return
    fetchData()
  }, [tenantId, activeTab])

  // Fetch client packages when client selected
  useEffect(() => {
    if (linkedClientId && tenantId) {
      supabase.from('client_active_packages')
        .select(`id, remaining_uses, template:client_package_templates(name)`)
        .eq('client_id', linkedClientId)
        .gt('remaining_uses', 0)
        .then(({ data }) => setAvailablePackages(data || []))
    } else {
      setAvailablePackages([])
    }
  }, [linkedClientId, tenantId])

  const fetchData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'walkin') {
        const { data } = await supabase
          .from('services')
          .select('id, name, price, duration')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .order('display_order')
        if (data) setServices(data)
      } else if (activeTab === 'retail') {
        const { data } = await supabase
          .from('products')
          .select('id, name, price, sku, quantity')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
        if (data) setProducts(data.map(p => ({ ...p, stock: p.quantity })))
      } else if (activeTab === 'packages') {
        const { data } = await supabase
          .from('client_package_templates')
          .select('id, name, price, total_uses')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
        if (data) setPackageTemplates(data)
      } else if (activeTab === 'bookings') {
        // Fetch today's confirmed/checked_in bookings
        // Convert 'now' to tenant timezone date
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: timezone }) // YYYY-MM-DD
        const startOfDay = new Date(`${todayStr}T00:00:00`).toISOString()
        const endOfDay = new Date(`${todayStr}T23:59:59`).toISOString()

        const { data } = await supabase
          .from('bookings')
          .select(`
            id, status, total_price, deposit_amount, payment_status, start_time, client_id,
            clients (name),
            booking_items (name_snapshot),
            staff (full_name)
          `)
          .eq('tenant_id', tenantId)
          .gte('start_time', startOfDay)
          .lte('start_time', endOfDay)
          .in('status', ['pending', 'pending_deposit', 'confirmed', 'checked_in', 'in_progress'])
          .order('start_time')

        if (data) {
          const formatted = data.map((b: any) => ({
            id: b.id,
            client_id: b.client_id,
            client_name: b.clients?.name || 'Walk-in',
            service_names: b.booking_items ? b.booking_items.map((i: any) => i.name_snapshot).join(', ') : 'Service',
            total_price: b.total_price || 0,
            deposit_paid: b.payment_status === 'deposit_paid' ? b.deposit_amount : 0,
            start_time: new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            raw_start_time: b.start_time,
            status: b.status,
            stylist_name: b.staff?.full_name || 'Unassigned'
          }))
          setTodayBookings(formatted)
        }
      }
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const handleMarkNoShow = async (e: React.MouseEvent, bookingId: string) => {
    e.stopPropagation();
    if (!window.confirm("Mark as No-Show? Any paid deposits will be moved to the Pending Refunds queue.")) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('bookings').update({ status: 'no_show' }).eq('id', bookingId);
      if (error) throw error;
      showToast("Booking marked as No-Show. Check Bookings page for pending refunds.", "success");
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    }
    setLoading(false);
  }

  // Cart Functions
  const addToCart = (item: any, type: ItemType) => {
    if (type === 'package' && !linkedClientId) {
        showToast('You must select a client from Today\'s Bookings first to sell a package.', 'error');
        return;
    }

    setCart(prev => {
      // Check if product already exists
      if (type === 'product') {
        const existing = prev.find(p => p.id === item.id && p.type === 'product')
        if (existing) {
          return prev.map(p => p.id === item.id ? { ...p, quantity: p.quantity + 1 } : p)
        }
      }
      return [...prev, {
        id: item.id || crypto.randomUUID(),
        type,
        name: type === 'custom' ? 'Custom Charge' : item.name,
        price: item.price,
        quantity: 1,
        service_id: type === 'service' ? item.id : undefined,
        template_id: type === 'package' ? item.id : undefined,
        recipient_email: type === 'gift_card' ? item.recipient_email : undefined
      }]
    })
  }

  const updateQuantity = (index: number, delta: number) => {
    setCart(prev => {
      const newCart = [...prev]
      const newQty = newCart[index].quantity + delta
      if (newQty <= 0) {
        newCart.splice(index, 1)
      } else {
        newCart[index].quantity = newQty
      }
      return newCart
    })
  }

  const loadBookingIntoCart = (booking: BookingInfo) => {
    setLinkedBookingId(booking.id)
    setLinkedClientId(booking.client_id || null)
    setDepositAlreadyPaid(booking.deposit_paid)
    setCart([{
      id: booking.id,
      type: 'service',
      name: booking.service_names + ' (Appointment)',
      price: booking.total_price,
      quantity: 1,
      stylist_name: booking.stylist_name
    }])
    showToast(`Loaded ${booking.client_name}'s booking into POS`, 'info')
  }

  const clearCart = () => {
    if (window.confirm("Clear current transaction?")) {
      setCart([])
      setLinkedBookingId(null)
      setLinkedClientId(null)
      setDepositAlreadyPaid(0)
      setCustomTip(0)
      setPaymentMethod('card')
      setSelectedPackageId(null)
      setAppliedGiftCard(null)
      setGiftCardCode('')
      setShowGiftCardInput(false)
    }
  }

  // Financial Math
  const calculateTotal = () => {
    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)
    return total
  }

  const taxableSubtotal = cart.reduce((acc, item) => {
    if (item.type === 'package' || item.type === 'gift_card') return acc;
    return acc + (item.price * item.quantity);
  }, 0);

  const subtotal = calculateTotal()
  const tax = taxableSubtotal * 0.08 // 8% placeholder tax
  
  // Recalculate based on total before GC
  const preGFTotal = subtotal + tax + customTip - depositAlreadyPaid;
  
  // Check if Gift Card overrides total
  let giftCardDiscount = 0;
  if(appliedGiftCard) {
      giftCardDiscount = Math.min(preGFTotal, appliedGiftCard.current_balance);
  }

  const finalCharge = Math.max(0, preGFTotal - giftCardDiscount)

  // Payment Submission
  const processCheckout = async () => {
    // If Stripe Terminal is selected, simulate the card tap flow first
    if (paymentMethod === 'card' && cardEntryMethod === 'terminal' && terminalStatus === 'idle') {
      setTerminalStatus('connecting')
      setTimeout(() => {
        setTerminalStatus('waiting')
        // Simulate customer tapping card after 2.5 seconds
        setTimeout(() => {
          setTerminalStatus('success')
          // Proceed with actual DB insert after success
          setTimeout(() => finalizeTransaction(), 1000)
        }, 3000)
      }, 1500)
      return
    }

    if (paymentMethod === 'package' && !selectedPackageId) {
       return showToast('Please select a package to redeem.', 'error')
    }

    // Direct checkout for cash, manual card, split, or package
    await finalizeTransaction()
  }

  const finalizeTransaction = async () => {
    if (cart.length === 0) return showToast('Cart is empty', 'error')
    
    setIsProcessing(true)
    try {
      let bookingId = linkedBookingId

      // 1. If it's a pure walk-in (no existing booking), create a dummy "completed" booking for analytics
      const primaryServiceId = cart.find(c => c.type === 'service' && c.service_id)?.service_id || '00000000-0000-0000-0000-000000000000';
      
      if (!bookingId) {
        const { data: bData, error: bErr } = await supabase
          .from('bookings')
          .insert({
            tenant_id: tenantId,
            stylist_id: staffRecord?.id || null,
            service_id: primaryServiceId,
            start_time: new Date().toISOString(),
            end_time: new Date(Date.now() + 30*60000).toISOString(),
            status: 'completed',
            total_price: subtotal,
            payment_method: paymentMethod,
            payment_status: 'paid',
            notes: 'POS Walk-in'
          })
          .select('id')
          .single()
        
        if (bErr) throw bErr
        bookingId = bData.id

        // Insert all items
        if (cart.length > 0) {
          const { error: biErr } = await supabase
            .from('booking_items')
            .insert(cart.map(item => ({
              booking_id: bookingId,
              service_id: item.type === 'service' && item.service_id ? item.service_id : primaryServiceId,
              name_snapshot: item.type === 'product' ? `[RETAIL] ${item.name}` : (item.type === 'custom' ? `[CUSTOM] ${item.name}` : item.name),
              price_snapshot: item.price * item.quantity,
              duration_min_snapshot: item.type === 'service' ? 30 : 0
            })))
          if (biErr) console.error("Could not insert booking items:", biErr)
        }
      } else {
        // Complete existing booking
        const { error: updateErr } = await supabase
          .from('bookings')
          .update({ 
            status: 'completed',
            payment_method: paymentMethod,
            payment_status: 'paid',
            total_price: subtotal
          })
          .eq('id', bookingId)

        if (updateErr) throw updateErr;

        // Insert newly added retail/custom items (filter out exactly the main loaded booking item)
        const newlyAddedItems = cart.filter(c => c.id !== linkedBookingId);
        if (newlyAddedItems.length > 0) {
          const { error: biErr } = await supabase
            .from('booking_items')
            .insert(newlyAddedItems.map(item => ({
              booking_id: bookingId,
              service_id: primaryServiceId,
              name_snapshot: item.type === 'product' ? `[RETAIL] ${item.name}` : (item.type === 'custom' ? `[CUSTOM] ${item.name}` : item.name),
              price_snapshot: item.price * item.quantity,
              duration_min_snapshot: 0
            })))
          if (biErr) console.error("Could not insert extra booking items:", biErr)
        }
      }

      // 2. Insert Payment Record(s) Make sure money is tracked
      const paymentPromises = [];

      // If gift card was applied, log that payment
      if (appliedGiftCard && giftCardDiscount > 0) {
        paymentPromises.push(
          supabase.from('payments').insert({
            tenant_id: tenantId,
            booking_id: bookingId,
            amount: giftCardDiscount, // amount covered by GC
            tip_amount: 0,
            payment_method: 'gift_card',
            status: 'completed'
          })
        );
        
        // Deduct from GC
        const newBalance = appliedGiftCard.current_balance - giftCardDiscount;
        await supabase.from('gift_cards').update({
           current_balance: newBalance,
           status: newBalance <= 0 ? 'depleted' : 'active'
        }).eq('id', appliedGiftCard.id);
      }

      if (paymentMethod === 'split') {
        const cardAmount = finalCharge - cashAmount
        paymentPromises.push(
          supabase.from('payments').insert([
            { tenant_id: tenantId, booking_id: bookingId, amount: cashAmount, tip_amount: customTip, payment_method: 'cash', status: 'completed' },
            { tenant_id: tenantId, booking_id: bookingId, amount: cardAmount, tip_amount: 0, payment_method: 'card', status: 'completed' }
          ])
        );
      } else if (paymentMethod === 'package') {
        paymentPromises.push(
          supabase.from('payments').insert({
            tenant_id: tenantId,
            booking_id: bookingId,
            amount: 0,
            tip_amount: customTip,
            payment_method: 'package',
            status: 'completed'
          })
        );

        // Deduct 1 credit from package
        if (selectedPackageId) {
           const pkg = availablePackages.find(p => p.id === selectedPackageId)
           if (pkg) {
             await supabase.from('client_active_packages')
                .update({ remaining_uses: Math.max(0, pkg.remaining_uses - 1) })
                .eq('id', selectedPackageId)
           }
        }
      } else if (finalCharge > 0) {
        // Only log other payment if there's a charge left after GC
        paymentPromises.push(
          supabase.from('payments').insert({
            tenant_id: tenantId,
            booking_id: bookingId,
            amount: finalCharge,
            tip_amount: customTip,
            payment_method: paymentMethod,
            status: 'completed'
          })
        );
      }

      await Promise.all(paymentPromises);

      // 3. Deduct retail inventory
      const retailItems = cart.filter(c => c.type === 'product')
      for (const item of retailItems) {
        // Quick decrement via RPC or direct update if concurrency is low
        const prod = products.find(p => p.id === item.id)
        if (prod) {
          const oldStock = prod.stock;
          const newStock = Math.max(0, prod.stock - item.quantity);
          await supabase.from('products').update({ quantity: newStock }).eq('id', item.id);

          // Trigger Low Stock Alert to Owner if it drops to 5 or below for the FIRST time
          if (oldStock > 5 && newStock <= 5) {
               await supabase.from('notification_queue').insert({
                  tenant_id: tenantId,
                  event_type: 'low_stock_alert',
                  client_email: 'retail_alert@voxali.net', // Placeholder to satisfy queue structure
                  client_name: 'Store Manager',
                  booking_details: {
                      product_name: prod.name,
                      remaining_stock: newStock
                  }
               });
               // Instantly trigger dispatch
               await supabase.functions.invoke('send-notification', { body: {} }).catch(e => console.error(e));
          }
        }
      }

      // X. Process Sold Packages
      const packageItems = cart.filter(c => c.type === 'package')
      for (const item of packageItems) {
        const tpl = packageTemplates.find(p => p.id === item.template_id);
        if (tpl && linkedClientId) {
            await supabase.from('client_active_packages').insert({
                tenant_id: tenantId,
                client_id: linkedClientId,
                template_id: tpl.id,
                remaining_uses: tpl.total_uses
            });
        }
      }

      // Y. Process Sold Gift Cards
      const gcItems = cart.filter(c => c.type === 'gift_card')
      for (const item of gcItems) {
          const code = Math.random().toString(36).substring(2, 10).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
          const { error: gcErr } = await supabase.from('gift_cards').insert({
              tenant_id: tenantId,
              code: code,
              initial_value: item.price,
              current_balance: item.price,
              recipient_email: item.recipient_email || null,
              status: 'active'
          });

          if (!gcErr && item.recipient_email) {
              await supabase.from('notification_queue').insert({
                  tenant_id: tenantId,
                  event_type: 'gift_card_issued',
                  client_email: item.recipient_email,
                  client_name: 'Valued Client', // Provide fallback client name
                  booking_details: {
                      gift_card_code: code,
                      gift_card_amount: item.price
                  }
              });
              
              // Instantly trigger edge function to email the digital code
              await supabase.functions.invoke('send-notification', { body: {} }).catch(err => console.error(err));
          }
      }

      // 4. Success handling
      showToast('Checkout Complete! Receipt generating...', 'success')
      
      try {
        await generateReceiptPDF({
          salonName: salonName || 'Voxali Salon',
          logoUrl: tenantId ? logoUrl : null, // Assuming useTenant gives logoUrl or we can omit it if not available
          clientName: linkedBookingId ? cart[0]?.name.replace(' (Appointment)', '') : 'Walk-in Client',
          cashierName: staffRecord?.full_name || user?.email || 'Staff',
          ticketNumber: (bookingId || 'POS-1234').split('-')[0].toUpperCase(),
          date: new Date(),
          items: cart.map(c => ({
            name: c.name,
            qty: c.quantity,
            price: c.price
          })),
          subtotal: subtotal,
          tip: customTip,
          total: finalCharge,
          paymentMethod: paymentMethod
        });
      } catch (receiptErr) {
        console.error('Failed to generate receipt PDF', receiptErr);
      }

      setCart([])
      setLinkedBookingId(null)
      setLinkedClientId(null)
      setDepositAlreadyPaid(0)
      setCustomTip(0)
      setShowPaymentModal(false)
      setPaymentMethod('card')
      setSelectedPackageId(null)
      setAppliedGiftCard(null)
      setGiftCardCode('')
      setShowGiftCardInput(false)
      setTerminalStatus('idle')
      fetchData() // Refresh lists

    } catch (err: any) {
      console.error(err)
      showToast('Checkout failed: ' + err.message, 'error')
    }
    setIsProcessing(false)
  }

  const handleApplyGiftCard = async () => {
    if (!giftCardCode || !tenantId) return;
    setCheckingGiftCard(true);
    const { data, error } = await supabase
      .from('gift_cards')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('code', giftCardCode)
      .single();
    
    setCheckingGiftCard(false);

    if (error || !data) {
      return showToast('Invalid or expired Gift Card code.', 'error');
    }

    if (data.status !== 'active' || data.current_balance <= 0) {
      return showToast(`Gift Card is ${data.status} (Balance: $${data.current_balance})`, 'error');
    }

    setAppliedGiftCard(data);
    setShowGiftCardInput(false);
    showToast(`Gift Card applied! Balance: $${data.current_balance}`, 'success');
  }

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenantId || !newProduct.name || !newProduct.price) return
    setIsProcessing(true)
    try {
      const { data, error } = await supabase.from('products').insert({
        tenant_id: tenantId,
        name: newProduct.name,
        sku: newProduct.sku || null,
        price: parseFloat(newProduct.price),
        quantity: parseInt(newProduct.stock) || 0,
        is_active: true
      }).select().single()
      
      if (error) throw error
      
      showToast('Product added successfully', 'success')
      setShowAddProductModal(false)
      setNewProduct({ name: '', sku: '', price: '', stock: '10' })
      fetchData() // Refresh products list
    } catch (err: any) {
      console.error(err)
      showToast('Failed to add product: ' + err.message, 'error')
    }
    setIsProcessing(false)
  }

  // Filtering
  const filteredServices = services.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku?.toLowerCase().includes(searchQuery.toLowerCase()))
  const filteredBookings = todayBookings.filter(b => b.client_name.toLowerCase().includes(searchQuery.toLowerCase()))
  const filteredPackages = packageTemplates.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div className="flex h-[calc(100vh-100px)] gap-6 animate-fade-in">
      
      {/* LEFT COLUMN - THE CART */}
      <div className="w-[400px] flex-shrink-0 glass-panel flex flex-col overflow-hidden relative">
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
          <h3 className="font-bold text-lg text-white">Current Ticket</h3>
          <button onClick={clearCart} className="text-white/40 hover:text-red-400 text-sm transition-colors flex items-center gap-1">
            <Trash2 className="w-4 h-4" /> Clear
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-white/30">
              <ShoppingBag className="w-12 h-12 mb-3 opacity-20" />
              <p>Add items to checkout</p>
            </div>
          ) : (
            cart.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 group">
                <div className="flex-1 min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    {item.type === 'service' ? <Scissors className="w-3.5 h-3.5 text-luxe-gold" /> : 
                     item.type === 'product' ? <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" /> : 
                     item.type === 'package' ? <PackageIcon className="w-3.5 h-3.5 text-luxe-gold" /> : 
                     item.type === 'gift_card' ? <Gift className="w-3.5 h-3.5 text-purple-400" /> : 
                     <ShoppingBag className="w-3.5 h-3.5 text-white/40" />}
                    <h4 className="font-medium text-white truncate text-sm">{item.name}</h4>
                  </div>
                  {item.stylist_name && (
                    <div className="text-[10px] text-luxe-gold/80 uppercase font-black tracking-wider mt-1">
                      Stylist: {item.stylist_name}
                    </div>
                  )}
                  <p className="text-white/40 text-xs mt-1">${item.price.toFixed(2)} each</p>
                </div>
                
                <div className="flex items-center gap-3">
                  {item.type === 'product' && (
                    <div className="flex items-center gap-2 bg-black/40 rounded-lg p-1">
                      <button onClick={() => updateQuantity(i, -1)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 text-white/60 transition-colors"><Minus className="w-3 h-3" /></button>
                      <span className="w-4 text-center text-sm font-semibold">{item.quantity}</span>
                      <button onClick={() => updateQuantity(i, 1)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 text-white/60 transition-colors"><Plus className="w-3 h-3" /></button>
                    </div>
                  )}
                  <div className="text-right w-16">
                    {item.type !== 'product' && (
                      <button onClick={() => updateQuantity(i, -1)} className="text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 mt-[-6px]">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    <span className="font-bold text-white text-sm">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals & Tipping */}
        {cart.length > 0 && (
          <div className="bg-black/40 border-t border-white/10 p-5 mt-auto">
            
            {/* Split Booking Notice */}
            {linkedBookingId && depositAlreadyPaid > 0 && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex justify-between items-center">
                <span className="text-sm font-medium text-emerald-400">Advance Deposit Paid</span>
                <span className="font-bold text-emerald-400">-${depositAlreadyPaid.toFixed(2)}</span>
              </div>
            )}

            {/* Tip Selection */}
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Add Tip</label>
                <div className="relative w-24">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-white/50">$</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Custom"
                    value={customTip || ''}
                    onChange={(e) => setCustomTip(parseFloat(e.target.value) || 0)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg py-1.5 pl-6 pr-2 text-white text-sm focus:outline-none focus:border-luxe-gold"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                {[0, 2, 5, 10, 20].map(amt => (
                  <button
                    key={amt}
                    onClick={() => { setCustomTip(amt) }}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all border ${customTip === amt ? 'bg-luxe-gold text-black border-luxe-gold' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}
                  >
                    {amt === 0 ? 'No Tip' : `$${amt}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Subtotals */}
            <div className="pt-4 border-t border-white/5 space-y-3">
              <div className="flex justify-between text-sm text-white/50">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-white/50">
                <span>Tax (8%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>

              {depositAlreadyPaid > 0 && (
                <div className="flex justify-between text-sm text-blue-400">
                  <span>Deposit Applied</span>
                  <span>-${depositAlreadyPaid.toFixed(2)}</span>
                </div>
              )}

              {appliedGiftCard && (
                <div className="flex flex-col gap-1 p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <div className="flex justify-between text-sm text-purple-400 font-bold">
                    <span className="flex items-center gap-1"><Gift className="w-3 h-3" /> Gift Card ({appliedGiftCard.code.slice(-4)})</span>
                    <span>-${giftCardDiscount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-end text-[10px] text-purple-400/50">
                     Balance remaining after checkout: ${(appliedGiftCard.current_balance - giftCardDiscount).toFixed(2)}
                  </div>
                </div>
              )}

              {customTip > 0 && (
                <div className="flex justify-between text-sm text-white/60">
                  <span>Tip</span>
                  <span>${customTip.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Grand Total */}
            <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-xl">
              <span className="font-bold text-white">Total</span>
              <span className="font-black text-luxe-gold">${finalCharge.toFixed(2)}</span>
            </div>

            {/* Redeem Gift Card inline */}
            {!appliedGiftCard && cart.length > 0 && (
              <div className="mt-4 pt-4 border-t border-dashed border-white/10">
                 {!showGiftCardInput ? (
                    <button onClick={() => setShowGiftCardInput(true)} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-bold">
                      <Gift className="w-3 h-3" /> Apply Gift Card
                    </button>
                 ) : (
                    <div className="flex items-center gap-2 animate-fade-in">
                       <input 
                         value={giftCardCode} 
                         onChange={e => setGiftCardCode(e.target.value.toUpperCase())}
                         placeholder="XXXX-XXXX-XXXX" 
                         className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white uppercase focus:outline-none focus:border-purple-400 font-mono"
                       />
                       <button 
                         onClick={handleApplyGiftCard}
                         disabled={checkingGiftCard || !giftCardCode}
                         className="bg-purple-500 text-white px-3 py-2 rounded text-xs font-bold hover:bg-purple-400 disabled:opacity-50"
                       >
                         {checkingGiftCard ? '...' : 'Apply'}
                       </button>
                       <button onClick={() => { setShowGiftCardInput(false); setGiftCardCode(''); }} className="text-white/40 hover:text-white p-1"><X className="w-4 h-4"/></button>
                    </div>
                 )}
              </div>
            )}

            {/* Checkout Button */}
            <button
              onClick={() => {
                // If they have packages, set payment default to 'package' possibly
                setShowPaymentModal(true)
              }}
              className="w-full mt-6 py-4 rounded-xl bg-gold-gradient text-luxe-obsidian font-black text-lg uppercase tracking-wider hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-luxe-gold/20"
            >
              Checkout — ${finalCharge.toFixed(2)}
            </button>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN - INVENTORY / APPOINTMENTS SEARCH */}
      <div className="flex-1 glass-panel flex flex-col overflow-hidden">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-white/5 overflow-x-auto custom-scrollbar">
          <button 
            onClick={() => setActiveTab('bookings')}
            className={`flex-shrink-0 px-6 py-4 flex items-center justify-center gap-2 font-bold transition-colors ${activeTab === 'bookings' ? 'text-luxe-gold border-b-2 border-luxe-gold bg-luxe-gold/5' : 'text-white/40 hover:bg-white/5'}`}
          >
            <CalendarCheck className="w-4 h-4" /> Bookings
          </button>
          <button 
            onClick={() => setActiveTab('walkin')}
            className={`flex-shrink-0 px-6 py-4 flex items-center justify-center gap-2 font-bold transition-colors ${activeTab === 'walkin' ? 'text-luxe-gold border-b-2 border-luxe-gold bg-luxe-gold/5' : 'text-white/40 hover:bg-white/5'}`}
          >
            <Scissors className="w-4 h-4" /> Services
          </button>
          <button 
            onClick={() => setActiveTab('retail')}
            className={`flex-shrink-0 px-6 py-4 flex items-center justify-center gap-2 font-bold transition-colors ${activeTab === 'retail' ? 'text-luxe-gold border-b-2 border-luxe-gold bg-luxe-gold/5' : 'text-white/40 hover:bg-white/5'}`}
          >
            <ShoppingBag className="w-4 h-4" /> Retail
          </button>
          <button 
            onClick={() => setActiveTab('packages')}
            className={`flex-shrink-0 px-6 py-4 flex items-center justify-center gap-2 font-bold transition-colors ${activeTab === 'packages' ? 'text-luxe-gold border-b-2 border-luxe-gold bg-luxe-gold/5' : 'text-white/40 hover:bg-white/5'}`}
          >
            <PackageIcon className="w-4 h-4" /> Packages
          </button>
          <button 
            onClick={() => setActiveTab('giftcards')}
            className={`flex-shrink-0 px-6 py-4 flex items-center justify-center gap-2 font-bold transition-colors ${activeTab === 'giftcards' ? 'text-VXL-purple border-b-2 border-purple-500 bg-purple-500/5' : 'text-white/40 hover:bg-white/5'}`}
          >
            <Gift className="w-4 h-4 text-purple-400" /> Gift Cards
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-black/20 border-b border-white/5">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder={activeTab === 'giftcards' ? "Search not available..." : `Search ${activeTab}...`}
              value={searchQuery}
              disabled={activeTab === 'giftcards'}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-luxe-gold focus:ring-1 focus:ring-luxe-gold transition-all disabled:opacity-50"
            />
          </div>
        </div>

        {/* Content Grid */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-luxe-gold border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {activeTab === 'bookings' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredBookings.length === 0 ? (
                    <p className="text-white/40 col-span-full text-center py-10">No pending checkouts for today.</p>
                  ) : (
                    filteredBookings.map(b => {
                      const isLate = new Date() > new Date(b.raw_start_time) && (b.status === 'confirmed' || b.status === 'pending');
                      return (
                      <div key={b.id} onClick={() => loadBookingIntoCart(b)} className={`cursor-pointer group p-5 bg-white/5 border rounded-2xl transition-all ${linkedBookingId === b.id ? 'border-luxe-gold box-glow' : isLate ? 'border-red-500/30 bg-red-500/5' : 'border-white/10 hover:border-white/30'}`}>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-xs font-bold px-2 py-1 rounded-md ${isLate ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white/70'}`}>
                                {b.start_time} {isLate && ' • LATE'}
                              </span>
                            </div>
                            <h4 className="text-lg font-bold text-white group-hover:text-luxe-gold transition-colors">{b.client_name}</h4>
                            {b.stylist_name && <p className="text-xs text-luxe-gold/70 mt-1 uppercase tracking-wider font-bold">Stylist: {b.stylist_name}</p>}
                          </div>
                          {b.deposit_paid > 0 && (
                            <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">Paid: ${b.deposit_paid}</span>
                          )}
                        </div>
                        <p className="text-white/50 text-sm mb-4 line-clamp-1">{b.service_names}</p>
                        <div className="flex items-center justify-between mt-auto">
                          <span className="font-bold text-lg text-white">${b.total_price.toFixed(2)}</span>
                          <div className="flex items-center gap-3">
                            {(isLate || b.status === 'confirmed' || b.status === 'pending') && (
                              <button 
                                onClick={(e) => handleMarkNoShow(e, b.id)}
                                className="px-3 py-1.5 rounded bg-red-500/10 text-red-400 text-xs font-bold hover:bg-red-500 hover:text-white transition-colors"
                              >
                                No-Show
                              </button>
                            )}
                            <span className="text-luxe-gold text-sm font-semibold group-hover:translate-x-1 transition-transform">Checkout →</span>
                          </div>
                        </div>
                      </div>
                    )})
                  )}
                </div>
              )}

              {activeTab === 'walkin' && (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredServices.map(s => (
                    <div key={s.id} onClick={() => addToCart(s, 'service')} className="cursor-pointer group p-4 bg-white/5 border border-white/10 rounded-2xl hover:border-luxe-gold hover:bg-luxe-gold/5 transition-all text-center flex flex-col h-full">
                      <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                        <Scissors className="w-5 h-5 text-luxe-gold" />
                      </div>
                      <h4 className="font-semibold text-white text-sm mb-1">{s.name}</h4>
                      <p className="text-white/40 text-xs mb-3">{s.duration} min</p>
                      <div className="mt-auto font-bold text-luxe-gold">${s.price.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'retail' && (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredProducts.map(p => (
                    <div key={p.id} onClick={() => p.stock > 0 && addToCart(p, 'product')} className={`cursor-pointer group p-4 border rounded-2xl transition-all text-center flex flex-col h-full ${p.stock <= 0 ? 'bg-red-500/5 border-red-500/20 opacity-50 cursor-not-allowed' : 'bg-white/5 border-white/10 hover:border-emerald-400 hover:bg-emerald-400/5'}`}>
                      <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                        <ShoppingBag className={`w-5 h-5 ${p.stock <= 0 ? 'text-red-400' : 'text-emerald-400'}`} />
                      </div>
                      <h4 className="font-semibold text-white text-sm mb-1 line-clamp-2 leading-tight">{p.name}</h4>
                      <p className="text-white/40 text-xs mb-3">SKU: {p.sku || 'N/A'}</p>
                      <div className="mt-auto flex items-center justify-between w-full">
                        <span className="font-bold text-white">${p.price.toFixed(2)}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${p.stock <= 0 ? 'bg-red-500/20 text-red-500' : p.stock < 5 ? 'bg-yellow-500/20 text-yellow-500' : 'bg-white/10 text-white/50'}`}>
                          {p.stock} in stock
                        </span>
                      </div>
                    </div>
                  ))}
                  <div onClick={() => addToCart({ id: 'custom', name: 'Custom Charge', price: 10 }, 'custom')} className="cursor-pointer group p-4 bg-white/5 border-y border-x border-white/10 border-dashed rounded-2xl hover:border-luxe-gold hover:bg-luxe-gold/5 transition-all text-center flex items-center justify-center flex-col min-h-[160px]">
                      <Plus className="w-8 h-8 text-white/40 group-hover:text-luxe-gold mb-2" />
                      <span className="font-semibold text-white/50 group-hover:text-luxe-gold">Custom Item</span>
                  </div>
                  <div onClick={() => setShowAddProductModal(true)} className="cursor-pointer group p-4 bg-emerald-500/5 border border-emerald-500/30 border-dashed rounded-2xl hover:border-emerald-400 hover:bg-emerald-400/10 transition-all text-center flex items-center justify-center flex-col min-h-[160px]">
                      <Plus className="w-8 h-8 text-emerald-400/50 group-hover:text-emerald-400 mb-2" />
                      <span className="font-semibold text-emerald-400/70 group-hover:text-emerald-400">Add New Product</span>
                  </div>
                </div>
              )}

              {activeTab === 'packages' && (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredPackages.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-white/40">
                      <PackageIcon className="w-12 h-12 text-white/20 mx-auto mb-4" />
                      <span className="block mb-1">No active package templates.</span>
                      <span className="text-xs">Create templates in the Packages module first.</span>
                    </div>
                  ) : (
                    filteredPackages.map(p => (
                      <div key={p.id} onClick={() => addToCart(p, 'package')} className="cursor-pointer group p-5 bg-gradient-to-br from-white/5 to-transparent border border-white/10 rounded-2xl hover:border-luxe-gold hover:bg-luxe-gold/5 transition-all text-left flex flex-col h-full h-min-[140px]">
                        <div className="flex justify-between items-start mb-2">
                          <PackageIcon className="w-6 h-6 text-luxe-gold group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-bold bg-white/10 px-2 py-0.5 rounded text-white/70">{p.total_uses} credits</span>
                        </div>
                        <h4 className="font-bold text-white text-md mb-3 min-h-[44px]">{p.name}</h4>
                        <div className="mt-auto flex items-end justify-between w-full">
                          <span className="font-black text-luxe-gold text-lg">${p.price.toFixed(2)}</span>
                          <span className="text-xs text-white/30 font-medium">Auto-Issue →</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'giftcards' && (
                <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto animate-in fade-in zoom-in duration-300">
                  <div className="bg-gradient-to-br from-[#3B0764] to-[#581C87] w-full p-8 rounded-3xl border border-purple-500/40 shadow-2xl shadow-purple-500/20 relative overflow-hidden">
                    <div className="absolute top-[-20px] right-[-20px] text-purple-900/30 rotate-12">
                      <Gift size={150} />
                    </div>
                    <div className="relative z-10">
                      <h3 className="text-2xl font-black text-white mb-1">Issue Gift Card</h3>
                      <p className="text-purple-200/60 text-sm mb-6">Will be generated & emailed upon checkout.</p>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-purple-200/50 uppercase tracking-wider mb-2">Card Amount ($) *</label>
                          <input 
                              type="number" value={newGCAmount} onChange={e => setNewGCAmount(e.target.value)}
                              placeholder="e.g. 100" 
                              className="w-full bg-black/40 border border-purple-400/30 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-400 focus:bg-black/60 text-xl font-bold font-mono transition-all box-glow"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-purple-200/50 uppercase tracking-wider mb-2">Recipient Email (Optional)</label>
                          <input 
                              type="email" value={newGCEmail} onChange={e => setNewGCEmail(e.target.value)}
                              placeholder="client@example.com" 
                              className="w-full bg-black/40 border border-purple-400/30 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-400 focus:bg-black/60 transition-all placeholder:text-white/20"
                          />
                        </div>
                        
                        <button 
                          onClick={() => {
                            if (!newGCAmount || parseFloat(newGCAmount) <= 0) return showToast('Enter valid amount', 'error');
                            addToCart({
                              id: crypto.randomUUID(), // Unique for every GC
                              name: 'Gift Card',
                              price: parseFloat(newGCAmount),
                              recipient_email: newGCEmail || undefined
                            }, 'gift_card');
                            setNewGCAmount('');
                            setNewGCEmail('');
                            showToast('Gift Card added to cart', 'success');
                          }}
                          className="w-full mt-4 bg-purple-500 text-white font-bold py-3.5 rounded-xl hover:bg-purple-400 transition-colors uppercase tracking-wider shadow-lg flex justify-center items-center gap-2"
                        >
                          <Plus className="w-5 h-5"/> Add To Cart
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ADD PRODUCT MODAL */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#1A1A1A] border border-white/10 p-8 rounded-2xl max-w-md w-full shadow-2xl relative">
            <button onClick={() => setShowAddProductModal(false)} className="absolute top-6 right-6 text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
              <ShoppingBag className="w-5 h-5 text-emerald-400" />
              Add Retail Product
            </h2>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Product Name <span className="text-red-400">*</span></label>
                <input required type="text" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-400" placeholder="e.g. Olaplex No. 7" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Price ($) <span className="text-red-400">*</span></label>
                  <input required type="number" step="0.01" min="0" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-400" placeholder="30.00" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Initial Stock</label>
                  <input type="number" min="0" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-400" placeholder="10" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">SKU / Barcode (Optional)</label>
                <input type="text" value={newProduct.sku} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-400" placeholder="e.g. OLA-007" />
              </div>
              <button disabled={isProcessing || !newProduct.name || !newProduct.price} type="submit" className="w-full mt-4 py-3 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-400 disabled:opacity-50 transition-colors flex items-center justify-center">
                {isProcessing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Save Product"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-gradient-to-br from-zinc-900 to-black border border-white/10 p-8 rounded-3xl max-w-md w-full shadow-2xl relative">
            <button onClick={() => setShowPaymentModal(false)} className="absolute top-6 right-6 text-white/40 hover:text-white"><X className="w-6 h-6" /></button>
            
            <h2 className="text-2xl font-black text-white mb-2">Complete Payment</h2>
            <p className="text-white/50 mb-8">Select a payment method to finalize the transaction for <strong className="text-white">${finalCharge.toFixed(2)}</strong>.</p>
            
            {/* TERMINAL OVERLAY (Active when sending to Stripe Terminal) */}
            {terminalStatus !== 'idle' ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-6">
                <div className="relative w-24 h-24 flex items-center justify-center">
                  {terminalStatus === 'connecting' && (
                    <>
                      <div className="absolute inset-0 border-4 border-luxe-gold/20 rounded-full animate-ping"></div>
                      <CreditCard className="w-10 h-10 text-luxe-gold animate-pulse" />
                    </>
                  )}
                  {terminalStatus === 'waiting' && (
                    <>
                      <div className="absolute inset-0 border-4 border-luxe-gold border-t-transparent rounded-full animate-spin"></div>
                      <CreditCard className="w-10 h-10 text-white" />
                    </>
                  )}
                  {terminalStatus === 'success' && (
                    <div className="w-24 h-24 bg-emerald-400/20 rounded-full flex items-center justify-center scale-110 transition-transform">
                      <CheckCircle className="w-12 h-12 text-emerald-400" />
                    </div>
                  )}
                </div>
                
                <div className="text-center">
                  {terminalStatus === 'connecting' && <h3 className="text-xl font-bold text-white mb-1">Connecting to Terminal...</h3>}
                  {terminalStatus === 'waiting' && <h3 className="text-xl font-bold text-white mb-1">Waiting for Card...</h3>}
                  {terminalStatus === 'success' && <h3 className="text-xl font-bold text-emerald-400 mb-1">Payment Approved!</h3>}
                  
                  {terminalStatus === 'waiting' && <p className="text-white/50 text-sm">Please ask the customer to tap, insert, or swipe their card on the Stripe WisePOS E terminal.</p>}
                  {terminalStatus === 'connecting' && <p className="text-white/50 text-sm">Waking up Voxali Reader 1...</p>}
                  {terminalStatus === 'success' && <p className="text-white/50 text-sm">Processing transaction records...</p>}
                </div>
              </div>
            ) : (
              <>
            <div className="space-y-3 mb-8">
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => setPaymentMethod('card')}
                  className={`w-full p-4 rounded-xl border flex items-center gap-4 transition-all ${paymentMethod === 'card' ? 'border-luxe-gold bg-luxe-gold/10' : 'border-white/10 bg-white/5 hover:border-white/30'}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${paymentMethod === 'card' ? 'bg-luxe-gold text-black' : 'bg-white/10 text-white'}`}>
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h4 className="font-bold text-white">Credit / Debit Card</h4>
                    <p className="text-white/40 text-sm">{cardEntryMethod === 'terminal' ? 'Send to Stripe Terminal' : 'Manual Entry / Standalone'}</p>
                  </div>
                  {paymentMethod === 'card' && <CheckCircle className="w-5 h-5 text-luxe-gold ml-auto" />}
                </button>
                
                {paymentMethod === 'card' && (
                  <div className="p-3 bg-black/40 border border-white/10 rounded-xl flex gap-2 animate-fade-in shadow-xl mx-2">
                    <button 
                      onClick={() => setCardEntryMethod('terminal')}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${cardEntryMethod === 'terminal' ? 'bg-luxe-gold text-black border-luxe-gold' : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:border-white/30'}`}
                    >
                      <CreditCard className="w-4 h-4" /> Stripe Terminal
                    </button>
                    <button 
                      onClick={() => setCardEntryMethod('manual')}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${cardEntryMethod === 'manual' ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:border-white/30'}`}
                    >
                      Manual Machine
                    </button>
                  </div>
                )}
              </div>

              <button 
                onClick={() => setPaymentMethod('cash')}
                className={`w-full p-4 rounded-xl border flex items-center gap-4 transition-all ${paymentMethod === 'cash' ? 'border-emerald-400 bg-emerald-400/10' : 'border-white/10 bg-white/5 hover:border-white/30'}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${paymentMethod === 'cash' ? 'bg-emerald-400 text-black' : 'bg-white/10 text-white'}`}>
                  <Banknote className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-white">Cash</h4>
                  <p className="text-white/40 text-sm">Collect cash at register</p>
                </div>
                {paymentMethod === 'cash' && <CheckCircle className="w-5 h-5 text-emerald-400 ml-auto" />}
              </button>

              <button 
                onClick={() => setPaymentMethod('split')}
                className={`w-full p-4 rounded-xl border flex items-center gap-4 transition-all ${paymentMethod === 'split' ? 'border-blue-400 bg-blue-400/10' : 'border-white/10 bg-white/5 hover:border-white/30'}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${paymentMethod === 'split' ? 'bg-blue-400 text-black' : 'bg-white/10 text-white'}`}>
                  <SplitSquareVertical className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-white">Split Payment</h4>
                  <p className="text-white/40 text-sm">Part Cash, Part Card</p>
                </div>
                {paymentMethod === 'split' && <CheckCircle className="w-5 h-5 text-blue-400 ml-auto" />}
              </button>

              {/* Package Redemption */}
              {availablePackages.length > 0 && (
                <div className="pt-2">
                  <button 
                    onClick={() => setPaymentMethod('package')}
                    className={`w-full p-4 rounded-xl border flex items-center gap-4 transition-all ${paymentMethod === 'package' ? 'border-purple-400 bg-purple-400/10' : 'border-white/10 bg-white/5 hover:border-purple-400/30 hover:bg-purple-400/5'}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${paymentMethod === 'package' ? 'bg-purple-400 text-black' : 'bg-white/10 text-white'}`}>
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div className="text-left flex-1">
                      <h4 className="font-bold text-white">Redeem Package Credit</h4>
                      <p className={`text-sm ${paymentMethod === 'package' ? 'text-purple-300' : 'text-purple-400 font-bold'}`}>
                        {availablePackages.length} active package(s) available
                      </p>
                    </div>
                    {paymentMethod === 'package' && <CheckCircle className="w-5 h-5 text-purple-400 ml-auto" />}
                  </button>
                  
                  {paymentMethod === 'package' && (
                    <div className="p-4 bg-black/40 border border-white/10 rounded-xl mt-2 mx-2 space-y-2">
                      <p className="text-xs text-white/50 uppercase tracking-wider font-bold mb-2">Select Package to Redeem</p>
                      {availablePackages.map(pkg => (
                        <label key={pkg.id} className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-purple-400/10 hover:border-purple-400/30 transition-all">
                          <input 
                            type="radio" 
                            name="packageSelection" 
                            checked={selectedPackageId === pkg.id}
                            onChange={() => setSelectedPackageId(pkg.id)}
                            className="w-4 h-4 accent-purple-500"
                          />
                          <div className="flex-1">
                            <span className="font-bold text-white">{pkg.template?.name}</span>
                            <span className="block text-xs text-white/50">{pkg.remaining_uses} credits remaining</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {paymentMethod === 'split' && (
              <div className="mb-8 p-4 bg-black/40 rounded-xl border border-white/10 animate-fade-in mt-[-1rem]">
                <label className="text-sm font-semibold text-white/50 block mb-2">Cash Amount Collected</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-white">$</span>
                  <input
                    type="number"
                    min="0"
                    max={finalCharge}
                    value={cashAmount || ''}
                    onChange={(e) => setCashAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-8 pr-4 text-white font-bold focus:outline-none focus:border-blue-400 transition-colors"
                  />
                </div>
                <div className="flex justify-between mt-3 text-sm">
                  <span className="text-white/50">Remaining on Card:</span>
                  <span className="font-bold text-luxe-gold">${Math.max(0, finalCharge - cashAmount).toFixed(2)}</span>
                </div>
              </div>
            )}

            <button
              onClick={processCheckout}
              disabled={isProcessing}
              className={`w-full py-4 rounded-xl font-black text-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg mt-4 ${
                paymentMethod === 'card' && cardEntryMethod === 'terminal' 
                ? 'bg-blue-500 text-white shadow-blue-500/20' 
                : 'bg-gold-gradient text-luxe-obsidian shadow-luxe-gold/20'
              }`}
            >
              {isProcessing ? (
                <><div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div> Processing...</>
              ) : (
                paymentMethod === 'card' && cardEntryMethod === 'terminal' ? 'Send to Terminal' : 'Confirm Transaction'
              )}
            </button>
            </>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
