/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { 
  Scissors, 
  User, 
  Trash2, 
  Plus, 
  Minus, 
  ArrowRight,
  Search,
  Gift,
  MoreHorizontal,
  CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const categories = ["All Services", "Haircuts", "Color & Highlights", "Treatments", "Styling"];

const services = [
  { id: 1, name: "Women's Haircut", description: "Includes consultation, wash, cut, and signature blowout styling.", price: 85.00, icon: Scissors },
  { id: 2, name: "Men's Haircut", description: "Precision cut, neck shave, and styling product application.", price: 45.00, icon: User },
  { id: 3, name: "Balayage Full", description: "Hand-painted highlights for a natural, sun-kissed look.", price: 220.00, icon: Scissors },
  { id: 4, name: "Root Retouch", description: "Single process color applied to new growth up to 1 inch.", price: 75.00, icon: Scissors },
  { id: 5, name: "Keratin Treatment", description: "Smoothing treatment that eliminates frizz and improves texture.", price: 250.00, icon: Scissors },
  { id: 6, name: "Signature Blowout", description: "Wash, round brush styling, and finishing spray.", price: 50.00, icon: Scissors },
];

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

export default function POS() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState("All Services");

  const addToCart = (service: typeof services[0]) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === service.id);
      if (existing) {
        return prev.map(item => item.id === service.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { id: service.id, name: service.name, price: service.price, quantity: 1 }];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const clearCart = () => setCart([]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.085;
  const total = subtotal + tax;

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      {/* Services Section */}
      <div className="flex-1 p-6 md:p-10">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-24 md:text-32 font-bold tracking-tight">Point of Sale</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
            <input 
              type="text" 
              placeholder="Search services..." 
              className="pl-10 pr-4 py-2 bg-surface-container border border-outline-variant rounded-full text-sm focus:outline-none focus:border-primary w-full md:w-64 transition-colors"
            />
          </div>
        </header>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-6 hide-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                activeCategory === cat 
                  ? "bg-primary text-on-primary" 
                  : "border border-outline-variant text-on-surface-variant hover:bg-surface-container"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {services.map((service) => {
            const Icon = service.icon;
            const inCart = cart.find(item => item.id === service.id);
            
            return (
              <motion.div
                key={service.id}
                layout
                whileTap={{ scale: 0.98 }}
                onClick={() => addToCart(service)}
                className={cn(
                  "bg-surface-container-lowest border rounded-card p-4 flex flex-col justify-between cursor-pointer transition-all hover:shadow-lg",
                  inCart ? "border-primary shadow-md" : "border-outline-variant"
                )}
              >
                <div>
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center mb-4 transition-colors",
                    inCart ? "bg-primary text-on-primary" : "bg-surface-container-low text-on-surface-variant"
                  )}>
                    <Icon size={20} />
                  </div>
                  <h3 className="font-semibold text-lg mb-1">{service.name}</h3>
                  <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                    {service.description}
                  </p>
                </div>
                <div className="mt-6 flex justify-between items-end">
                  <span className="font-bold text-xl">${service.price.toFixed(2)}</span>
                  <div className={cn(
                    "w-8 h-8 rounded-full border border-outline-variant flex items-center justify-center transition-colors",
                    inCart ? "bg-primary text-on-primary border-primary" : "hover:border-primary hover:text-primary"
                  )}>
                    <Plus size={18} />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Checkout Sidebar */}
      <aside className="w-full lg:w-[400px] bg-surface-container-lowest border-l border-outline-variant flex flex-col h-[calc(100vh-64px)] md:h-screen sticky top-0">
        <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-white">
          <div>
            <h2 className="text-xl font-bold">Current Order</h2>
            <p className="text-xs text-on-surface-variant mt-1">Ticket #4829 • Client: Walk-in</p>
          </div>
          <button onClick={clearCart} className="text-on-surface-variant hover:text-error transition-colors p-2 rounded-full hover:bg-error-container">
            <Trash2 size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <AnimatePresence>
            {cart.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-start justify-between group"
              >
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{item.name}</h4>
                  <p className="text-xs text-on-surface-variant">Service</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="font-semibold text-sm">${(item.price * item.quantity).toFixed(2)}</span>
                  <div className="flex items-center gap-3 bg-surface-container h-8 rounded-full px-2">
                    <button onClick={() => updateQuantity(item.id, -1)} className="text-on-surface-variant hover:text-primary transition-colors">
                      <Minus size={14} />
                    </button>
                    <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="text-on-surface-variant hover:text-primary transition-colors">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {cart.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20">
              <CreditCard size={48} className="mb-4" />
              <p className="text-sm font-medium">Cart is empty</p>
              <p className="text-xs">Add services to start a checkout</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-surface-container-low border-t border-outline-variant mt-auto">
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm text-on-surface-variant font-medium">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-on-surface-variant font-medium">
              <span>Tax (8.5%)</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold pt-4 border-t border-outline-variant border-dashed">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
          
          <button 
            disabled={cart.length === 0}
            className="w-full bg-primary text-on-primary font-bold py-4 rounded-button hover:opacity-90 transition-all flex justify-center items-center gap-2 shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Charge ${total.toFixed(2)}
            <ArrowRight size={20} />
          </button>

          <div className="mt-6 flex justify-center gap-6">
            <button className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider hover:text-primary flex items-center gap-1.5 transition-colors">
              <Gift size={14} /> Apply Discount
            </button>
            <button className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider hover:text-primary flex items-center gap-1.5 transition-colors">
              <MoreHorizontal size={14} /> More Actions
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
