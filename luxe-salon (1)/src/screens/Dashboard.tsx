/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { MoreHorizontal } from 'lucide-react';
import { motion } from 'motion/react';

const data = [
  { name: 'Mon', revenue: 400 },
  { name: 'Tue', revenue: 600 },
  { name: 'Wed', revenue: 300 },
  { name: 'Thu', revenue: 800 },
  { name: 'Fri', revenue: 900 },
  { name: 'Sat', revenue: 1000 },
  { name: 'Sun', revenue: 200 },
];

const schedule = [
  { time: '09:00', period: 'AM', title: 'Balayage & Cut', client: 'Sarah Jenkins', type: 'confirmed' },
  { time: '11:30', period: 'AM', title: "Men's Styling", client: 'David Cho', type: 'pending' },
  { time: '01:00', period: 'PM', title: 'Full Color', client: 'Emma Thompson', type: 'confirmed' },
  { time: '03:45', period: 'PM', title: 'Consultation', client: 'New Client', type: 'pending' },
];

export default function Dashboard() {
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-2xl md:text-32 font-bold tracking-tight">Dashboard</h2>
          <p className="text-on-surface-variant text-sm mt-1">Welcome back, manager.</p>
        </div>
        <button className="md:hidden bg-primary text-on-primary px-4 py-2 rounded-button text-sm font-medium">
          New Booking
        </button>
      </header>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Today's Sales", value: "$1,240" },
          { label: "Appointments", value: "18" },
          { label: "New Clients", value: "5" },
          { label: "Staff on Duty", value: "6" },
        ].map((metric, i) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-surface-container-lowest border border-outline-variant rounded-card p-6"
          >
            <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
              {metric.label}
            </p>
            <p className="text-2xl md:text-3xl font-bold">{metric.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Area */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-card p-6"
        >
          <h3 className="text-xl font-semibold mb-8">Weekly Revenue</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E2E1" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#45474A', fontWeight: 500 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#45474A' }}
                />
                <Tooltip 
                  cursor={{ fill: '#F1EDEC' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.name === 'Thu' ? '#000000' : '#E5E2E1'} 
                      className="hover:fill-primary transition-colors cursor-pointer"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Schedule List */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-surface-container-lowest border border-outline-variant rounded-card p-6 h-full"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold">Today's Schedule</h3>
            <button className="text-on-surface-variant hover:text-primary transition-colors">
              <MoreHorizontal size={20} />
            </button>
          </div>
          <div className="space-y-6">
            {schedule.map((item, i) => (
              <div key={i} className="flex items-start gap-4 pb-6 border-b border-surface-container-high last:border-0 last:pb-0">
                <div className="text-right min-w-[50px]">
                  <p className="text-xs font-semibold text-on-surface">{item.time}</p>
                  <p className="text-[10px] text-on-surface-variant font-medium">{item.period}</p>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold">{item.title}</h4>
                  <p className="text-xs text-on-surface-variant">{item.client}</p>
                </div>
                <div className={`w-2 h-2 rounded-full mt-1.5 ${item.type === 'confirmed' ? 'bg-primary' : 'bg-outline-variant'}`} />
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
