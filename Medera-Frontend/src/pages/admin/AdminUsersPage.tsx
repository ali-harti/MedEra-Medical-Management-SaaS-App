import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatDate, formatTime } from '../../utils/format';
import { 
  Search, 
  Eye, 
  Power, 
  Unlock, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  ShieldCheck, 
  Users, 
  Activity, 
  Lock,
  Stethoscope,
  UserCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getUsers, updateUser, unlockUser } from '../../services/adminService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../components/Toast';

const roleStyles: Record<string, { bg: string, text: string, icon: any }> = {
  ADMIN: { bg: 'bg-brand-indigo/10', text: 'text-brand-indigo', icon: ShieldCheck },
  MEDECIN: { bg: 'bg-brand-lavender/10', text: 'text-brand-lavender', icon: Stethoscope },
  SECRETAIRE: { bg: 'bg-state-warning/10', text: 'text-state-warning', icon: Activity },
  PATIENT: { bg: 'bg-state-success/10', text: 'text-state-success', icon: UserCircle },
};

export default function AdminUsersPage() {
  const { t } = useLanguage();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { data: usersResponse, isLoading } = useQuery({
    queryKey: ['admin_users', roleFilter, search, currentPage, itemsPerPage],
    queryFn: () => getUsers({
      role: roleFilter === 'ALL' ? undefined : roleFilter,
      search: search || undefined,
      page: currentPage,
      page_size: itemsPerPage
    }),
    refetchInterval: 3000 // Refetch every 3 seconds for real-time updates
  });

  const users = usersResponse?.results || [];
  const totalCount = usersResponse?.count || 0;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const toggleActiveMutation = useMutation({
    mutationFn: (user: any) => updateUser(user.id, { is_active: !user.is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_users'] });
      addToast('User status synchronization complete', 'success');
      if (selectedUser) setSelectedUser(null);
    }
  });

  const unlockUserMutation = useMutation({
    mutationFn: (id: string) => unlockUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_users'] });
      addToast('Account security lockout cleared', 'success');
      if (selectedUser) setSelectedUser(null);
    }
  });

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h2 className="text-[36px] font-serif italic text-text-primary leading-tight flex flex-wrap gap-x-[0.3em]">
             {(t('admin.userMgmt') || "Identity & Access Registry").split(' ').map((word, i) => (
                <motion.span 
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  {word}
                </motion.span>
             ))}
          </h2>
          <p className="text-[16px] font-sans text-text-muted mt-1">
            {t('admin.userMgmtDesc') || "Global oversight of all user identities, access levels, and account security states."}
          </p>
        </div>
        
        <div className="flex bg-bg-surface border border-ui-border p-1 rounded-xl">
           {['ALL', 'ADMIN', 'MEDECIN', 'SECRETAIRE', 'PATIENT'].map((r, i) => (
              <motion.button 
                 key={r} 
                 initial={{ opacity: 0, scale: 0.9 }}
                 animate={{ opacity: 1, scale: 1 }}
                 transition={{ delay: 0.2 + (i * 0.05), ease: [0.16, 1, 0.3, 1] }}
                 onClick={() => { setRoleFilter(r); setCurrentPage(1); }} 
                 className={`px-4 py-1.5 text-[11px] font-bold font-mono rounded-lg transition-all ${roleFilter === r ? 'bg-brand-indigo text-white shadow-lg' : 'text-text-muted hover:text-text-primary'}`}
              >
                 {r === 'ALL' ? 'GLOBAL' : r === 'SECRETAIRE' ? 'SECRETARY' : r} {r === 'ALL' && totalCount > 0 && roleFilter === 'ALL' && `(${totalCount})`}
              </motion.button>
           ))}
        </div>
      </div>

      {/* Oversight Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Identities', value: totalCount.toString(), icon: Users, color: 'text-brand-indigo' },
          { label: 'Security Lockouts', value: users.filter((u: any) => u.locked_until).length.toString(), icon: Lock, color: 'text-state-error' },
          { label: 'System Admins', value: users.filter((u: any) => u.role === 'ADMIN').length.toString(), icon: ShieldCheck, color: 'text-brand-lavender' },
          { label: 'Active Sessions', value: 'Live', icon: Activity, color: 'text-state-success' }
        ].map((stat, i) => (
          <div key={i} className="glass-island border border-ui-border p-5 rounded-2xl">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-bg-surface border border-ui-border ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <div>
                <p className="text-[10px] font-mono text-text-muted uppercase tracking-widest">{stat.label}</p>
                <p className="text-[22px] font-bold text-text-primary mt-0.5">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
        <input 
          type="text" 
          placeholder={t('admin.searchUsers') || "Filter identities by name or email..."}
          className="w-full bg-bg-surface border border-ui-border rounded-xl pl-12 pr-4 py-4 text-[14px] text-text-primary focus:border-brand-indigo/50 focus:ring-4 focus:ring-brand-indigo/10 outline-none transition-all placeholder:text-text-muted/50"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Main Table */}
      <div className="glass-island border border-ui-border rounded-[24px] overflow-hidden backdrop-blur-xl shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-ui-border bg-bg-surface/50">
                <th className="px-6 py-5 text-[11px] font-mono text-text-muted uppercase tracking-[0.2em]">Identity</th>
                <th className="px-6 py-5 text-[11px] font-mono text-text-muted uppercase tracking-[0.2em]">Domain Role</th>
                <th className="px-6 py-5 text-[11px] font-mono text-text-muted uppercase tracking-[0.2em]">Security State</th>
                <th className="px-6 py-5 text-[11px] font-mono text-text-muted uppercase tracking-[0.2em]">Joined</th>
                <th className="px-6 py-5 text-[11px] font-mono text-text-muted uppercase tracking-[0.2em]">Last Access</th>
                <th className="px-6 py-5 text-[11px] font-mono text-text-muted uppercase tracking-[0.2em] text-right">Oversight</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-32 text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-brand-indigo mx-auto mb-4" />
                    <p className="text-[14px] text-text-muted font-mono animate-pulse">SYNCHRONIZING IDENTITY REGISTRY...</p>
                  </td>
                </tr>
              ) : (
                users.map((u: any) => {
                  const roleInfo = roleStyles[u.role] || roleStyles.PATIENT;
                  return (
                    <tr key={u.id} className="border-b border-ui-border last:border-0 hover:bg-brand-indigo/[0.02] transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl ${roleInfo.bg} border border-white/5 flex items-center justify-center ${roleInfo.text} font-bold text-[14px] shadow-inner`}>
                            {u.first_name?.[0]}{u.last_name?.[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[14px] font-bold text-text-primary truncate">{u.first_name} {u.last_name}</p>
                            <p className="text-[11px] text-text-muted font-mono truncate mt-0.5">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${roleInfo.bg} ${roleInfo.text} border border-current/10`}>
                          <roleInfo.icon size={12} />
                          <span className="text-[10px] font-bold font-mono tracking-wider uppercase">
                            {u.role === 'SECRETAIRE' ? 'SECRETARY' : u.role}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                         <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${u.is_active ? 'bg-state-success animate-pulse' : 'bg-state-error'} shadow-[0_0_8px_currentColor]`}></span>
                            <span className="text-[13px] font-medium text-text-primary">
                              {u.is_active ? 'Authorized' : 'Suspended'}
                            </span>
                         </div>
                      </td>
                      <td className="px-6 py-5 text-[13px] text-text-muted font-mono">
                        {formatDate(u.created_at)}
                      </td>
                      <td className="px-6 py-5 text-[13px] text-text-muted font-mono">
                        {u.last_login ? formatDate(u.last_login) : '—'}
                      </td>
                      <td className="px-6 py-5 text-right">
                         <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => setSelectedUser(u)}
                              className="px-3 py-1.5 rounded-lg bg-bg-surface border border-ui-border text-[11px] font-bold text-text-primary hover:bg-ui-border transition-all flex items-center gap-1.5 shadow-sm"
                              title="Inspect Details"
                            >
                              <Eye size={12} /> DETAILS
                            </button>
                            
                            <button 
                               onClick={() => toggleActiveMutation.mutate(u)}
                               className={`px-3 py-1.5 rounded-lg border font-bold text-[11px] transition-all flex items-center gap-1.5 ${
                                  u.is_active 
                                    ? 'bg-state-error/10 text-state-error border-state-error/20 hover:bg-state-error hover:text-white hover:shadow-[0_0_12px_rgba(239,68,68,0.3)]' 
                                    : 'bg-state-success/10 text-state-success border-state-success/20 hover:bg-state-success hover:text-white hover:shadow-[0_0_12px_rgba(34,197,94,0.3)]'
                               }`}
                               title={u.is_active ? "Suspend Access" : "Restore Access"}
                            >
                               <Power size={12} />
                            </button>

                            {u.locked_until && (
                               <button 
                                  onClick={() => unlockUserMutation.mutate(u.id)}
                                  className="px-3 py-1.5 rounded-lg bg-state-warning/10 text-state-warning border border-state-warning/20 font-bold text-[11px] hover:bg-state-warning hover:text-white hover:shadow-[0_0_12px_rgba(245,158,11,0.3)] transition-all flex items-center gap-1.5"
                                  title="Unlock Account"
                               >
                                  <Unlock size={12} />
                               </button>
                            )}
                         </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-6 bg-bg-surface/30 border-t border-ui-border flex flex-wrap items-center justify-between gap-6">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <p className="text-[13px] text-text-muted font-mono whitespace-nowrap">
              IDENTITIES: <span className="text-text-primary font-bold">{totalCount.toLocaleString()}</span> REGISTRY ENTRIES
            </p>
            <div className="hidden sm:block h-4 w-px bg-ui-border"></div>
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="text-[11px] text-text-muted font-mono uppercase tracking-widest whitespace-nowrap">Items per page:</span>
              <select 
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-bg-input border border-ui-border text-text-primary text-[13px] rounded-lg px-2 py-1 outline-none focus:border-brand-indigo/50"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ui-border text-[12px] font-medium text-text-muted hover:text-text-primary hover:bg-bg-input disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={14} /> PREV
            </button>
            <div className="hidden sm:flex items-center gap-1.5">
              {(() => {
                const pages = [];
                const maxVisible = 5;
                let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                let endPage = Math.min(totalPages, startPage + maxVisible - 1);
                
                if (endPage - startPage + 1 < maxVisible) {
                  startPage = Math.max(1, endPage - maxVisible + 1);
                }

                for (let i = startPage; i <= endPage; i++) {
                  pages.push(
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i)}
                      className={`w-8 h-8 rounded-lg text-[13px] font-medium flex items-center justify-center transition-all ${
                        currentPage === i 
                          ? 'bg-brand-indigo text-white shadow-lg' 
                          : 'text-text-muted hover:text-text-primary hover:bg-bg-input'
                      }`}
                    >
                      {i}
                    </button>
                  );
                }
                return pages;
              })()}
            </div>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ui-border text-[12px] font-medium text-text-muted hover:text-text-primary hover:bg-bg-input disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              NEXT <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Inspection Panel */}
      <AnimatePresence>
        {selectedUser && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-40"
            />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              className="fixed right-0 top-0 bottom-0 w-[450px] bg-bg-canvas border-l border-ui-border z-50 p-10 flex flex-col"
            >
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-[24px] font-serif italic text-text-primary">Identity Profile</h3>
                <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-bg-surface rounded-full text-text-muted transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex flex-col items-center mb-10 text-center">
                 <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-indigo/30 to-transparent border border-brand-indigo/20 flex items-center justify-center text-brand-lavender text-[32px] font-bold mb-4">
                   {selectedUser.first_name?.[0]}{selectedUser.last_name?.[0]}
                 </div>
                 <h4 className="text-[20px] font-bold text-text-primary">{selectedUser.first_name} {selectedUser.last_name}</h4>
                 <p className="text-text-muted text-[14px] font-mono mt-1">{selectedUser.email}</p>
              </div>

              <div className="space-y-6 flex-1">
                 <div className="glass-island border border-ui-border rounded-2xl p-6 space-y-4">
                    <h5 className="text-[11px] font-mono text-text-muted uppercase tracking-widest border-b border-ui-border pb-2">Operational Context</h5>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <p className="text-[10px] text-text-muted uppercase">Role</p>
                          <p className="text-[14px] font-bold text-brand-lavender">{selectedUser.role}</p>
                       </div>
                       <div>
                          <p className="text-[10px] text-text-muted uppercase">Joined</p>
                          <p className="text-[14px] font-bold text-text-primary">{formatDate(selectedUser.created_at)}</p>
                       </div>
                       <div>
                          <p className="text-[10px] text-text-muted uppercase">Account ID</p>
                          <p className="text-[11px] font-mono text-text-muted">#{selectedUser.id.slice(0, 8)}</p>
                       </div>
                       <div>
                          <p className="text-[10px] text-text-muted uppercase">Last Sync</p>
                          <p className="text-[11px] font-mono text-text-muted">{selectedUser.last_login ? formatTime(selectedUser.last_login) : 'Never'}</p>
                       </div>
                    </div>
                 </div>

                 {selectedUser.locked_until && (
                   <div className="p-4 rounded-xl bg-state-error/10 border border-state-error/20 flex items-start gap-3">
                      <Lock size={18} className="text-state-error shrink-0" />
                      <div>
                         <p className="text-[13px] font-bold text-state-error uppercase tracking-tighter">Security Lockout Active</p>
                         <p className="text-[12px] text-text-muted mt-0.5">Account has been disabled due to suspicious activity or manual override.</p>
                      </div>
                   </div>
                 )}
              </div>

              <div className="mt-auto space-y-3">
                 {selectedUser.locked_until && (
                    <button 
                      onClick={() => unlockUserMutation.mutate(selectedUser.id)}
                      className="w-full py-4 rounded-xl bg-state-warning/10 text-state-warning border border-state-warning/20 font-bold text-[13px] hover:bg-state-warning hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                      <Unlock size={16} /> CLEAR SECURITY LOCKOUT
                    </button>
                 )}
                 <button 
                   onClick={() => toggleActiveMutation.mutate(selectedUser)}
                   className={`w-full py-4 rounded-xl font-bold text-[13px] border transition-all flex items-center justify-center gap-2 ${selectedUser.is_active ? 'bg-state-error/10 text-state-error border-state-error/20 hover:bg-state-error hover:text-white' : 'bg-state-success/10 text-state-success border-state-success/20 hover:bg-state-success hover:text-white'}`}
                 >
                    <Power size={16} /> {selectedUser.is_active ? 'SUSPEND IDENTITY ACCESS' : 'RESTORE IDENTITY ACCESS'}
                 </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
