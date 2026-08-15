import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatDate } from '../../utils/format';
import { 
  Search, 
  Filter, 
  Download, 
  Clock, 
  Stethoscope, 
  ChevronLeft,
  ChevronRight,
  Loader2,
  CalendarDays,
  Eye,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { getAppointments, exportAppointmentsCsv } from '../../services/adminService';

export default function AdminAppointmentsPage() {
  const { t } = useLanguage();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const blob = await exportAppointmentsCsv({
        search: search || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `appointments_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error("Failed to export:", e);
    } finally {
      setIsExporting(false);
    }
  };

  const { data: apptsData, isLoading } = useQuery({
    queryKey: ['adminAppointments', page, search, statusFilter],
    queryFn: () => getAppointments({
      page,
      search: search || undefined,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
    }),
  });

  const appointments = apptsData?.results || [];
  const totalCount = apptsData?.count || 0;
  const itemsPerPage = 10;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'CONFIRMED': 'bg-state-success/10 text-state-success border-state-success/20',
      'DONE': 'bg-state-success/10 text-state-success border-state-success/20',
      'COMPLETED': 'bg-state-success/10 text-state-success border-state-success/20',
      'PLANNED': 'bg-state-warning/10 text-state-warning border-state-warning/20',
      'IN_PROGRESS': 'bg-brand-indigo/10 text-brand-indigo border-brand-indigo/20',
      'CANCELLED': 'bg-state-error/10 text-state-error border-state-error/20',
      'REJECTED': 'bg-state-error/10 text-state-error border-state-error/20',
      'REQUESTED': 'bg-bg-surface border-ui-border text-text-muted',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono border ${styles[status] || 'bg-ui-border text-text-muted'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h2 className="text-[36px] font-serif italic text-text-primary leading-tight flex flex-wrap gap-x-[0.3em]">
             {(t('admin.appointments.title') || "Appointments Registry").split(' ').map((word, i) => (
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
            {t('admin.appointments.subtitle') || "Global oversight of all medical consultations within the MedEra network."}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 bg-bg-surface border border-ui-border text-text-primary px-5 py-2.5 rounded-xl text-[13px] font-medium hover:bg-ui-border transition-all hover:shadow-[0_0_20px_rgba(75,74,207,0.1) active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? <Loader2 size={14} className="animate-spin text-brand-lavender" /> : <Download size={14} className="text-brand-lavender" />} 
            {t('common.export') || "Export Ledger"}
          </button>
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'System Volume', value: totalCount.toString(), icon: CalendarDays, color: 'text-brand-indigo' },
          { label: 'Operational Status', value: 'Active', icon: CheckCircle2, color: 'text-state-success' },
          { label: 'Real-time Sync', value: '100%', icon: Clock, color: 'text-state-warning' },
          { label: 'Network Density', value: 'High', icon: Stethoscope, color: 'text-brand-lavender' }
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="glass-island border border-ui-border p-5 rounded-2xl backdrop-blur-md hover:border-brand-indigo/30 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-bg-surface border border-ui-border ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <div>
                <p className="text-[10px] font-mono text-text-muted uppercase tracking-widest">{stat.label}</p>
                <p className="text-[22px] font-bold text-text-primary mt-0.5">{stat.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          <input 
            type="text" 
            placeholder={t('admin.appointments.searchPlaceholder') || "Search Registry..."}
            className="w-full bg-bg-surface border border-ui-border rounded-xl pl-11 pr-4 py-3.5 text-[14px] text-text-primary focus:border-brand-indigo/50 focus:ring-4 focus:ring-brand-indigo/10 outline-none transition-all placeholder:text-text-muted/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-3 bg-bg-surface border border-ui-border rounded-xl">
             <Filter className="text-text-muted" size={16} />
             <select 
               value={statusFilter}
               onChange={(e) => setStatusFilter(e.target.value)}
               className="bg-transparent text-[14px] text-text-primary outline-none min-w-[140px] font-medium"
             >
               <option value="ALL">All Lifecycle States</option>
               <option value="REQUESTED">Requested</option>
               <option value="PLANNED">Planned</option>
               <option value="CONFIRMED">Confirmed</option>
               <option value="IN_PROGRESS">In Progress</option>
               <option value="DONE">Done</option>
               <option value="COMPLETED">Completed</option>
               <option value="REJECTED">Rejected</option>
               <option value="CANCELLED">Cancelled</option>
             </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-island border border-ui-border rounded-[24px] overflow-hidden backdrop-blur-xl shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-ui-border bg-bg-surface/50">
                <th className="px-6 py-5 text-[11px] font-mono text-text-muted uppercase tracking-[0.2em]">{t('admin.appointments.patient') || "Patient"}</th>
                <th className="px-6 py-5 text-[11px] font-mono text-text-muted uppercase tracking-[0.2em]">{t('admin.appointments.doctor') || "Practitioner"}</th>
                <th className="px-6 py-5 text-[11px] font-mono text-text-muted uppercase tracking-[0.2em]">{t('admin.appointments.type') || "Type"}</th>
                <th className="px-6 py-5 text-[11px] font-mono text-text-muted uppercase tracking-[0.2em]">{t('admin.appointments.dateTime') || "Temporal Context"}</th>
                <th className="px-6 py-5 text-[11px] font-mono text-text-muted uppercase tracking-[0.2em]">{t('admin.appointments.status') || "State"}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-32 text-center">
                    <div className="flex flex-col items-center gap-3">
                       <Loader2 className="w-10 h-10 animate-spin text-brand-indigo" />
                       <p className="text-[14px] text-text-muted font-mono animate-pulse">SYNCHRONIZING REGISTRY...</p>
                    </div>
                  </td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-32 text-center">
                    <div className="flex flex-col items-center gap-4 text-text-muted opacity-40">
                       <Layers size={48} strokeWidth={1} />
                       <p className="text-[16px] font-medium italic">No active data points found in this segment.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                appointments.map((apt: any) => (
                  <tr key={apt.id} className="border-b border-ui-border last:border-0 hover:bg-brand-indigo/[0.02] transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-indigo/20 to-transparent border border-brand-indigo/20 flex items-center justify-center text-brand-lavender text-[14px] font-bold">
                          {apt.patient_name?.[0] || 'P'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[14px] font-bold text-text-primary truncate">{apt.patient_name}</p>
                          <p className="text-[11px] text-text-muted font-mono tracking-tighter mt-0.5">{apt.patient_phone || '#EXTERNAL'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-brand-lavender/10 border border-brand-lavender/20 flex items-center justify-center text-brand-lavender shrink-0">
                          <Stethoscope size={14} />
                        </div>
                        <span className="text-[14px] font-medium text-text-primary truncate max-w-[150px]">Dr. {apt.doctor_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                       <span className="px-2 py-1 rounded bg-bg-surface border border-ui-border text-[10px] font-bold font-mono text-text-muted uppercase tracking-widest">
                          {apt.appointment_type || 'Consultation'}
                       </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                        <p className="text-[13px] font-medium text-text-primary">
                          {formatDate(apt.start_datetime)}
                        </p>
                        <p className="text-[11px] text-text-muted flex items-center gap-1.5 font-mono">
                          <Clock size={12} className="text-brand-lavender" /> {formatDate(apt.start_datetime, 'HH:mm')}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {getStatusBadge(apt.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-6 bg-bg-surface/30 border-t border-ui-border flex items-center justify-between">
          <p className="text-[13px] text-text-muted font-mono tracking-tight">
            SEGMENT: <span className="text-text-primary font-bold">{(page - 1) * itemsPerPage + 1}</span>—
            <span className="text-text-primary font-bold">{Math.min(page * itemsPerPage, totalCount)}</span> / 
            <span className="text-text-primary font-bold"> {totalCount}</span> RECORDS
          </p>
          <div className="flex items-center gap-4">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 border border-ui-border rounded-xl hover:bg-bg-surface disabled:opacity-20 disabled:cursor-not-allowed transition-all text-[12px] font-bold text-text-primary flex items-center gap-2"
            >
              <ChevronLeft size={16} /> PREV
            </button>
            <div className="hidden sm:flex items-center gap-1.5">
              {[...Array(Math.min(5, totalPages))].map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => setPage(i + 1)}
                  className={`w-9 h-9 rounded-xl text-[12px] font-bold font-mono transition-all ${page === i + 1 ? 'bg-brand-indigo text-white shadow-[0_0_20px_rgba(75,74,207,0.4)]' : 'hover:bg-bg-surface text-text-muted border border-transparent hover:border-ui-border'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button 
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
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
