import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../../contexts/LanguageContext';
import { X, Building2, Video, Calendar, Clock, Lock, User as UserIcon, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getContacts } from '../../services/patientService';
import { getAvailableSlots, createAppointment } from '../../services/appointmentService';
import { format } from 'date-fns';

interface BookingFlowModalProps {
  onClose: () => void;
  onBook?: (details: any) => void;
}

export const BookingFlowModal: React.FC<BookingFlowModalProps> = ({ onClose, onBook }) => {
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [slot, setSlot] = useState<{ start: string, end: string } | null>(null);
  const [type, setType] = useState<'VISIO' | 'PRESENTIEL' | null>(null);
  const [motive, setMotive] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { data: contacts, isLoading: loadingContacts } = useQuery({
    queryKey: ['patient-contacts'],
    queryFn: getContacts
  });

  const doctors = contacts?.filter((c: any) => c.role === 'DOCTOR') || [];
  const selectedDoctor = doctors.find((d: any) => d.id === doctorId);

  const { data: availableSlots, isLoading: loadingSlots } = useQuery({
    queryKey: ['available-slots', doctorId, date],
    queryFn: () => getAvailableSlots({ doctor_id: doctorId!, date }),
    enabled: !!doctorId && !!date
  });

  const confirmBooking = async () => {
    if (!doctorId || !slot || !type || !motive.trim()) return;
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await createAppointment({
        doctor: doctorId,
        start_datetime: slot.start,
        end_datetime: slot.end,
        consultation_type: type,
        motive: motive.trim(),
        status: 'REQUESTED'
      });
      if (onBook) onBook({});
      onClose();
    } catch (err: any) {
      const data = err.response?.data;
      if (data && typeof data === 'object' && !data.detail) {
        const firstKey = Object.keys(data)[0];
        setErrorMsg(`${firstKey}: ${data[firstKey]}`);
      } else {
        setErrorMsg(err.response?.data?.detail || 'Failed to submit booking request.');
      }
      setIsSubmitting(false);
    }
  };

  const inPersonText = t('appt.type.inperson');
  const displayInPerson = inPersonText === 'appt.type.inperson' ? 'In Person' : inPersonText;

  const videoText = t('appt.type.video');
  const displayVideo = videoText === 'appt.type.video' ? 'Video Consultation' : videoText;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", duration: 0.4 }}
        className="bg-bg-surface border border-ui-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between p-6 border-b border-ui-border sticky top-0 bg-bg-surface z-10">
          <div className="flex items-center gap-4">
             {step > 1 && (
                <button onClick={() => setStep(s => s - 1)} className="text-text-muted hover:text-text-primary text-[14px]">
                  ← Back
                </button>
             )}
             <h2 className="text-[20px] font-sans font-semibold text-text-primary">Book an Appointment</h2>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary p-2">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto">

           {step === 1 && (
             <div className="flex flex-col items-center">
               <h3 className="text-[24px] font-serif italic text-text-primary text-center mb-2">
                 Choose a Doctor
               </h3>
               <p className="text-[14px] text-text-muted text-center mb-10">
                 Select the doctor you want to request an appointment with.
               </p>

               {loadingContacts ? (
                 <Loader2 className="w-8 h-8 animate-spin text-brand-indigo" />
               ) : (
                 <div className="w-full max-w-md space-y-3">
                   {doctors.map((doc: any) => (
                     <button
                       key={doc.id}
                       onClick={() => setDoctorId(doc.id)}
                       className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${doctorId === doc.id ? 'bg-brand-indigo/5 border-brand-indigo shadow-sm' : 'bg-bg-input border-ui-border hover:border-brand-indigo/50'}`}
                     >
                       <div className={`w-12 h-12 rounded-full flex items-center justify-center ${doctorId === doc.id ? 'bg-brand-indigo text-white' : 'bg-ui-border text-text-muted'}`}>
                         <UserIcon size={24} />
                       </div>
                       <div className="text-left">
                         <div className="text-[16px] font-semibold text-text-primary">{doc.name}</div>
                         <div className="text-[13px] text-text-muted">General Practitioner</div>
                       </div>
                     </button>
                   ))}
                   {doctors.length === 0 && (
                     <div className="text-center text-text-muted text-[14px]">No doctors available.</div>
                   )}
                 </div>
               )}

               <button 
                 disabled={!doctorId}
                 onClick={() => setStep(2)}
                 className="mt-10 px-8 py-3 bg-brand-indigo text-white rounded-xl text-[14px] font-medium transition-all hover:bg-brand-indigo-glow disabled:opacity-50 mx-auto"
               >
                 Continue
               </button>
             </div>
           )}

           {step === 2 && (
             <div className="flex flex-col w-full max-w-xl mx-auto">
               <h3 className="text-[20px] font-serif italic text-text-primary mb-6">Select Date & Time</h3>
               
               <div className="mb-4 text-[14px] font-medium text-text-primary flex items-center gap-2">
                 <Calendar size={16} /> Date
               </div>
               <input 
                 type="date" 
                 min={format(new Date(), 'yyyy-MM-dd')}
                 value={date}
                 onChange={e => { setDate(e.target.value); setSlot(null); }}
                 className="w-full bg-bg-input border border-ui-border rounded-xl px-4 py-3 text-[14px] text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all mb-8"
               />

               <div className="mt-2 mb-4 text-[14px] font-medium text-text-primary flex items-center gap-2">
                 <Clock size={16} /> Available Slots
               </div>
               
               {loadingSlots ? (
                 <div className="flex items-center justify-center py-8">
                   <Loader2 className="w-8 h-8 animate-spin text-brand-indigo" />
                 </div>
               ) : (
                 <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {availableSlots?.map((s: any, idx: number) => {
                       const tStr = format(new Date(s.start_datetime), 'HH:mm');
                       return (
                         <button
                           key={idx}
                           disabled={!s.is_available}
                           onClick={() => setSlot({ start: s.start_datetime, end: s.end_datetime })}
                           className={`px-3 py-2 rounded-xl border text-[14px] font-mono transition-all ${!s.is_available ? 'bg-bg-input border-ui-border opacity-40 cursor-not-allowed' : slot?.start === s.start_datetime ? 'bg-brand-indigo outline outline-2 outline-brand-indigo/30 border-transparent text-white scale-[1.02]' : 'bg-bg-surface border-ui-border text-text-primary hover:border-brand-indigo/50'}`}
                         >
                           {tStr}
                         </button>
                       )
                    })}
                    {(!availableSlots || availableSlots.length === 0) && (
                      <div className="col-span-full text-center text-[14px] text-text-muted py-4">
                        No slots available on this date.
                      </div>
                    )}
                 </div>
               )}

               <button 
                 disabled={!date || !slot}
                 onClick={() => setStep(3)}
                 className="mt-10 px-8 py-3 bg-brand-indigo text-white rounded-xl text-[14px] font-medium transition-all hover:bg-brand-indigo-glow disabled:opacity-50 mx-auto"
               >
                 Continue
               </button>
             </div>
           )}

           {step === 3 && (
             <div className="flex flex-col items-center">
               <h3 className="text-[24px] font-serif italic text-text-primary text-center mb-2">
                 {t('appt.choose.title') || 'How would you like to meet your doctor?'}
               </h3>
               
               <div className="flex flex-col sm:flex-row gap-6 w-full max-w-xl mt-8">
                 <button 
                   onClick={() => setType('PRESENTIEL')}
                   className={`type-choice-card in-person ${type === 'PRESENTIEL' ? 'selected' : ''} relative`}
                 >
                    <div className="type-icon-circle">
                       <Building2 size={24} />
                    </div>
                    <div className="font-serif italic text-[20px] text-text-primary">
                       {displayInPerson}
                    </div>
                    <div className="text-[13px] text-text-muted">
                       {t('appt.inperson.desc') || 'Visit the clinic at your scheduled appointment time'}
                    </div>
                 </button>

                 <button 
                   onClick={() => setType('VISIO')}
                   className={`type-choice-card video ${type === 'VISIO' ? 'selected' : ''} relative`}
                 >
                    <div className="type-icon-circle">
                       <Video size={24} />
                    </div>
                    <div className="font-serif italic text-[20px] text-text-primary">
                       {displayVideo}
                    </div>
                    <div className="text-[13px] text-text-muted mb-2">
                       {t('appt.video.desc') || 'Consult your doctor from home via secure video call'}
                    </div>
                    <div className="video-note">
                       {t('appt.video.secure') || '<Lock size={12} className="inline mr-1" /> Encrypted · HIPAA Compliant'}
                    </div>
                 </button>
               </div>

               <div className="w-full max-w-xl mt-8">
                  <label className="block text-[13px] text-text-muted mb-2 font-medium">Reason for visit (Required):</label>
                  <input 
                    type="text" 
                    value={motive}
                    onChange={(e) => setMotive(e.target.value)}
                    placeholder="e.g. Follow-up on blood pressure medication"
                    className="w-full bg-bg-surface border border-ui-border rounded-xl px-4 py-3 text-[14px] text-text-primary focus:outline-none focus:border-brand-indigo transition-colors"
                  />
               </div>

               {errorMsg && (
                 <div className="mt-6 p-4 w-full max-w-xl bg-state-error/10 border border-state-error/20 rounded-xl text-state-error text-[14px]">
                   {errorMsg}
                 </div>
               )}

               <button 
                 disabled={!type || !motive.trim() || isSubmitting}
                 onClick={confirmBooking}
                 className="mt-6 px-8 py-3.5 flex items-center gap-2 bg-brand-indigo text-white rounded-xl text-[14px] font-medium transition-all hover:bg-brand-indigo-glow disabled:opacity-50 mx-auto w-full max-w-xl justify-center"
               >
                 {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Request'}
               </button>
             </div>
           )}
        </div>
      </motion.div>
    </div>
  );
};
