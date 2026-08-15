import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  DoorOpen, 
  Clock, 
  BriefcaseMedical, 
  CheckCircle2, 
  Loader2, 
  Activity, 
  ShieldCheck, 
  MapPin, 
  Phone, 
  Mail,
  Building,
  AlertCircle,
  Settings2,
  Stethoscope,
  Network,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCabinetSettings, updateRoom } from '../../services/adminService';
import { useToast } from '../../components/Toast';

export default function AdminCabinetPage() {
  const { t } = useLanguage();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('ROOMS');

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['admin_cabinet_settings'],
    queryFn: getCabinetSettings,
  });

  const roomToggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string, active: boolean }) => updateRoom(id, { is_active: active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_cabinet_settings'] });
      addToast('Clinical room status synchronized', 'success');
    }
  });

  if (isLoading || !settingsData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
         <Loader2 className="w-8 h-8 animate-spin text-brand-indigo mb-4" />
         <p className="text-[12px] text-text-muted font-mono tracking-widest uppercase animate-pulse">Synchronizing Parameters...</p>
      </div>
    );
  }

  const { rooms = [], specialties = [], config = {} } = settingsData;

  const tabs = [
    { id: 'ROOMS', label: t('admin.cabinet.rooms') || 'Rooms', icon: DoorOpen },
    { id: 'SPECIALTIES', label: t('admin.cabinet.specialties') || 'Specialties', icon: Stethoscope },
    { id: 'NETWORK', label: t('admin.cabinet.insurance') || 'Insurance', icon: Network },
    { id: 'OPERATIONS', label: t('admin.cabinet.schedule') || 'Schedule', icon: Clock },
    { id: 'IDENTITY', label: t('admin.cabinet.general') || 'General', icon: Building }
  ];

  return (
    <div className="flex-1 overflow-x-hidden overflow-y-auto pb-12">
      <div className="max-w-[1200px] mx-auto w-full">
        {/* Header Area */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h2 className="text-[36px] font-sans text-text-primary leading-tight">
              {t('admin.cabinet.settings') || "Cabinet Configuration"}
            </h2>
            <p className="text-[16px] font-sans text-text-muted mt-1">
              {t('admin.cabinet.configClinic') || "Manage your clinic's operational parameters and physical assets."}
            </p>
          </div>
          
          <div className="flex bg-bg-input/50 border border-ui-border p-1.5 rounded-2xl overflow-x-auto hide-scrollbar max-w-full shadow-inner backdrop-blur-sm">
             <div className="flex items-center min-w-max">
                {tabs.map(tab => {
                   const isActive = activeTab === tab.id;
                   return (
                     <button 
                        key={tab.id} 
                        onClick={() => setActiveTab(tab.id)} 
                        className={`relative flex items-center gap-2 px-5 py-2.5 text-[12px] font-semibold font-sans rounded-xl transition-all whitespace-nowrap ${isActive ? 'text-white shadow-[0_0_15px_rgba(75,74,207,0.4)]' : 'text-text-muted hover:text-text-primary hover:bg-bg-input'}`}
                     >
                        {isActive && (
                          <motion.div layoutId="active-tab" className="absolute inset-0 bg-brand-indigo rounded-xl" transition={{ type: "spring", stiffness: 300, damping: 30 }} />
                        )}
                        <span className="relative z-10 flex items-center gap-2">
                           <tab.icon size={16} />
                           {tab.label}
                        </span>
                     </button>
                   );
                })}
             </div>
          </div>
        </motion.div>

        {/* Main Content Area */}
        <div className="min-h-[400px]">
          <AnimatePresence mode="wait">
            {activeTab === 'ROOMS' && (
              <motion.div 
                key="rooms"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {rooms.map((room: any, idx: number) => (
                  <motion.div 
                     initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                     key={room.id} 
                     className="glass-island border border-ui-border rounded-[24px] p-6 hover:border-brand-indigo/30 hover:shadow-[0_8px_30px_rgba(75,74,207,0.1)] transition-all group backdrop-blur-md relative overflow-hidden"
                  >
                     <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: room.is_active ? '#22C55E' : '#EF4444', opacity: 0.8 }} />
                     
                     <div className="flex items-start justify-between mb-6 pl-2">
                        <div className="w-12 h-12 rounded-2xl bg-[#ffffff05] border border-ui-border flex items-center justify-center text-brand-lavender group-hover:scale-110 transition-transform duration-300 shadow-inner">
                           <DoorOpen size={24} strokeWidth={1.5} />
                        </div>
                        <button 
                          onClick={() => roomToggleMutation.mutate({ id: room.id, active: !room.is_active })}
                          className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none ${room.is_active ? 'bg-state-success shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-ui-border'}`}
                        >
                           <motion.div 
                             layout 
                             className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                             animate={{ left: room.is_active ? '24px' : '4px' }}
                             transition={{ type: "spring", stiffness: 500, damping: 30 }}
                           />
                        </button>
                     </div>
                     <h4 className="text-[18px] font-semibold text-text-primary mb-1 pl-2">{room.name}</h4>
                     <p className="text-[11px] text-text-muted font-mono uppercase tracking-[0.2em] mb-6 pl-2 opacity-70">Identifier: #{room.id.slice(0,8)}</p>
                     
                     <div className="space-y-3 pt-5 border-t border-ui-border/50 pl-2">
                        <div className="flex items-center justify-between text-[13px]">
                           <span className="text-text-muted flex items-center gap-2"><Users size={14}/> Capacity</span>
                           <span className="text-text-primary font-medium">{room.capacity || 1} Person{room.capacity > 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-center justify-between text-[13px]">
                           <span className="text-text-muted flex items-center gap-2"><Activity size={14}/> Status</span>
                           <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${room.is_active ? 'bg-[#22C55E1A] text-[#22C55E]' : 'bg-state-error/10 text-state-error'}`}>
                             {room.is_active ? 'Operational' : 'Maintenance'}
                           </span>
                        </div>
                     </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {activeTab === 'SPECIALTIES' && (
              <motion.div 
                key="specs"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}
                className="glass-island border border-ui-border rounded-[24px] overflow-hidden backdrop-blur-md"
              >
                 <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-ui-border bg-bg-input/30">
                         <th className="px-8 py-5 text-[11px] font-mono text-text-muted uppercase tracking-[0.2em]">Medical Domain</th>
                         <th className="px-8 py-5 text-[11px] font-mono text-text-muted uppercase tracking-[0.2em]">Practitioner Density</th>
                         <th className="px-8 py-5 text-[11px] font-mono text-text-muted uppercase tracking-[0.2em] text-right">Oversight</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ui-border/50">
                      {specialties.map((spec: any, idx: number) => (
                         <motion.tr 
                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                            key={spec.id} 
                            className="group hover:bg-[#ffffff05] transition-colors"
                         >
                            <td className="px-8 py-6">
                               <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-brand-indigo/10 flex items-center justify-center text-[20px] group-hover:scale-110 transition-transform">
                                     {spec.icon || '🩺'}
                                  </div>
                                  <span className="text-[15px] font-semibold text-text-primary">{spec.name}</span>
                               </div>
                            </td>
                            <td className="px-8 py-6">
                               <div className="flex items-center gap-2 text-text-muted">
                                  <Activity size={16} className="text-brand-lavender" />
                                  <span className="text-[14px] font-medium text-text-primary">{spec.doctors || 0}</span>
                                  <span className="text-[13px]">Registered</span>
                               </div>
                            </td>
                            <td className="px-8 py-6 text-right">
                               <span className="px-3 py-1 rounded-full border border-ui-border text-[11px] font-mono text-text-muted uppercase tracking-wider group-hover:border-brand-indigo/30 group-hover:text-brand-lavender transition-colors">
                                  System Indexed
                               </span>
                            </td>
                         </motion.tr>
                      ))}
                    </tbody>
                 </table>
              </motion.div>
            )}

            {activeTab === 'NETWORK' && (
              <motion.div 
                key="network"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                 {(config.insurances || ['CNSS', 'CNOPS', 'RMA', 'AXA', 'Sanlam']).map((ins: string, i: number) => (
                    <motion.div 
                       initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                       key={i} 
                       className="glass-island border border-ui-border p-6 rounded-[20px] flex items-center gap-5 group hover:border-state-success/40 hover:shadow-[0_8px_30px_rgba(34,197,94,0.1)] transition-all cursor-pointer backdrop-blur-md"
                    >
                       <div className="w-12 h-12 rounded-2xl bg-state-success/10 border border-state-success/20 flex items-center justify-center text-state-success group-hover:scale-110 transition-transform shadow-inner">
                          <ShieldCheck size={24} strokeWidth={1.5} />
                       </div>
                       <div className="min-w-0">
                          <p className="text-[16px] font-semibold text-text-primary truncate">{ins}</p>
                          <p className="text-[11px] font-mono text-state-success/80 uppercase tracking-widest mt-1">Active Partner</p>
                       </div>
                    </motion.div>
                 ))}
              </motion.div>
            )}

            {activeTab === 'OPERATIONS' && (
              <motion.div 
                key="ops"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}
                className="glass-island border border-ui-border rounded-[24px] p-8 md:p-10 max-w-3xl backdrop-blur-md"
              >
                 <div className="flex items-center gap-3 mb-8 text-brand-lavender">
                    <Clock size={24} strokeWidth={1.5} />
                    <h3 className="text-[20px] font-sans font-semibold text-text-primary">Operational Schedule</h3>
                 </div>
                 
                 <div className="space-y-6">
                    <div className="flex items-center justify-between p-6 bg-[#ffffff05] border border-ui-border rounded-2xl group hover:border-brand-indigo/30 transition-colors">
                       <div>
                          <p className="text-[11px] font-mono text-text-muted uppercase tracking-widest">Global Session Duration</p>
                          <p className="text-[28px] font-bold text-text-primary mt-1">{config.duration || 30} <span className="text-[15px] font-medium text-text-muted">Minutes</span></p>
                       </div>
                       <div className="w-12 h-12 rounded-full bg-bg-input flex items-center justify-center text-text-muted group-hover:text-brand-lavender transition-colors">
                          <Settings2 size={24} strokeWidth={1.5} />
                       </div>
                    </div>

                    <div className="p-6 border border-ui-border rounded-2xl">
                       <p className="text-[11px] font-mono text-text-muted uppercase tracking-widest mb-5">Standard Service Window</p>
                       <div className="space-y-4">
                         {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => (
                            <div key={day} className="flex items-center justify-between py-3 border-b border-ui-border/50 last:border-0 hover:bg-[#ffffff02] transition-colors rounded-lg px-2 -mx-2">
                               <div className="flex items-center gap-3">
                                  <div className="w-2 h-2 rounded-full bg-state-success shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                                  <span className="text-[14px] font-medium text-text-primary">{day}</span>
                               </div>
                               <span className="text-[13px] font-mono text-text-primary bg-bg-input px-3 py-1.5 rounded-lg border border-ui-border">08:00 — 18:00</span>
                            </div>
                         ))}
                       </div>
                    </div>
                 </div>
              </motion.div>
            )}

            {activeTab === 'IDENTITY' && (
              <motion.div 
                key="identity"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}
                className="glass-island border border-ui-border rounded-[24px] p-8 md:p-10 max-w-4xl backdrop-blur-md"
              >
                 <div className="flex items-center gap-3 mb-10 text-brand-indigo">
                    <Building size={24} strokeWidth={1.5} />
                    <h3 className="text-[20px] font-sans font-semibold text-text-primary">Clinical Identity Record</h3>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-8">
                       <div className="group">
                          <p className="text-[11px] font-mono text-text-muted uppercase tracking-[0.2em] mb-2">Clinical Designation</p>
                          <div className="p-4 rounded-xl border border-ui-border bg-[#ffffff02] group-hover:border-brand-indigo/30 transition-colors">
                             <p className="text-[20px] font-semibold text-text-primary">{config.clinicName || 'MedEra Primary Center'}</p>
                          </div>
                       </div>
                       <div className="group">
                          <p className="text-[11px] font-mono text-text-muted uppercase tracking-[0.2em] mb-2">Physical Location</p>
                          <div className="p-4 rounded-xl border border-ui-border bg-[#ffffff02] group-hover:border-brand-indigo/30 transition-colors flex items-start gap-3">
                             <MapPin size={20} className="text-brand-lavender shrink-0 mt-0.5" strokeWidth={1.5} />
                             <p className="text-[14px] text-text-primary leading-relaxed">{config.address || 'Global HQ · Casablanca, Morocco'}</p>
                          </div>
                       </div>
                    </div>

                    <div className="p-8 bg-[#ffffff03] border border-ui-border rounded-2xl flex flex-col justify-center">
                       <h4 className="text-[11px] font-mono text-text-muted uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                          <Network size={14} /> Contact Vectors
                       </h4>
                       <div className="space-y-6">
                          <div className="flex items-center gap-4 group">
                             <div className="w-12 h-12 rounded-xl bg-brand-indigo/10 border border-brand-indigo/20 flex items-center justify-center text-brand-indigo group-hover:scale-110 transition-transform">
                                <Phone size={20} strokeWidth={1.5} />
                             </div>
                             <div>
                                <p className="text-[11px] text-text-muted uppercase font-mono tracking-widest mb-1">Primary Phone</p>
                                <span className="text-[15px] font-medium text-text-primary">{config.phone || '+212 5XX-XXXXXX'}</span>
                             </div>
                          </div>
                          <div className="flex items-center gap-4 group">
                             <div className="w-12 h-12 rounded-xl bg-brand-lavender/10 border border-brand-lavender/20 flex items-center justify-center text-brand-lavender group-hover:scale-110 transition-transform">
                                <Mail size={20} strokeWidth={1.5} />
                             </div>
                             <div>
                                <p className="text-[11px] text-text-muted uppercase font-mono tracking-widest mb-1">Support Email</p>
                                <span className="text-[15px] font-medium text-text-primary">{config.email || 'contact@medera.ma'}</span>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="mt-10 p-5 rounded-2xl bg-[#f59e0b0a] border border-[#f59e0b33] flex items-start gap-4">
                    <AlertCircle size={22} className="text-state-warning shrink-0" strokeWidth={1.5} />
                    <div>
                       <p className="text-[14px] font-semibold text-state-warning tracking-wide mb-1">Oversight Lock Active</p>
                       <p className="text-[13px] text-text-muted leading-relaxed">Fundamental clinical identity parameters are currently in read-only oversight mode. To modify structural data, please contact the System Architect.</p>
                    </div>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

