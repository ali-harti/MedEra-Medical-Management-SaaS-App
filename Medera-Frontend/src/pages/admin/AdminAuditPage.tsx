import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatDate, formatFull } from '../../utils/format';
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Download, 
  Copy, 
  Calendar, 
  Loader2, 
  ShieldCheck, 
  Activity, 
  Database, 
  History,
  Terminal,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getAuditLog, exportAuditLogCsv } from '../../services/adminService';
import { useQuery } from '@tanstack/react-query';

const getAuditStatusStyle = (action: string) => {
  const upperAction = action.toUpperCase();
  if (upperAction.includes('CREATE') || upperAction.includes('APPROVE') || upperAction.includes('FINAL')) {
    return 'bg-state-success/10 text-state-success border-state-success/20 shadow-[0_0_12px_rgba(34,197,94,0.1)]';
  }
  if (upperAction.includes('UPDATE') || upperAction.includes('MODIFY') || upperAction.includes('READ')) {
    return 'bg-state-warning/10 text-state-warning border-state-warning/20 shadow-[0_0_12px_rgba(245,158,11,0.1)]';
  }
  if (upperAction.includes('DELETE') || upperAction.includes('REJECT') || upperAction.includes('LOCK')) {
    return 'bg-state-error/10 text-state-error border-state-error/20 shadow-[0_0_12px_rgba(239,68,68,0.1)]';
  }
  return 'bg-brand-indigo/10 text-brand-indigo border-brand-indigo/20 shadow-[0_0_12px_rgba(75,74,207,0.1)]';
};

export default function AdminAuditPage() {
  const { t } = useLanguage();
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { data, isLoading } = useQuery({
    queryKey: ['admin_audit_log', currentPage, searchTerm, actionFilter, itemsPerPage],
    queryFn: () => getAuditLog({
      page: currentPage,
      page_size: itemsPerPage,
      action: actionFilter === 'ALL' ? undefined : actionFilter,
    }),
  });

  const auditEntries = data?.results ?? [];
  const totalEntries = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalEntries / itemsPerPage));

  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await exportAuditLogCsv({
        action: actionFilter === 'ALL' ? undefined : actionFilter,
      });
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit_ledger_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Export failed", err);
      alert("Failed to export ledger. Ensure your session is valid.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h2 className="text-[36px] font-serif italic text-text-primary leading-tight flex flex-wrap gap-x-[0.3em]">
             {(t('admin.audit.registry') || "System Audit Registry").split(' ').map((word, i) => (
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
            {t('admin.audit.immutableRecord') || "Cryptographically signed ledger of all administrative and clinical actions."}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <motion.button 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 bg-bg-surface border border-ui-border text-text-primary px-5 py-2.5 rounded-xl text-[13px] font-medium hover:bg-ui-border transition-all hover:shadow-[0_0_20px_rgba(75,74,207,0.1)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? <Loader2 size={14} className="text-brand-lavender animate-spin" /> : <Download size={14} className="text-brand-lavender" />} 
            {isExporting ? "Exporting..." : (t('admin.audit.exportCSV') || "Export Ledger")}
          </motion.button>
        </div>
      </div>

      {/* Oversight Dashboard Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Event Density', value: totalEntries.toLocaleString(), icon: History, color: 'text-brand-indigo' },
          { label: 'Security Context', value: 'Immutable', icon: ShieldCheck, color: 'text-state-success' },
          { label: 'Source Nodes', value: 'Cluster-01', icon: Database, color: 'text-brand-lavender' },
          { label: 'Operational Sync', value: 'Live', icon: Activity, color: 'text-state-warning' }
        ].map((stat, i) => (
          <div key={i} className="glass-island border border-ui-border p-5 rounded-2xl">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-bg-surface border border-ui-border ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <div>
                <p className="text-[10px] font-mono text-text-muted uppercase tracking-widest">{stat.label}</p>
                <p className="text-[20px] font-bold text-text-primary mt-0.5">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter System */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <input 
            type="text" 
            placeholder={t('admin.audit.searchEvents') || "Search ledger by user, IP, or object ID..."}
            className="w-full bg-bg-surface border border-ui-border rounded-xl pl-12 pr-4 py-3.5 text-[14px] text-text-primary focus:border-brand-indigo/50 focus:ring-4 focus:ring-brand-indigo/10 outline-none transition-all placeholder:text-text-muted/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-3 bg-bg-surface border border-ui-border rounded-xl">
             <Terminal className="text-text-muted" size={16} />
             <select 
               value={actionFilter}
               onChange={(e) => { setActionFilter(e.target.value); setCurrentPage(1); }}
               className="bg-transparent text-[14px] text-text-primary outline-none min-w-[140px] font-medium"
             >
               <option value="ALL">All Event Vectors</option>
               <option value="CREATION">Creation</option>
               <option value="MODIFICATION">Modification</option>
               <option value="FINALIZED">Finalized</option>
               <option value="LOCKOUT">Lockout</option>
               <option value="APPROVED">Approved</option>
               <option value="REJECTED">Rejected</option>
             </select>
          </div>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="glass-island border border-ui-border rounded-[24px] overflow-hidden backdrop-blur-xl shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-ui-border bg-bg-surface/50">
                <th className="px-6 py-5 text-[11px] font-mono text-text-muted uppercase tracking-[0.2em]">Temporal Context</th>
                <th className="px-6 py-5 text-[11px] font-mono text-text-muted uppercase tracking-[0.2em]">Action Vector</th>
                <th className="px-6 py-5 text-[11px] font-mono text-text-muted uppercase tracking-[0.2em]">Actor</th>
                <th className="px-6 py-5 text-[11px] font-mono text-text-muted uppercase tracking-[0.2em]">System Domain</th>
                <th className="px-6 py-5 text-[11px] font-mono text-text-muted uppercase tracking-[0.2em]">Access Source</th>
                <th className="px-6 py-5 text-[11px] font-mono text-text-muted uppercase tracking-[0.2em] text-right">Details</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-32 text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-brand-indigo mx-auto mb-4" />
                    <p className="text-[14px] text-text-muted font-mono animate-pulse">RECONSTRUCTING EVENT LEDGER...</p>
                  </td>
                </tr>
              ) : auditEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-32 text-center text-text-muted font-sans italic opacity-40">
                    No matching audit data points found in this segment.
                  </td>
                </tr>
              ) : (
                auditEntries.map((log: any) => (
                  <React.Fragment key={log.id}>
                    <tr 
                      onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                      className={`border-b border-ui-border last:border-0 hover:bg-brand-indigo/[0.02] transition-all cursor-pointer group ${expandedRow === log.id ? 'bg-brand-indigo/[0.03]' : ''}`}
                    >
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                            <span className="text-[13px] font-bold text-text-primary">
                              {formatDate(log.timestamp)}
                            </span>
                            <span className="text-[11px] text-text-muted font-mono flex items-center gap-1.5 mt-0.5">
                              <Calendar size={12} className="text-brand-lavender" /> {formatDate(log.timestamp, 'HH:mm:ss')}
                            </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                         <span className={`px-2.5 py-1 rounded-sm text-[10px] font-bold font-mono tracking-widest border ${getAuditStatusStyle(log.action)}`}>
                            {log.action}
                         </span>
                      </td>
                      <td className="px-6 py-5">
                         <div className="flex flex-col">
                            <span className="text-[13px] font-medium text-text-primary truncate max-w-[180px]">{log.user_email || 'SYSTEM'}</span>
                            <span className="text-[10px] font-mono text-text-muted tracking-tighter uppercase mt-0.5">{log.role || 'CORE'}</span>
                         </div>
                      </td>
                      <td className="px-6 py-5">
                         <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-brand-lavender" />
                            <span className="text-[13px] font-mono text-text-primary/80">{log.model_name}</span>
                         </div>
                      </td>
                      <td className="px-6 py-5 text-[12px] font-mono text-text-muted">
                        {log.ip_address || 'Internal Cluster'}
                      </td>
                      <td className="px-6 py-5 text-right">
                         <div className={`p-2 rounded-lg border border-transparent group-hover:border-ui-border transition-all inline-block ${expandedRow === log.id ? 'bg-bg-surface rotate-180' : ''}`}>
                            <ChevronDown size={16} className="text-text-muted" />
                         </div>
                      </td>
                    </tr>
                    <AnimatePresence>
                      {expandedRow === log.id && (
                        <motion.tr 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="bg-bg-canvas/50"
                        >
                          <td colSpan={6} className="p-0 border-b border-ui-border shadow-inner">
                             <div className="p-8 space-y-6">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                   <div className="space-y-4">
                                      <h5 className="text-[11px] font-mono text-text-muted uppercase tracking-widest flex items-center gap-2">
                                         <Terminal size={14} className="text-brand-lavender" /> Request Metadata
                                      </h5>
                                      <div className="glass-island border border-ui-border rounded-2xl p-5 space-y-3 font-mono text-[12px]">
                                         <div className="flex justify-between border-b border-white/5 pb-2">
                                            <span className="text-text-muted">Object Signature:</span>
                                            <span className="text-text-primary select-all">#{log.object_id}</span>
                                         </div>
                                         <div className="flex justify-between border-b border-white/5 pb-2">
                                            <span className="text-text-muted">Origin Node:</span>
                                            <span className="text-text-primary">{log.ip_address}</span>
                                         </div>
                                         <div className="space-y-1">
                                            <span className="text-text-muted block">Client Signature:</span>
                                            <span className="text-text-primary/60 block leading-relaxed break-all">{log.user_agent}</span>
                                         </div>
                                      </div>
                                   </div>
                                   <div className="space-y-4">
                                      <h5 className="text-[11px] font-mono text-text-muted uppercase tracking-widest flex items-center gap-2">
                                         <Database size={14} className="text-state-success" /> State Mutations
                                      </h5>
                                      <div className="bg-black/40 border border-white/5 rounded-2xl p-5 overflow-x-auto max-h-[300px] scrollbar-thin scrollbar-thumb-brand-indigo/20">
                                         <pre className="text-[12px] font-mono text-brand-lavender leading-relaxed">
                                            {JSON.stringify(log.changes || { action: 'READ_ONLY_ACCESS' }, null, 2)}
                                         </pre>
                                      </div>
                                   </div>
                                </div>
                                <div className="flex justify-end gap-3">
                                   <button 
                                     onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(JSON.stringify(log.changes)); }}
                                     className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-surface border border-ui-border text-[11px] font-bold text-text-muted hover:text-brand-lavender transition-all"
                                   >
                                      <Copy size={12} /> COPY RAW PAYLOAD
                                   </button>
                                </div>
                             </div>
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-6 bg-bg-surface/30 border-t border-ui-border flex flex-wrap items-center justify-between gap-6">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <p className="text-[13px] text-text-muted font-mono whitespace-nowrap">
              LEDGER DENSITY: <span className="text-text-primary font-bold">{totalEntries.toLocaleString()}</span> COMMITTED ACTIONS
            </p>
            <div className="hidden sm:block h-4 w-px bg-ui-border"></div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-text-muted font-mono uppercase tracking-widest whitespace-nowrap">Items per page:</span>
              <select 
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-bg-input border border-ui-border rounded-lg px-2 py-1 text-[12px] text-text-primary outline-none focus:border-brand-indigo/50 transition-colors"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="px-4 py-2 border border-ui-border rounded-xl hover:bg-bg-surface disabled:opacity-20 disabled:cursor-not-allowed transition-all text-[12px] font-bold text-text-primary flex items-center gap-2"
            >
              <ChevronLeft size={16} /> PREV
            </button>
            <div className="hidden sm:flex items-center gap-1.5">
              {(() => {
                const maxPagesToShow = 5;
                let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
                let endPage = startPage + maxPagesToShow - 1;
                
                if (endPage > totalPages) {
                  endPage = totalPages;
                  startPage = Math.max(1, endPage - maxPagesToShow + 1);
                }

                const pages = [];
                for (let i = startPage; i <= endPage; i++) {
                  pages.push(i);
                }

                return pages.map(page => (
                  <button 
                    key={page} 
                    onClick={() => setCurrentPage(page)}
                    className={`w-9 h-9 rounded-xl text-[12px] font-bold font-mono transition-all ${currentPage === page ? 'bg-brand-indigo text-white shadow-[0_0_20px_rgba(75,74,207,0.4)]' : 'hover:bg-bg-surface text-text-muted border border-transparent hover:border-ui-border'}`}
                  >
                    {page}
                  </button>
                ));
              })()}
            </div>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="px-4 py-2 border border-ui-border rounded-xl hover:bg-bg-surface disabled:opacity-20 disabled:cursor-not-allowed transition-all text-[12px] font-bold text-text-primary flex items-center gap-2"
            >
              NEXT <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
