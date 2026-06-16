/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { cn } from '../lib/utils';

const teamMembers = [
  {
    id: 1,
    name: 'Elena Rostova',
    role: 'Senior Stylist',
    status: 'Available',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD5GrRmJfCXtB2Gg8pLKZoGcMJVsodzzf5AT1LJSmY7yTRoUafVibAcjcQ2XMXjSyuZu32-I3D24iEdpV9hq9bXsUS6KBhS1RZDbvmt7KDi9MQmOwnChccEi_KQHJEucNMOPIQH3avWdfd7f9ZW0yECwv70GX0vyvhCLkwYlnT-MNDx_HGt-c7VZaasSmxMfwYjAYY5VYJ_s-pIeo6ty9mBHp8g_-Rz2oVbzvZhUojNYEldrmFYoYo4ZYZdGRGB_r6_oTK_RhQEcA'
  },
  {
    id: 2,
    name: 'Marcus Thorne',
    role: 'Color Specialist',
    status: 'Off Duty',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBgMEr0o90ji2ys3M1URRsUV__777GRks6GFhQCTLnGno2DG7CeCSRv3vtkoD9C-13fXZ5VxFXddafSI22zaZ8W5cLIkIh3OznSIw3Hs-1X8MA8VSgO-DwOaaVp6iNVT4JU6_A74Iugc8d7QQIsEjqlHg6zPWabiJTZgudn7hkvnOCkpXix1kzTsGARCh4mrP4inKweRS8RYQstgw73pts-oHtyk_nUAsoMPcd5e5VVkG0788sl7sL56DwyeY44ldyCvKKbazy1ow'
  },
  {
    id: 3,
    name: 'Sarah Jenkins',
    role: 'Master Barber',
    status: 'Available',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB7jE1h17SQ103iqDVD99y7MINEcOUdLBzelaNknmHsy5vX8LcxRr-9sourqG3FOwhMd3oKG_sdn4weCTzR9AMME4joOhzYy5IIrjOGiLyYsOw28SLGogHnXURVz_QLP1z2gmkMkNvSrNhvZXmgRnl9tvczlqt2tQkhmmCYdv4v64yuTUAGFkYtKpfYLP2KVI676kvzlI1Rv0PX6XE1yItrySM9-H_7XKQoNQ_F3lMTa0oZxJf1F0KW95Q9EZzWsHm34CN0Dd9dkg'
  }
];

export default function Team() {
  const [members, setMembers] = useState(teamMembers);

  const toggleStatus = (id: number) => {
    setMembers(prev => prev.map(m => {
      if (m.id === id) {
        return { ...m, status: m.status === 'Available' ? 'Off Duty' : 'Available' };
      }
      return m;
    }));
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h2 className="text-24 md:text-32 font-bold tracking-tight">Team</h2>
          <p className="text-on-surface-variant text-sm mt-1">Manage your stylists and staff schedules.</p>
        </div>
        <button className="hidden md:flex bg-primary text-on-primary px-6 py-2.5 rounded-button text-sm font-semibold items-center gap-2">
          <Plus size={18} />
          Add Member
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {members.map((member, i) => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              "bg-surface-container-lowest border border-outline-variant rounded-card p-6 flex flex-col items-center text-center transition-all duration-300 hover:shadow-xl",
              member.status === 'Off Duty' && "opacity-60 grayscale-[20%]"
            )}
          >
            <div className="w-24 h-24 rounded-full mb-6 overflow-hidden border border-outline-variant ring-4 ring-surface-container-low">
              <img 
                src={member.image} 
                alt={member.name} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <h3 className="font-bold text-xl mb-1">{member.name}</h3>
            <p className="text-sm text-on-surface-variant font-medium mb-8">{member.role}</p>
            
            <div className="w-full mt-auto flex items-center justify-between border-t border-outline-variant pt-5">
              <span className="text-xs font-bold text-on-surface uppercase tracking-wider">Status</span>
              <div className="flex items-center gap-3">
                <span className={cn(
                  "text-[11px] font-bold uppercase tracking-tight",
                  member.status === 'Available' ? "text-primary" : "text-on-surface-variant"
                )}>
                  {member.status}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={member.status === 'Available'} 
                    onChange={() => toggleStatus(member.id)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
