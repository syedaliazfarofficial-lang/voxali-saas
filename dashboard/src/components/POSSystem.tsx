import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useTenant } from '../context/TenantContext'
import { useAuth } from '../context/AuthContext'
import { showToast } from './ui/ToastNotification'
import {
  CreditCard, Banknote, ShoppingBag, Scissors, CalendarCheck,
  Search, Plus, Minus, Trash2, X, CheckCircle, SplitSquareVertical, Receipt, Gift,
  MoreHorizontal, Clock, User, ChevronRight, Check
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
  const { tenantId, timezone, salonName, logoUrl, taxRate } = useTenant()
  const { user, staffRecord } = useAuth()
  
  // Views
  const [activeTab, setActiveTab] = useState<'walkin' | 'bookings' | 'retail' | 'packages' | 'giftcards'>('bookings')
  
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
  const [newProduct, setNewProduct] = useState({ name: '', sku: '', price: '', stock: '10', threshold: '5' })
  // Restock modal
  const [restockProductId, setRestockProductId] = useState<string | null>(null)
  const [restockProductName, setRestockProductName] = useState('')
  const [restockQty, setRestockQty] = useState('')
  const [restockThreshold, setRestockThreshold] = useState('5')
  const [isRestocking, setIsRestocking] = useState(false)
  
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
  
  // Actions Dropdown State
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const actionsMenuRef = useRef<HTMLDivElement>(null)

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node)) {
        setShowActionsMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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
        if (data) setProducts(data.map(p => ({ ...p, stock: p.quantity, low_stock_threshold: 5 })))
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
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: timezone })
        const [y, m, d] = todayStr.split('-').map(Number)

        // Get salon's UTC offset correctly (not browser's timezone)
        const refDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
        const tzStr = refDate.toLocaleString('en-US', { timeZone: timezone, timeZoneName: 'shortOffset' })
        const offMatch = tzStr.match(/GMT([+-])(\d+)(?::(\d+))?/)
        const sign = offMatch?.[1] === '+' ? 1 : -1
        const offH = parseInt(offMatch?.[2] || '0')
        const offMins = parseInt(offMatch?.[3] || '0')
        const offsetMin = sign * (offH * 60 + offMins)

        const startOfDay = new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - offsetMin * 60000).toISOString()
        const endOfDay = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) - offsetMin * 60000).toISOString()

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
            start_time: new Date(b.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: timezone }),
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
  const tax = taxableSubtotal * (taxRate ?? 0.08) // from tenant settings
  
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
            notes: primaryServiceId === '00000000-0000-0000-0000-000000000000' ? 'POS Retail' : 'POS Walk-in'
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
        // ✅ Fetch LIVE stock from DB — don't use stale React state
        const { data: freshProd } = await supabase
          .from('products').select('quantity, name').eq('id', item.id).single();
        
        if (freshProd) {
          const oldStock = freshProd.quantity;
          const newStock = Math.max(0, oldStock - item.quantity);
          await supabase.from('products').update({ quantity: newStock }).eq('id', item.id);

          console.log(`[Stock] ${freshProd.name}: ${oldStock} → ${newStock}`);

          // ✅ threshold default 5 (until DB column migration is applied)
          const threshold = 5;

          // ✅ LOW STOCK ALERT: crosses threshold going down (not yet zero)
          if (oldStock > threshold && newStock <= threshold && newStock > 0) {
            console.log(`[Alert] Low stock triggered for ${freshProd.name}: ${newStock} units`);
            supabase.functions.invoke('send-low-balance-alert', {
              body: { tenant_id: tenantId, alert_type: 'low_stock', product_name: freshProd.name, current_stock: newStock, threshold }
            }).catch(e => console.warn('Low stock alert error:', e));
          }

          // ✅ OUT OF STOCK ALERT: always fires when newStock is 0 (regardless of oldStock)
          if (newStock === 0) {
            console.log(`[Alert] Out of stock triggered for ${freshProd.name}`);
            supabase.functions.invoke('send-low-balance-alert', {
              body: { tenant_id: tenantId, alert_type: 'low_stock', product_name: freshProd.name, current_stock: 0, threshold: 0 }
            }).catch(e => console.warn('Out of stock alert error:', e));
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
          tax: tax,
          taxRate: taxRate ?? 0.08,
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
      const { error } = await supabase.from('products').insert({
        tenant_id: tenantId,
        name: newProduct.name,
        sku: newProduct.sku || null,
        price: parseFloat(newProduct.price),
        quantity: parseInt(newProduct.stock) || 0,
        low_stock_threshold: parseInt(newProduct.threshold) || 5,
        is_active: true
      })
      if (error) throw error
      showToast('Product added successfully', 'success')
      setShowAddProductModal(false)
      setNewProduct({ name: '', sku: '', price: '', stock: '10', threshold: '5' })
      fetchData()
    } catch (err: any) {
      showToast('Failed to add product: ' + err.message, 'error')
    }
    setIsProcessing(false)
  }

  const handleRestock = async () => {
    if (!restockProductId || !restockQty) return
    setIsRestocking(true)
    try {
      const addQty = parseInt(restockQty) || 0
      const { data: current } = await supabase.from('products').select('quantity').eq('id', restockProductId).single()
      const newQty = (current?.quantity || 0) + addQty
      const { error } = await supabase.from('products').update({
        quantity: newQty,
        low_stock_threshold: parseInt(restockThreshold) || 5,
        is_active: true
      }).eq('id', restockProductId)
      if (error) throw error
      showToast(`✅ Restocked! New stock: ${newQty} units`, 'success')
      setRestockProductId(null)
      setRestockQty('')
      fetchData()
    } catch (err: any) {
      showToast('Restock failed: ' + err.message, 'error')
    }
    setIsRestocking(false)
  }

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!window.confirm(`Remove "${productName}" from your product list?`)) return
    const { error } = await supabase.from('products').update({ is_active: false }).eq('id', productId)
    if (error) { showToast('Failed to remove product', 'error'); return }
    showToast(`"${productName}" removed`, 'success')
    fetchData()
  }

  // Filtering
  const filteredServices = services.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku?.toLowerCase().includes(searchQuery.toLowerCase()))
  const filteredBookings = todayBookings.filter(b => b.client_name.toLowerCase().includes(searchQuery.toLowerCase()))
  const filteredPackages = packageTemplates.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div className="flex flex-col h-[calc(100vh-50px)] gap-4 animate-fade-in">
      
      {/* PAGE HEADER (ClientCRM style: Icon + Title + Unified Stats Capsule) */}
      <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-4 flex-shrink-0">
        
        {/* Left Side: Icon + Title + Stats Capsule */}
        <div className="flex items-center gap-4 flex-nowrap min-w-0">
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="p-2 bg-luxe-gold/10 rounded-xl border border-luxe-gold/20">
              <CreditCard className="w-5 h-5 text-luxe-gold" />
            </div>
            <div>
              <h3 className="text-base font-bold whitespace-nowrap text-white">POS Terminal</h3>
              <p className="text-[9px] text-white/40 uppercase tracking-widest whitespace-nowrap">Checkout & Sales</p>
            </div>
          </div>
          
          {/* Unified Stats Capsule */}
          <div className="flex items-center gap-3.5 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs text-white/50 flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-white/40 uppercase font-black tracking-wider">Tickets</span>
              <span className="font-bold text-white">{todayBookings.length}</span>
            </div>
            <div className="h-3 w-[1px] bg-white/10" />
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-white/40 uppercase font-black tracking-wider">Cart Items</span>
              <span className="font-bold text-luxe-gold">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
            </div>
            <div className="h-3 w-[1px] bg-white/10" />
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-white/40 uppercase font-black tracking-wider">Tax Rate</span>
              <span className="font-bold text-blue-400">{((taxRate ?? 0.08) * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* Right Side: Tab segmented control + Search input + 3-dots actions menu */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Segmented Control Tabs */}
          <div className="flex bg-white/5 border border-white/10 rounded-full p-1 gap-1 flex-shrink-0">
            <button 
              onClick={() => { setActiveTab('bookings'); setSearchQuery(''); }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'bookings' ? 'bg-white text-black shadow-md' : 'text-white/40 hover:text-white'}`}
            >
              <CalendarCheck className="w-3.5 h-3.5" /> Bookings
            </button>
            <button 
              onClick={() => { setActiveTab('walkin'); setSearchQuery(''); }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'walkin' ? 'bg-white text-black shadow-md' : 'text-white/40 hover:text-white'}`}
            >
              <Scissors className="w-3.5 h-3.5" /> Services
            </button>
            <button 
              onClick={() => { setActiveTab('retail'); setSearchQuery(''); }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === 'retail' ? 'bg-white text-black shadow-md' : 'text-white/40 hover:text-white'}`}
            >
              <ShoppingBag className="w-3.5 h-3.5" /> Retail
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-44 max-w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder={activeTab === 'giftcards' ? "Search not available..." : `Search ${activeTab === 'walkin' ? 'services' : activeTab}...`}
              value={searchQuery}
              disabled={activeTab === 'giftcards'}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-all disabled:opacity-50"
            />
          </div>

          {/* Actions Dropdown Button (3-dots) */}
          <div className="relative" ref={actionsMenuRef}>
            <button
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              className={`p-1.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all flex items-center justify-center ${showActionsMenu || activeTab === 'packages' || activeTab === 'giftcards' ? 'text-luxe-gold border-luxe-gold/30 bg-white/10' : 'text-white/60 hover:text-white'}`}
              title="More Actions"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            
            {showActionsMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-luxe-obsidian border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <button
                  onClick={() => { setShowActionsMenu(false); setActiveTab('packages'); setSearchQuery(''); }}
                  className={`w-full px-4 py-2.5 text-left text-xs flex items-center gap-2 hover:bg-white/5 transition-colors ${activeTab === 'packages' ? 'text-luxe-gold font-bold bg-white/5' : 'text-white/80'}`}
                >
                  <PackageIcon className="w-3.5 h-3.5 text-luxe-gold" /> Sell Packages
                </button>
                <button
                  onClick={() => { setShowActionsMenu(false); setActiveTab('giftcards'); setSearchQuery(''); }}
                  className={`w-full px-4 py-2.5 text-left text-xs flex items-center gap-2 hover:bg-white/5 transition-colors ${activeTab === 'giftcards' ? 'text-purple-400 font-bold bg-white/5' : 'text-white/80'}`}
                >
                  <Gift className="w-3.5 h-3.5 text-purple-400" /> Issue Gift Cards
                </button>
                <div className="h-[1px] bg-white/10 my-1" />
                <button
                  onClick={() => { setShowActionsMenu(false); setShowAddProductModal(true); }}
                  className="w-full px-4 py-2.5 text-left text-xs flex items-center gap-2 hover:bg-white/5 text-white/80 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" /> Add New Product
                </button>
                <button
                  onClick={() => { setShowActionsMenu(false); addToCart({ id: 'custom', name: 'Custom Charge', price: 10 }, 'custom'); }}
                  className="w-full px-4 py-2.5 text-left text-xs flex items-center gap-2 hover:bg-white/5 text-white/80 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-400" /> Custom Charge
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* COLUMNS CONTAINER */}
      <div className="flex flex-1 gap-6 overflow-hidden min-h-0">
        
        {/* LEFT COLUMN - THE CART */}
        <div className="w-[380px] flex-shrink-0 glass-panel flex flex-col overflow-hidden relative">
          <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
          <h3 className="font-bold text-lg text-white">Current Ticket</h3>
          <button onClick={clearCart} className="text-white/40 hover:text-red-400 text-sm transition-colors flex items-center gap-1">
            <Trash2 className="w-4 h-4" /> Clear
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-white/30">
              <ShoppingBag className="w-12 h-12 mb-3 opacity-20" />
              <p>Add items to checkout</p>
            </div>
          ) : (
            cart.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-1.5 rounded-lg bg-white/5 border border-white/5 group">
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    {item.type === 'service' ? <Scissors className="w-3 h-3 text-luxe-gold" /> : 
                     item.type === 'product' ? <ShoppingBag className="w-3 h-3 text-emerald-400" /> : 
                     item.type === 'package' ? <PackageIcon className="w-3 h-3 text-luxe-gold" /> : 
                     item.type === 'gift_card' ? <Gift className="w-3 h-3 text-purple-400" /> : 
                     <ShoppingBag className="w-3 h-3 text-white/40" />}
                    <h4 className="font-semibold text-white truncate text-[11px]">{item.name}</h4>
                  </div>
                  {item.stylist_name && (
                    <div className="text-[8px] text-luxe-gold/80 uppercase font-black tracking-wider mt-0.5 pl-4.5">
                      Stylist: {item.stylist_name}
                    </div>
                  )}
                  <p className="text-white/40 text-[9px] mt-0.5 pl-4.5">${item.price.toFixed(2)} each</p>
                </div>
                
                <div className="flex items-center gap-2">
                  {item.type === 'product' && (
                    <div className="flex items-center gap-1 bg-black/40 rounded-full p-0.5">
                      <button onClick={() => updateQuantity(i, -1)} className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-white/10 text-white/60 transition-colors"><Minus className="w-2 h-2" /></button>
                      <span className="w-3.5 text-center text-[10px] font-semibold">{item.quantity}</span>
                      <button onClick={() => updateQuantity(i, 1)} className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-white/10 text-white/60 transition-colors"><Plus className="w-2 h-2" /></button>
                    </div>
                  )}
                  <div className="text-right w-14 relative flex items-center justify-end">
                    {item.type !== 'product' && (
                      <button onClick={() => updateQuantity(i, -1)} className="text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity absolute right-16">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <span className="font-bold text-white text-[11px]">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals & Tipping */}
        {cart.length > 0 && (
          <div className="bg-black/40 border-t border-white/10 p-3.5 mt-auto">
            
            {/* Split Booking Notice */}
            {linkedBookingId && depositAlreadyPaid > 0 && (
              <div className="mb-3 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex justify-between items-center">
                <span className="text-xs font-medium text-emerald-400">Advance Deposit Paid</span>
                <span className="font-bold text-emerald-400 text-xs">-${depositAlreadyPaid.toFixed(2)}</span>
              </div>
            )}

            {/* Tip Selection - Compact Inline Row */}
            <div className="flex items-center justify-between gap-1.5 mb-2 bg-white/5 border border-white/10 p-1 rounded-full">
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider pl-3.5 flex-shrink-0">Tip</span>
              <div className="flex gap-1 flex-1">
                {[0, 2, 5, 10, 20].map(amt => (
                  <button
                    key={amt}
                    onClick={() => { setCustomTip(amt) }}
                    className={`flex-1 py-1 rounded-full text-[10px] font-bold transition-all border ${customTip === amt ? 'bg-white text-black border-white shadow-sm' : 'bg-transparent border-transparent text-white/40 hover:text-white'}`}
                  >
                    {amt === 0 ? 'No' : `$${amt}`}
                  </button>
                ))}
              </div>
              <div className="relative w-16 pl-1.5 border-l border-white/10">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-white/40 text-[9px]">$</span>
                <input
                  type="number"
                  min="0"
                  placeholder="Custom"
                  value={customTip || ''}
                  onChange={(e) => setCustomTip(parseFloat(e.target.value) || 0)}
                  className="w-full bg-transparent border-none py-0.5 pl-4.5 pr-2 text-white text-[10px] focus:outline-none text-right font-bold placeholder:font-normal placeholder:text-white/20"
                />
              </div>
            </div>

            {/* Subtotals - Compact */}
            <div className="pt-2 border-t border-white/5 space-y-1">
              <div className="flex justify-between text-[11px] text-white/50">
                <span>Subtotal</span>
                <span className="font-semibold text-white/70">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-white/50">
                <span>Tax ({((taxRate ?? 0.08) * 100).toFixed(taxRate && taxRate % 0.01 !== 0 ? 3 : 0)}%)</span>
                <span className="font-semibold text-white/70">${tax.toFixed(2)}</span>
              </div>

              {depositAlreadyPaid > 0 && (
                <div className="flex justify-between text-[11px] text-blue-400">
                  <span>Deposit Applied</span>
                  <span>-${depositAlreadyPaid.toFixed(2)}</span>
                </div>
              )}

              {appliedGiftCard && (
                <div className="flex flex-col gap-0.5 p-1.5 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                  <div className="flex justify-between text-[11px] text-purple-400 font-bold">
                    <span className="flex items-center gap-1"><Gift className="w-3 h-3" /> Gift Card ({appliedGiftCard.code.slice(-4)})</span>
                    <span>-${giftCardDiscount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-end text-[9px] text-purple-400/50">
                     Remaining: ${(appliedGiftCard.current_balance - giftCardDiscount).toFixed(2)}
                  </div>
                </div>
              )}

              {customTip > 0 && (
                <div className="flex justify-between text-[11px] text-white/60">
                  <span>Tip</span>
                  <span>${customTip.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Grand Total - Compact */}
            <div className="mt-2 pt-2 border-t border-white/10 flex justify-between items-center text-sm">
              <span className="font-bold text-white">Total</span>
              <span className="font-black text-luxe-gold">${finalCharge.toFixed(2)}</span>
            </div>

            {/* Redeem Gift Card inline */}
            {!appliedGiftCard && cart.length > 0 && (
              <div className="mt-2 pt-2 border-t border-dashed border-white/10">
                 {!showGiftCardInput ? (
                    <button onClick={() => setShowGiftCardInput(true)} className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-bold">
                      <Gift className="w-3 h-3" /> Apply Gift Card
                    </button>
                 ) : (
                    <div className="flex items-center gap-2 animate-fade-in">
                       <input 
                         value={giftCardCode} 
                         onChange={e => setGiftCardCode(e.target.value.toUpperCase())}
                         placeholder="XXXX-XXXX-XXXX" 
                         className="flex-1 bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs text-white uppercase focus:outline-none focus:border-purple-400 font-mono"
                       />
                       <button 
                         onClick={handleApplyGiftCard}
                         disabled={checkingGiftCard || !giftCardCode}
                         className="bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-bold hover:bg-purple-400 disabled:opacity-50"
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
                setShowPaymentModal(true)
              }}
              className="w-full mt-3 py-2 rounded-full bg-gold-gradient text-luxe-obsidian font-black text-xs uppercase tracking-wider hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-luxe-gold/20"
            >
              Checkout — ${finalCharge.toFixed(2)}
            </button>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN - INVENTORY / APPOINTMENTS SEARCH */}
      <div className="flex-1 glass-panel flex flex-col overflow-hidden">
        
        {/* Content Grid */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-luxe-gold border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {activeTab === 'bookings' && (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filteredBookings.length === 0 ? (
                    <p className="text-white/40 col-span-full text-center py-10">No pending checkouts for today.</p>
                  ) : (
                    filteredBookings.map(b => {
                      const isLate = new Date() > new Date(b.raw_start_time) && (b.status === 'confirmed' || b.status === 'pending');
                      const isSelected = linkedBookingId === b.id;
                      return (
                      <div 
                        key={b.id} 
                        onClick={() => loadBookingIntoCart(b)} 
                        className={`cursor-pointer group p-3.5 rounded-xl transition-all duration-300 relative border flex flex-col justify-between ${
                          isSelected 
                            ? 'border-luxe-gold bg-luxe-gold/[0.04] shadow-[0_4px_20px_rgba(212,175,55,0.15)] ring-1 ring-luxe-gold/20' 
                            : isLate 
                              ? 'border-red-500/20 bg-red-500/[0.01] hover:border-red-500/40' 
                              : 'border-white/5 bg-white/[0.01] hover:border-white/10 hover:bg-white/[0.02]'
                        }`}
                      >
                        {/* Time & Price Header Row */}
                        <div className="flex justify-between items-center gap-2 mb-2.5">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isLate ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-white/5 text-white/60 border border-white/10'}`}>
                            {b.start_time} {isLate && ' • LATE'}
                          </span>
                          <span className="font-extrabold text-[11px] text-white bg-white/5 px-2 py-0.5 rounded-full border border-white/5 shrink-0">
                            ${b.total_price.toFixed(2)}
                          </span>
                        </div>

                        {/* Client details & Stylist */}
                        <div className="mb-2">
                          <h4 className="text-[13px] font-bold text-white group-hover:text-luxe-gold transition-colors truncate">
                            {b.client_name}
                          </h4>
                          {b.stylist_name && (
                            <p className="text-[9px] text-white/40 mt-0.5 truncate">
                              Stylist: <span className="text-luxe-gold/80 font-bold">{b.stylist_name}</span>
                            </p>
                          )}
                        </div>

                        {/* Services List Block (Simple, one-line truncated text to save vertical space) */}
                        <p className="text-white/50 text-[11px] mb-3 line-clamp-1 truncate">
                          {b.service_names}
                        </p>

                        {/* Bottom Actions Row */}
                        <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-white/5 mt-auto">
                          {/* Deposit Status or empty spacer */}
                          {b.deposit_paid > 0 ? (
                            <span className="text-[8px] font-black text-emerald-400 uppercase tracking-wider shrink-0">
                              ✓ Paid: ${b.deposit_paid}
                            </span>
                          ) : (
                            <span />
                          )}

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* No Show Button */}
                            {(isLate || b.status === 'confirmed' || b.status === 'pending') && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleMarkNoShow(e, b.id); }}
                                className="px-2 py-1 rounded bg-red-500/15 hover:bg-red-500/30 text-red-400 text-[9px] font-bold transition-colors whitespace-nowrap"
                              >
                                No-Show
                              </button>
                            )}
                            <span className="text-luxe-gold text-[9px] font-black uppercase tracking-wider group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 whitespace-nowrap">
                              Checkout →
                            </span>
                          </div>
                        </div>
                      </div>
                    )})
                  )}
                </div>
              )}

              {activeTab === 'walkin' && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {filteredServices.map(s => {
                    const isInCart = cart.some(item => item.type === 'service' && item.service_id === s.id);
                    const cartItem = cart.find(item => item.type === 'service' && item.service_id === s.id);
                    const qty = cartItem ? cartItem.quantity : 0;
                    return (
                      <div 
                        key={s.id} 
                        onClick={() => addToCart(s, 'service')} 
                        className={`cursor-pointer group p-2.5 rounded-xl transition-all text-center flex flex-col h-full relative ${
                          isInCart 
                            ? 'border-luxe-gold bg-luxe-gold/5 box-glow' 
                            : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/[0.02]'
                        }`}
                      >
                        {isInCart && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-luxe-gold text-luxe-obsidian flex items-center justify-center text-[9px] font-black shadow-lg animate-fade-in">
                            {qty}
                          </div>
                        )}
                        <div className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-1.5 group-hover:scale-105 transition-transform">
                          <Scissors className="w-3.5 h-3.5 text-luxe-gold" />
                        </div>
                        <h4 className="font-semibold text-white text-xs mb-0.5 line-clamp-1 leading-tight">{s.name}</h4>
                        <p className="text-white/40 text-[10px] mb-2">{s.duration} min</p>
                        <div className="mt-auto font-bold text-luxe-gold text-xs">${s.price.toFixed(2)}</div>
                      </div>
                    )
                  })}
                </div>
              )}

              {activeTab === 'retail' && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {filteredProducts.map(p => {
                    const threshold = p.low_stock_threshold ?? 5;
                    const isLow = p.stock > 0 && p.stock <= threshold;
                    const isOut = p.stock <= 0;
                    const isInCart = cart.some(item => item.type === 'product' && item.id === p.id);
                    const cartItem = cart.find(item => item.type === 'product' && item.id === p.id);
                    const qty = cartItem ? cartItem.quantity : 0;
                    return (
                    <div key={p.id} className={`group relative border rounded-xl transition-all flex flex-col h-full overflow-hidden ${
                      isInCart
                        ? 'border-luxe-gold bg-luxe-gold/5 box-glow'
                        : isOut 
                          ? 'bg-red-500/5 border-red-500/20' 
                          : isLow 
                            ? 'bg-yellow-500/5 border-yellow-500/30' 
                            : 'bg-white/5 border-white/10 hover:border-white/30'
                    }`}>
                      {/* Clickable area to add to cart */}
                      <div
                        onClick={() => !isOut && addToCart(p, 'product')}
                        className={`p-2.5 text-center flex-1 flex flex-col relative ${isOut ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-white/5'} transition-all`}
                      >
                        {isInCart && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-luxe-gold text-luxe-obsidian flex items-center justify-center text-[9px] font-black shadow-lg animate-fade-in">
                            {qty}
                          </div>
                        )}
                        <div className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform duration-200">
                          <ShoppingBag className={`w-4 h-4 ${isOut ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-emerald-400'}`} />
                        </div>
                        <h4 className="font-semibold text-white text-xs mb-0.5 line-clamp-1 leading-tight">{p.name}</h4>
                        <p className="text-white/40 text-[9px] mb-2">SKU: {p.sku || 'N/A'}</p>
                        <div className="mt-auto flex items-center justify-between w-full gap-1">
                          <span className="font-bold text-white text-xs">${p.price.toFixed(2)}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full truncate max-w-[65px] ${
                            isOut ? 'bg-red-500/20 text-red-400' : isLow ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/10 text-white/50'
                          }`}>
                            {isOut ? 'Out' : `${p.stock}`}
                          </span>
                        </div>
                        {isLow && !isOut && <p className="text-yellow-400/60 text-[8px] mt-0.5">⚠️ Low ({threshold})</p>}
                      </div>
                      {/* Action buttons */}
                      <div className="flex border-t border-white/5">
                        <button
                          onClick={(e) => { e.stopPropagation(); setRestockProductId(p.id); setRestockProductName(p.name); setRestockThreshold(String(threshold)); setRestockQty(''); }}
                          title="Restock"
                          className="flex-1 py-1.5 text-[9px] font-bold text-emerald-400 hover:bg-emerald-400/10 transition-colors flex items-center justify-center gap-0.5 border-r border-white/5"
                        >
                          <Plus className="w-2.5 h-2.5" /> Stock
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteProduct(p.id, p.name); }}
                          title="Remove product"
                          className="flex-1 py-1.5 text-[9px] font-bold text-red-400/60 hover:bg-red-400/10 hover:text-red-400 transition-colors flex items-center justify-center gap-0.5"
                        >
                          <Trash2 className="w-2.5 h-2.5" /> Delete
                        </button>
                      </div>
                    </div>
                  )})}

                </div>
              )}

              {activeTab === 'packages' && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {filteredPackages.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-white/40">
                      <PackageIcon className="w-12 h-12 text-white/20 mx-auto mb-4" />
                      <span className="block mb-1">No active package templates.</span>
                      <span className="text-xs">Create templates in the Packages module first.</span>
                    </div>
                  ) : (
                    filteredPackages.map(p => {
                      const isInCart = cart.some(item => item.type === 'package' && item.template_id === p.id);
                      const cartItem = cart.find(item => item.type === 'package' && item.template_id === p.id);
                      const qty = cartItem ? cartItem.quantity : 0;
                      return (
                        <div 
                          key={p.id} 
                          onClick={() => addToCart(p, 'package')} 
                          className={`cursor-pointer group p-3 bg-gradient-to-br from-white/5 to-transparent border rounded-xl transition-all text-left flex flex-col h-full min-h-[110px] relative ${
                            isInCart 
                              ? 'border-luxe-gold bg-luxe-gold/5 box-glow' 
                              : 'border-white/10 hover:border-white/30'
                          }`}
                        >
                          {isInCart && (
                            <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-luxe-gold text-luxe-obsidian flex items-center justify-center text-[9px] font-black shadow-lg animate-fade-in">
                              {qty}
                            </div>
                          )}
                          <div className="flex justify-between items-start mb-1.5">
                            <PackageIcon className="w-4 h-4 text-luxe-gold group-hover:scale-105 transition-transform" />
                            <span className="text-[9px] font-bold bg-white/10 px-1 py-0.5 rounded text-white/70">{p.total_uses} cr</span>
                          </div>
                          <h4 className="font-bold text-white text-xs mb-2 line-clamp-2 leading-tight">{p.name}</h4>
                          <div className="mt-auto flex items-end justify-between w-full gap-1">
                            <span className="font-black text-luxe-gold text-xs">${p.price.toFixed(2)}</span>
                            <span className="text-[9px] text-white/30 font-medium">Issue →</span>
                          </div>
                        </div>
                      )
                    })
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

      </div> {/* Close columns container */}

      {/* ADD PRODUCT MODAL */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
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
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Price ($) <span className="text-red-400">*</span></label>
                  <input required type="number" step="0.01" min="0" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-emerald-400" placeholder="30.00" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Initial Stock</label>
                  <input type="number" min="0" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-emerald-400" placeholder="10" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-yellow-400/70 uppercase tracking-wider mb-2">⚠️ Alert Below</label>
                  <input type="number" min="0" value={newProduct.threshold} onChange={e => setNewProduct({...newProduct, threshold: e.target.value})} className="w-full bg-black/40 border border-yellow-400/20 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-yellow-400" placeholder="5" />
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
      {/* RESTOCK MODAL */}
      {restockProductId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#1A1A1A] border border-emerald-500/30 p-8 rounded-2xl max-w-sm w-full shadow-2xl relative">
            <button onClick={() => setRestockProductId(null)} className="absolute top-6 right-6 text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
            <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-3">
              <ShoppingBag className="w-5 h-5 text-emerald-400" />
              Restock Product
            </h2>
            <p className="text-white/40 text-sm mb-6">{restockProductName}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Units to Add <span className="text-red-400">*</span></label>
                <input
                  autoFocus type="number" min="1" value={restockQty}
                  onChange={e => setRestockQty(e.target.value)}
                  className="w-full bg-black/40 border border-emerald-400/30 rounded-xl px-4 py-3 text-white text-xl font-bold focus:outline-none focus:border-emerald-400"
                  placeholder="e.g. 20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-yellow-400/70 uppercase tracking-wider mb-2">⚠️ Send Alert Email When Below</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number" min="0" value={restockThreshold}
                    onChange={e => setRestockThreshold(e.target.value)}
                    className="w-full bg-black/40 border border-yellow-400/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-400"
                    placeholder="5"
                  />
                  <span className="text-white/30 text-sm whitespace-nowrap">units</span>
                </div>
                <p className="text-white/30 text-xs mt-1">Email alert goes to your owner notification email</p>
              </div>
              <button
                onClick={handleRestock}
                disabled={isRestocking || !restockQty}
                className="w-full py-3 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-400 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {isRestocking
                  ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  : <><Plus className="w-4 h-4" /> Confirm Restock</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-zinc-950/95 backdrop-blur-xl border border-white/10 p-6 rounded-2xl max-w-sm w-full shadow-[0_10px_50px_rgba(0,0,0,0.8)] relative">
            <button 
              onClick={() => setShowPaymentModal(false)} 
              className="absolute top-5 right-5 text-white/40 hover:text-white hover:bg-white/5 p-1 rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h2 className="text-lg font-bold text-white tracking-tight mb-0.5">Complete Payment</h2>
            <p className="text-xs text-white/40 mb-5">Select a payment method to finalize the transaction for <strong className="text-white">${finalCharge.toFixed(2)}</strong>.</p>
            
            {/* TERMINAL OVERLAY (Active when sending to Stripe Terminal) */}
            {terminalStatus !== 'idle' ? (
              <div className="flex flex-col items-center justify-center py-6 space-y-4">
                <div className="relative w-20 h-20 flex items-center justify-center">
                  {terminalStatus === 'connecting' && (
                    <>
                      <div className="absolute inset-0 border-4 border-white/20 rounded-full animate-ping"></div>
                      <CreditCard className="w-8 h-8 text-white animate-pulse" />
                    </>
                  )}
                  {terminalStatus === 'waiting' && (
                    <>
                      <div className="absolute inset-0 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                      <CreditCard className="w-8 h-8 text-white" />
                    </>
                  )}
                  {terminalStatus === 'success' && (
                    <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center scale-110 transition-transform">
                      <Check className="w-10 h-10 text-white stroke-[2.5]" />
                    </div>
                  )}
                </div>
                
                <div className="text-center px-2">
                  {terminalStatus === 'connecting' && <h3 className="text-base font-bold text-white mb-1">Connecting to Terminal...</h3>}
                  {terminalStatus === 'waiting' && <h3 className="text-base font-bold text-white mb-1">Waiting for Card...</h3>}
                  {terminalStatus === 'success' && <h3 className="text-base font-bold text-white mb-1">Payment Approved!</h3>}
                  
                  {terminalStatus === 'waiting' && <p className="text-white/50 text-[11px] leading-relaxed">Please ask the customer to tap, insert, or swipe their card on the Stripe WisePOS E terminal.</p>}
                  {terminalStatus === 'connecting' && <p className="text-white/50 text-[11px] leading-relaxed">Waking up Voxali Reader 1...</p>}
                  {terminalStatus === 'success' && <p className="text-white/50 text-[11px] leading-relaxed">Processing transaction records...</p>}
                </div>
              </div>
            ) : (
              <>
            <div className="space-y-2 mb-5">
              <div className="flex flex-col gap-1">
                <button 
                  onClick={() => setPaymentMethod('card')}
                  className={`w-full p-3 rounded-xl border flex items-center gap-3 transition-all duration-200 ${
                    paymentMethod === 'card' 
                      ? 'border-white bg-white/[0.04] shadow-[0_0_15px_rgba(255,255,255,0.05)] scale-[1.01]' 
                      : 'border-white/5 bg-white/[0.01] hover:border-white/15 hover:bg-white/[0.02]'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${
                    paymentMethod === 'card' ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-white/60'
                  }`}>
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <h4 className={`font-semibold text-sm transition-colors ${paymentMethod === 'card' ? 'text-white' : 'text-white/80'}`}>Credit / Debit Card</h4>
                    <p className="text-white/40 text-[10px]">{cardEntryMethod === 'terminal' ? 'Send to Stripe Terminal' : 'Manual Entry / Standalone'}</p>
                  </div>
                  {paymentMethod === 'card' && (
                    <div className="ml-auto w-4.5 h-4.5 rounded-full bg-white flex items-center justify-center">
                      <Check className="w-3 h-3 text-black stroke-[3]" />
                    </div>
                  )}
                </button>
                
                {paymentMethod === 'card' && (
                  <div className="p-1 bg-white/[0.02] border border-white/5 rounded-lg flex gap-1 mx-1.5 mt-0.5 animate-fade-in shadow-inner">
                    <button 
                      onClick={() => setCardEntryMethod('terminal')}
                      className={`flex-1 py-1.5 px-2.5 rounded-md text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
                        cardEntryMethod === 'terminal' 
                          ? 'bg-white/10 text-white shadow-sm border border-white/10' 
                          : 'text-white/40 hover:text-white/60'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" /> Stripe Terminal
                    </button>
                    <button 
                      onClick={() => setCardEntryMethod('manual')}
                      className={`flex-1 py-1.5 px-2.5 rounded-md text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
                        cardEntryMethod === 'manual' 
                          ? 'bg-white/10 text-white shadow-sm border border-white/10' 
                          : 'text-white/40 hover:text-white/60'
                      }`}
                    >
                      Manual Machine
                    </button>
                  </div>
                )}
              </div>

              <button 
                onClick={() => setPaymentMethod('cash')}
                className={`w-full p-3 rounded-xl border flex items-center gap-3 transition-all duration-200 ${
                  paymentMethod === 'cash' 
                    ? 'border-white bg-white/[0.04] shadow-[0_0_15px_rgba(255,255,255,0.05)] scale-[1.01]' 
                    : 'border-white/5 bg-white/[0.01] hover:border-white/15 hover:bg-white/[0.02]'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${
                  paymentMethod === 'cash' ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-white/60'
                }`}>
                  <Banknote className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <h4 className={`font-semibold text-sm transition-colors ${paymentMethod === 'cash' ? 'text-white' : 'text-white/80'}`}>Cash</h4>
                  <p className="text-white/40 text-[10px]">Collect cash at register</p>
                </div>
                {paymentMethod === 'cash' && (
                  <div className="ml-auto w-4.5 h-4.5 rounded-full bg-white flex items-center justify-center">
                    <Check className="w-3 h-3 text-black stroke-[3]" />
                  </div>
                )}
              </button>

              <button 
                onClick={() => setPaymentMethod('split')}
                className={`w-full p-3 rounded-xl border flex items-center gap-3 transition-all duration-200 ${
                  paymentMethod === 'split' 
                    ? 'border-white bg-white/[0.04] shadow-[0_0_15px_rgba(255,255,255,0.05)] scale-[1.01]' 
                    : 'border-white/5 bg-white/[0.01] hover:border-white/15 hover:bg-white/[0.02]'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${
                  paymentMethod === 'split' ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-white/60'
                }`}>
                  <SplitSquareVertical className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <h4 className={`font-semibold text-sm transition-colors ${paymentMethod === 'split' ? 'text-white' : 'text-white/80'}`}>Split Payment</h4>
                  <p className="text-white/40 text-[10px]">Part Cash, Part Card</p>
                </div>
                {paymentMethod === 'split' && (
                  <div className="ml-auto w-4.5 h-4.5 rounded-full bg-white flex items-center justify-center">
                    <Check className="w-3 h-3 text-black stroke-[3]" />
                  </div>
                )}
              </button>

              {/* Package Redemption */}
              {availablePackages.length > 0 && (
                <div className="pt-0.5">
                  <button 
                    onClick={() => setPaymentMethod('package')}
                    className={`w-full p-3 rounded-xl border flex items-center gap-3 transition-all duration-200 ${
                      paymentMethod === 'package' 
                        ? 'border-white bg-white/[0.04] shadow-[0_0_15px_rgba(255,255,255,0.05)] scale-[1.01]' 
                        : 'border-white/5 bg-white/[0.01] hover:border-white/15 hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${
                      paymentMethod === 'package' ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-white/60'
                    }`}>
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div className="text-left flex-1">
                      <h4 className={`font-semibold text-sm transition-colors ${paymentMethod === 'package' ? 'text-white' : 'text-white/80'}`}>Redeem Package Credit</h4>
                      <p className="text-white/40 text-[10px]">{availablePackages.length} active package(s) available</p>
                    </div>
                    {paymentMethod === 'package' && (
                      <div className="ml-auto w-4.5 h-4.5 rounded-full bg-white flex items-center justify-center">
                        <Check className="w-3 h-3 text-black stroke-[3]" />
                      </div>
                    )}
                  </button>
                  
                  {paymentMethod === 'package' && (
                    <div className="p-2.5 bg-black/40 border border-white/10 rounded-xl mt-1.5 mx-1.5 space-y-1.5">
                      <p className="text-[9px] text-white/50 uppercase tracking-wider font-bold mb-0.5">Select Package to Redeem</p>
                      {availablePackages.map(pkg => (
                        <label key={pkg.id} className="flex items-center gap-2 p-2 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 hover:border-white/30 transition-all text-xs">
                          <input 
                            type="radio" 
                            name="packageSelection" 
                            checked={selectedPackageId === pkg.id}
                            onChange={() => setSelectedPackageId(pkg.id)}
                            className="w-3.5 h-3.5 accent-white"
                          />
                          <div className="flex-1">
                            <span className="font-semibold text-white">{pkg.template?.name}</span>
                            <span className="block text-[10px] text-white/50">{pkg.remaining_uses} credits remaining</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {paymentMethod === 'split' && (
              <div className="mb-4 p-3 bg-white/[0.02] border border-white/5 rounded-xl animate-fade-in mt-[-0.5rem]">
                <label className="text-xs font-semibold text-white/50 block mb-1">Cash Amount Collected</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-white text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    max={finalCharge}
                    value={cashAmount || ''}
                    onChange={(e) => setCashAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-7 pr-3 text-white text-sm font-bold focus:outline-none focus:border-white transition-colors"
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs">
                  <span className="text-white/40">Remaining on Card:</span>
                  <span className="font-bold text-white">${Math.max(0, finalCharge - cashAmount).toFixed(2)}</span>
                </div>
              </div>
            )}

            <button
              onClick={processCheckout}
              disabled={isProcessing}
              className={`w-full py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg mt-3 ${
                paymentMethod === 'card' && cardEntryMethod === 'terminal' 
                ? 'bg-blue-600 text-white shadow-blue-600/20 hover:bg-blue-500' 
                : 'bg-white text-black hover:bg-white/90 active:scale-[0.98]'
              }`}
            >
              {isProcessing ? (
                <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div> Processing...</>
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
