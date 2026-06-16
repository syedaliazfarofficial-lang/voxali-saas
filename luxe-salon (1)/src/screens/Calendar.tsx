/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChevronLeft, ChevronRight, CheckCircle2, User } from 'lucide-react';
import { cn } from '../lib/utils';

const days = [
  { name: 'Mon', date: '24' },
  { name: 'Tue', date: '25' },
  { name: 'Wed', date: '26', active: true },
  { name: 'Thu', date: '27' },
  { name: 'Fri', date: '28' },
  { name: 'Sat', date: '29' },
  { name: 'Sun', date: '30', closed: true },
];

const hours = ['9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM'];

const appointments = [
  {
    day: 'Mon',
    start: '10:00 AM',
    duration: 90,
    title: 'Sarah Jenkins',
    service: 'Balayage • 10:00 - 11:30',
    color: 'bg-green-500/10 border-green-600 text-green-800'
  },
  {
    day: 'Tue',
    start: '11:00 AM',
    duration: 60,
    title: 'David Cho',
    service: "Men's Cut • 11:00",
    color: 'bg-orange-500/10 border-orange-600 text-orange-800'
  },
  {
    day: 'Tue',
    start: '1:00 PM',
    duration: 120,
    title: 'Emma Davis',
    service: 'Color & Cut • 1:00 - 3:00',
    color: 'bg-blue-500/10 border-blue-600 text-blue-800',
    arrived: true
  },
  {
    day: 'Wed',
    start: '9:30 AM',
    duration: 60,
    title: 'Michael R.',
    service: 'Beard Trim • 9:30',
    color: 'bg-green-500/10 border-green-600 text-green-800'
  },
  {
    day: 'Fri',
    start: '2:00 PM',
    duration: 60,
    title: 'Olivia W.',
    service: 'Consultation • 2:00',
    color: 'bg-orange-500/10 border-orange-600 text-orange-800'
  }
];

export default function CalendarScreen() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top Bar Navigation */}
      <header className="bg-surface border-b border-outline-variant h-16 px-6 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-6">
          <h2 className="text-xl font-bold md:hidden">Calendar</h2>
          <div className="hidden md:flex items-center gap-4 bg-surface-container-low rounded-full px-4 py-1.5 border border-outline-variant">
            <button className="text-on-surface-variant hover:text-primary transition-colors">
              <ChevronLeft size={18} />
            </button>
            <span className="font-semibold text-sm min-w-[120px] text-center">Oct 24 - 30, 2023</span>
            <button className="text-on-surface-variant hover:text-primary transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-2 mr-4">
            <div className="w-8 h-8 rounded-full border-2 border-primary bg-surface-container overflow-hidden">
               <User size={16} className="m-auto mt-1.5" />
            </div>
            <div className="w-8 h-8 rounded-full border border-outline-variant bg-surface-container flex items-center justify-center text-[10px] font-bold">
              +3
            </div>
          </div>
          <div className="hidden md:flex gap-1 bg-surface-container-low p-1 rounded-lg border border-outline-variant">
            {['Day', 'Week', 'Month'].map(view => (
              <button 
                key={view}
                className={cn(
                  "px-4 py-1 text-xs font-bold rounded transition-all",
                  view === 'Week' ? "bg-white shadow-sm text-primary" : "text-on-surface-variant hover:bg-surface-container-high"
                )}
              >
                {view}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Calendar Area */}
      <div className="flex-1 flex flex-col overflow-hidden p-6 md:p-8">
        <div className="bg-white rounded-card border border-outline-variant flex-1 flex flex-col overflow-hidden shadow-sm">
          {/* Calendar Header (Days) */}
          <div className="grid grid-cols-8 border-b border-outline-variant bg-surface-container-low">
            <div className="col-span-1 border-r border-outline-variant flex items-end justify-end p-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
              GMT-4
            </div>
            {days.map((day) => (
              <div 
                key={day.name} 
                className={cn(
                  "col-span-1 p-4 border-r border-outline-variant text-center transition-colors",
                  day.active && "bg-surface-container-high border-t-2 border-t-primary",
                  day.closed && "bg-surface-variant opacity-50"
                )}
              >
                <p className={cn("text-[10px] uppercase font-bold mb-1", day.active ? "text-primary" : "text-on-surface-variant")}>
                  {day.name}
                </p>
                <p className={cn("text-xl font-bold", day.active ? "text-primary" : "text-on-surface")}>
                  {day.date}
                </p>
              </div>
            ))}
          </div>

          {/* Calendar Grid (Scrollable) */}
          <div className="flex-1 overflow-y-auto hide-scrollbar relative bg-background">
            <div className="grid grid-cols-8 min-w-[800px]">
              {/* Time Column */}
              <div className="col-span-1 border-r border-outline-variant bg-white">
                {hours.map(hour => (
                  <div key={hour} className="h-20 border-b border-outline-variant/30 relative">
                    <span className="absolute -top-2.5 right-3 text-[10px] font-bold text-on-surface-variant uppercase bg-background px-1">
                      {hour}
                    </span>
                  </div>
                ))}
              </div>

              {/* Day Columns */}
              {days.map(day => (
                <div 
                  key={day.name} 
                  className={cn(
                    "col-span-1 border-r border-outline-variant relative",
                    day.active ? "bg-surface-container-lowest" : "bg-white",
                    day.closed && "bg-surface-container/50 opacity-10 patterned-bg"
                  )}
                >
                  {/* Grid Lines */}
                  {hours.map((_, i) => (
                    <div key={i} className="h-20 border-b border-outline-variant/30" />
                  ))}

                  {/* Appointments */}
                  {appointments.filter(ap => ap.day === day.name).map((ap, i) => {
                    // Simple positioning logic based on start time (assuming all start at 9am)
                    const [hStr, mStr] = ap.start.split(':');
                    let startH = parseInt(hStr);
                    if (ap.start.includes('PM') && startH !== 12) startH += 12;
                    const startM = parseInt(mStr.split(' ')[0]);
                    
                    const top = ((startH - 9) * 80) + (startM / 60 * 80);
                    const height = (ap.duration / 60) * 80;

                    return (
                      <div 
                        key={i}
                        className={cn(
                          "absolute left-1 right-1 rounded-sm border-l-4 p-2 flex flex-col shadow-sm cursor-pointer hover:brightness-95 transition-all z-10",
                          ap.color
                        )}
                        style={{ top: `${top}px`, height: `${height}px` }}
                      >
                        <p className="text-[11px] font-bold truncate leading-tight">{ap.title}</p>
                        <p className="text-[10px] font-medium opacity-80 truncate">{ap.service}</p>
                        {ap.arrived && (
                          <div className="mt-auto flex items-center gap-1">
                            <CheckCircle2 size={10} />
                            <span className="text-[9px] font-bold uppercase tracking-tight">Arrived</span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Current Time Indicator for Active Day */}
                  {day.active && (
                    <div 
                      className="absolute left-0 right-0 h-[2px] bg-error z-20 pointer-events-none"
                      style={{ top: '240px' }} // Simulated 12pm
                    >
                      <div className="w-2 h-2 rounded-full bg-error absolute -left-1 -top-[3px]" />
                    </div>
                  )}

                  {day.closed && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="bg-white px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest text-on-surface-variant border border-outline-variant shadow-sm rotate-[-45deg]">
                        Closed
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
