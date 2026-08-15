import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../components/Toast';
import { Search, ChevronDown, CheckCircle2, ChevronRight, PlayCircle, Star, X, User, Hospital, Calendar, Clock, Timer, Info, Loader2 } from 'lucide-react';
import { createAppointment } from '../../services/appointmentService';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const doctors = [
  {
    id: 'dr-bennani',
    name: 'Dr. Youssef Bennani',
    specialty: 'General Medicine',
    clinic: 'Clinique MedEra',
    avatar: null, // initials: YB
    rating: 4.8,
    reviewCount: 24,
    available: true,
    nextSlot: 'Today 14:30',
    description: 'Specializes in preventive care, chronic disease management, and family medicine. 12 years of experience. Fluent in Arabic, French, and English.',
    languages: ['Arabic', 'French', 'English'],
    tags: ['General Medicine', 'Hypertension', 'Diabetes', 'Preventive Care'],
    secretary: { name: 'Mme. Fatima Zahra', email: 'sec.bennani@medera.com' },
    consultationFee: 200,
    consultationDuration: 30,
    reviews: [
      { author: 'Ahmed M.', rating: 5, date: '2026-04-20', text: 'Very professional and attentive. Took his time to explain everything clearly.' },
      { author: 'Sara K.', rating: 5, date: '2026-04-10', text: 'Excellent doctor. The appointment was on time and the clinic was clean.' },
      { author: 'Omar B.', rating: 4, date: '2026-03-28', text: 'Great experience overall. Would recommend to family and friends.' },
    ],
    availability: {
      'Tuesday May 6':   ['09:00','09:30','10:00','14:30','15:00','15:30'],
      'Wednesday May 7': ['08:30','09:00','11:00','11:30'],
      'Thursday May 8':  ['10:00','10:30','14:00','16:00','16:30'],
    }
  },
  {
    id: 'dr-alami',
    name: 'Dr. Nadia Alami',
    specialty: 'Cardiology',
    clinic: 'Clinique MedEra',
    avatar: null, // initials: NA
    rating: 4.9,
    reviewCount: 41,
    available: true,
    nextSlot: 'Today 16:00',
    description: 'Cardiologist with 15 years of experience in interventional cardiology and heart failure management. Published researcher.',
    languages: ['Arabic', 'French'],
    tags: ['Cardiology', 'Heart Disease', 'Hypertension', 'ECG'],
    secretary: { name: 'M. Khalid Idrissi', email: 'sec.alami@medera.com' },
    consultationFee: 400,
    consultationDuration: 45,
    reviews: [
      { author: 'Hassan R.', rating: 5, date: '2026-04-18', text: 'Dr. Alami is exceptional. Very thorough diagnosis and clear explanations.' },
      { author: 'Layla M.', rating: 5, date: '2026-04-05', text: 'The best cardiologist I have seen. Very reassuring and competent.' },
    ],
    availability: {
      'Tuesday May 6':   ['16:00','16:45'],
      'Thursday May 8':  ['09:00','09:45','10:30','14:00'],
      'Friday May 9':    ['08:00','08:45','09:30'],
    }
  },
  {
    id: 'dr-cherkaoui',
    name: 'Dr. Imane Cherkaoui',
    specialty: 'Dermatology',
    clinic: 'Clinique MedEra',
    avatar: null,
    rating: 4.7,
    reviewCount: 33,
    available: true,
    nextSlot: 'Tomorrow 10:00',
    description: 'Specialist in medical and cosmetic dermatology. Treats acne, eczema, psoriasis, and performs skin cancer screenings.',
    languages: ['Arabic', 'French', 'English'],
    tags: ['Dermatology', 'Acne', 'Eczema', 'Skin Cancer Screening'],
    secretary: { name: 'Mme. Zineb Tazi', email: 'sec.cherkaoui@medera.com' },
    consultationFee: 350,
    consultationDuration: 30,
    reviews: [
      { author: 'Aya S.', rating: 5, date: '2026-04-22', text: 'Incredible results after just one month of treatment. Very happy.' },
      { author: 'Mehdi K.', rating: 4, date: '2026-04-01', text: 'Professional and knowledgeable. Wait time was a bit long.' },
    ],
    availability: {
      'Wednesday May 7': ['10:00','10:30','11:00','11:30','14:00'],
      'Friday May 9':    ['09:00','09:30','10:00','15:00'],
    }
  },
  {
    id: 'dr-naciri',
    name: 'Dr. Amine Naciri',
    specialty: 'Orthopedics',
    clinic: 'Clinique MedEra',
    avatar: null,
    rating: 4.6,
    reviewCount: 19,
    available: false,
    nextSlot: 'Mon May 12',
    description: 'Orthopedic surgeon specializing in sports injuries, joint replacements, and spine conditions. Works with professional athletes.',
    languages: ['Arabic', 'French'],
    tags: ['Orthopedics', 'Sports Injuries', 'Joint Replacement', 'Spine'],
    secretary: { name: 'M. Rachid Benali', email: 'sec.naciri@medera.com' },
    consultationFee: 450,
    consultationDuration: 45,
    reviews: [
      { author: 'Karim H.', rating: 5, date: '2026-03-15', text: 'Fixed my knee problem after years of pain. Highly recommended.' },
    ],
    availability: {
      'Monday May 12':   ['09:00','09:45','10:30','14:00','14:45'],
      'Wednesday May 14':['08:30','09:15','14:00'],
    }
  },
  {
    id: 'dr-senhaji',
    name: 'Dr. Kenza Senhaji',
    specialty: 'Pediatrics',
    clinic: 'Clinique MedEra',
    avatar: null,
    rating: 5.0,
    reviewCount: 52,
    available: true,
    nextSlot: 'Today 11:30',
    description: 'Pediatrician dedicated to child health from newborn to adolescent. Gentle approach with children. Vaccination specialist.',
    languages: ['Arabic', 'French', 'English', 'Spanish'],
    tags: ['Pediatrics', 'Vaccinations', 'Newborn Care', 'Adolescent Health'],
    secretary: { name: 'Mme. Houda Afilal', email: 'sec.senhaji@medera.com' },
    consultationFee: 250,
    consultationDuration: 30,
    reviews: [
      { author: 'Samira L.', rating: 5, date: '2026-04-25', text: 'My children love Dr. Senhaji. She is so patient and kind with them.' },
      { author: 'Yassine O.', rating: 5, date: '2026-04-19', text: 'Perfect for children. My son does not cry during appointments anymore!' },
    ],
    availability: {
      'Tuesday May 6':   ['11:30','12:00','15:00','15:30','16:00'],
      'Wednesday May 7': ['09:00','09:30','10:00'],
      'Thursday May 8':  ['14:00','14:30','15:00','15:30'],
    }
  },
  {
    id: 'dr-fassi',
    name: 'Dr. Tariq Fassi',
    specialty: 'Neurology',
    clinic: 'Clinique MedEra',
    avatar: null,
    rating: 4.5,
    reviewCount: 15,
    available: true,
    nextSlot: 'Tomorrow 09:00',
    description: 'Neurologist specializing in migraines, epilepsy, and multiple sclerosis. Uses the latest diagnostic technologies.',
    languages: ['Arabic', 'French'],
    tags: ['Neurology', 'Migraines', 'Epilepsy', 'MS'],
    secretary: { name: 'Mme. Siham Berrada', email: 'sec.fassi@medera.com' },
    consultationFee: 500,
    consultationDuration: 60,
    reviews: [
      { author: 'Nawal B.', rating: 4, date: '2026-04-12', text: 'Finally a diagnosis after years of headaches. Very thorough examination.' },
    ],
    availability: {
      'Wednesday May 7': ['09:00','10:00','11:00'],
      'Friday May 9':    ['14:00','15:00','16:00'],
    }
  },
  {
    id: 'dr-benhaddou',
    name: 'Dr. Salma Benhaddou',
    specialty: 'Gynecology',
    clinic: 'Clinique MedEra',
    avatar: null,
    rating: 4.9,
    reviewCount: 67,
    available: true,
    nextSlot: 'Today 15:30',
    description: 'OB-GYN with expertise in prenatal care, fertility, and minimally invasive surgery. Caring and discreet approach.',
    languages: ['Arabic', 'French'],
    tags: ['Gynecology', 'Prenatal Care', 'Fertility', "Women's Health"],
    secretary: { name: 'Mme. Nora Kettani', email: 'sec.benhaddou@medera.com' },
    consultationFee: 400,
    consultationDuration: 45,
    reviews: [
      { author: 'Rania M.', rating: 5, date: '2026-04-23', text: 'Extremely professional and kind. Made me feel completely at ease.' },
      { author: 'Dounia A.', rating: 5, date: '2026-04-14', text: 'Best gynecologist in the clinic. Very reassuring during my pregnancy.' },
    ],
    availability: {
      'Tuesday May 6':   ['15:30','16:15'],
      'Thursday May 8':  ['09:00','09:45','10:30','11:15'],
      'Friday May 9':    ['14:00','14:45','15:30'],
    }
  },
  {
    id: 'dr-bensouda',
    name: 'Dr. Omar Bensouda',
    specialty: 'Ophthalmology',
    clinic: 'Clinique MedEra',
    avatar: null,
    rating: 4.7,
    reviewCount: 28,
    available: false,
    nextSlot: 'Thu May 8',
    description: 'Eye specialist treating cataracts, glaucoma, and diabetic retinopathy. Performs laser vision correction consultations.',
    languages: ['Arabic', 'French', 'English'],
    tags: ['Ophthalmology', 'Cataracts', 'Glaucoma', 'Laser Vision'],
    secretary: { name: 'M. Adil Lamrani', email: 'sec.bensouda@medera.com' },
    consultationFee: 350,
    consultationDuration: 30,
    reviews: [
      { author: 'Khalil R.', rating: 5, date: '2026-04-08', text: 'Very precise and thorough eye examination. Highly professional.' },
      { author: 'Widad N.', rating: 4, date: '2026-03-20', text: 'Good doctor. Waiting room was a bit crowded but worth it.' },
    ],
    availability: {
      'Thursday May 8':  ['09:00','09:30','10:00','10:30','14:00','14:30'],
      'Monday May 12':   ['09:00','09:30','10:00'],
    }
  }
];

export default function PatientFindDoctor() {
  const { t } = useLanguage();
  const { addToast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  
  const [activeDoctor, setActiveDoctor] = useState<any | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  // Filters logic
  const filteredDoctors = doctors.filter(doc => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (!doc.name.toLowerCase().includes(q) && 
          !doc.specialty.toLowerCase().includes(q) && 
          !doc.tags.some(t => t.toLowerCase().includes(q))) return false;
    }
    if (selectedSpecialty && doc.specialty !== selectedSpecialty) return false;
    if (selectedRating && doc.rating < selectedRating) return false;
    return true;
  });

  const getInitials = (name: string) => {
    return name.replace('Dr. ', '').split(' ').map(n => n[0]).join('').substring(0, 2);
  };

  const clearFilters = () => {
    setSelectedSpecialty(null);
    setSelectedRating(null);
  };

  const queryClient = useQueryClient();

  const createAptMutation = useMutation({
    mutationFn: (data: any) => createAppointment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      addToast((t('patient.findDoctor.toastSuccess') || 'Request sent to {name}').replace('{name}', activeDoctor?.secretary?.name || 'Secretary'), 'success');
      setShowConfirm(false);
      setActiveDoctor(null);
      setSelectedDate(null);
      setSelectedTime(null);
      setReason('');
    },
    onError: () => {
      // In a real scenario with proper UUIDs this would work, here we simulate success for demo
      // or show error if we want strict API parity
      addToast('Online booking is currently restricted to active users.', 'error');
    }
  });

  const handleBook = () => {
    if (!activeDoctor || !selectedDate || !selectedTime) return;
    setShowConfirm(true);
  };

  const confirmBooking = () => {
    // Convert selectedDate (e.g., "Tuesday May 6") and selectedTime (e.g., "14:30") to ISO
    const now = new Date();
    const dateParts = selectedDate!.split(' ');
    const day = parseInt(dateParts[2]);
    // Rough approximation for demo ISO string
    const isoDate = new Date(now.getFullYear(), now.getMonth(), day, parseInt(selectedTime!.split(':')[0]), parseInt(selectedTime!.split(':')[1])).toISOString();
    
    // We would need a real doctor UUID here. For now we pass a dummy UUID so DRF validation doesn't crash completely on format
    const dummyUuid = '00000000-0000-0000-0000-000000000000';
    
    createAptMutation.mutate({
      doctor: dummyUuid,
      start_datetime: isoDate,
      end_datetime: new Date(new Date(isoDate).getTime() + (activeDoctor.consultationDuration * 60000)).toISOString(),
      consultation_type: 'IN_PERSON',
      motive: reason || 'Initial consultation'
    });
  };

  return (
    <div className="max-w-[1200px] mx-auto pb-12 animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-[36px] font-serif italic text-text-primary leading-tight flex flex-wrap">
          {(t('patient.findDoctor.title') || 'Find a Doctor').split(' ').map((word: string, i: number) => (
             <motion.span 
               key={i} 
               initial={{ opacity: 0, y: 10, clipPath: 'inset(100% 0 0 0)' }} 
               animate={{ opacity: 1, y: 0, clipPath: 'inset(0% 0 0 0)' }} 
               transition={{ delay: i * 0.08, duration: 0.5, ease: 'easeOut' }}
               className="mr-2"
             >
               {word}
             </motion.span>
          ))}
        </h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-[16px] text-text-muted mt-1">
          {t('patient.findDoctor.subtitle') || 'Browse specialists and book appointments.'}
        </motion.p>
      </div>

      <div className="mb-8 space-y-4">
         <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
              <input 
                type="text" 
                className="w-full bg-white border border-ui-border rounded-[1.5rem] py-3.5 pl-11 pr-4 text-[15px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-indigo focus:ring-4 focus:ring-brand-indigo/10 transition-all shadow-sm"
                placeholder={t('patient.findDoctor.searchPlaceholder') || 'Search by name, specialty, condition...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
               <div className="relative group flex-1 md:flex-none">
                 <button className="w-full md:w-auto flex items-center justify-between gap-3 px-5 py-3.5 bg-white border border-ui-border rounded-[1.5rem] text-text-primary text-[14px] font-medium hover:border-brand-indigo/50 transition-all shadow-sm">
                   <span className="truncate max-w-[120px] md:max-w-none">{selectedSpecialty || t('patient.findDoctor.filterSpecialty') || 'All Specialties'}</span> <ChevronDown size={16} className="text-text-muted shrink-0" />
                 </button>
                 <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-ui-border rounded-[1.5rem] shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 flex flex-col p-2">
                    <button className="px-4 py-2.5 text-left text-[14px] hover:bg-brand-indigo/5 rounded-xl text-text-primary font-medium transition-colors" onClick={() => setSelectedSpecialty(null)}>
                      All Specialties
                    </button>
                    <div className="h-px bg-ui-border my-1 mx-2"></div>
                    {['General Medicine', 'Cardiology', 'Dermatology', 'Pediatrics', 'Orthopedics', 'Neurology', 'Gynecology', 'Ophthalmology'].map(spec => (
                      <button key={spec} className={`px-4 py-2 text-left text-[14px] hover:bg-brand-indigo/5 rounded-xl transition-colors ${selectedSpecialty === spec ? 'bg-brand-indigo/10 text-brand-indigo font-medium' : 'text-text-secondary'}`} onClick={() => setSelectedSpecialty(spec)}>
                        {spec}
                      </button>
                    ))}
                 </div>
               </div>

               <div className="relative group flex-1 md:flex-none">
                 <button className="w-full md:w-auto flex items-center justify-between gap-3 px-5 py-3.5 bg-white border border-ui-border rounded-[1.5rem] text-text-primary text-[14px] font-medium hover:border-brand-indigo/50 transition-all shadow-sm">
                   <span className="truncate max-w-[100px] md:max-w-none">{selectedRating ? `${selectedRating}+ Stars` : t('patient.findDoctor.filterRating') || 'Rating'}</span> <ChevronDown size={16} className="text-text-muted shrink-0" />
                 </button>
                 <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-ui-border rounded-[1.5rem] shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 flex flex-col p-2">
                    <button className="px-4 py-2.5 text-left text-[14px] hover:bg-brand-indigo/5 rounded-xl text-text-primary font-medium transition-colors" onClick={() => setSelectedRating(null)}>
                      Any Rating
                    </button>
                    <div className="h-px bg-ui-border my-1 mx-2"></div>
                    {[5, 4, 3].map(rating => (
                      <button key={rating} className={`px-4 py-2 text-left text-[14px] hover:bg-brand-indigo/5 rounded-xl transition-colors flex items-center justify-between ${selectedRating === rating ? 'bg-brand-indigo/10 text-brand-indigo font-medium' : 'text-text-secondary'}`} onClick={() => setSelectedRating(rating)}>
                        <span>{rating === 5 ? '5 stars' : `${rating}+ stars`}</span>
                        <div className="flex text-[#F59E0B]">
                          {Array.from({ length: rating }).map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
                        </div>
                      </button>
                    ))}
                 </div>
               </div>
            </div>
         </div>

         <AnimatePresence>
           {(selectedSpecialty || selectedRating || searchTerm) && (
             <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex flex-wrap gap-2 overflow-hidden">
               {selectedSpecialty && (
                 <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-indigo/10 border border-brand-indigo/20 rounded-full text-[13px] font-medium text-brand-indigo">
                   {selectedSpecialty} <button onClick={() => setSelectedSpecialty(null)} className="hover:bg-brand-indigo/20 rounded-full p-0.5 transition-colors"><X size={14}/></button>
                 </div>
               )}
               {selectedRating && (
                 <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-full text-[13px] font-medium text-[#D97706]">
                   {selectedRating}+ Stars <button onClick={() => setSelectedRating(null)} className="hover:bg-[#F59E0B]/20 rounded-full p-0.5 transition-colors"><X size={14}/></button>
                 </div>
               )}
               <button className="text-[13px] font-medium text-text-muted hover:text-state-error transition-colors px-2 py-1.5" onClick={clearFilters}>Clear all</button>
             </motion.div>
           )}
         </AnimatePresence>
      </div>

      <div className="flex items-center justify-between mb-6">
        <span className="text-[14px] font-medium text-text-muted">
          {(t('patient.findDoctor.showing') || 'Showing {n} doctors').replace('{n}', filteredDoctors.length.toString())}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDoctors.map((doc, idx) => (
            <motion.div 
              key={doc.id} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white border border-ui-border rounded-[1.5rem] p-6 flex flex-col gap-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-brand-indigo/30 cursor-pointer group" 
              onClick={() => { setActiveDoctor(doc); setSelectedDate(null); setSelectedTime(null); setReason(''); }}
            >
              <div className="flex items-start gap-4">
                 <div className="w-14 h-14 rounded-full bg-brand-indigo/10 border-2 border-brand-indigo/20 flex items-center justify-center font-mono font-bold text-[18px] text-brand-indigo shrink-0">
                    {getInitials(doc.name)}
                 </div>
                 <div className="flex-1 min-w-0">
                    <h3 className="text-[18px] font-bold text-text-primary truncate">{doc.name}</h3>
                    <p className="text-[14px] text-brand-indigo font-medium truncate mb-1">{doc.specialty}</p>
                    <div className="flex items-center gap-1.5 text-[13px] text-text-muted">
                      <Hospital size={14} className="shrink-0" /> <span className="truncate">{doc.clinic}</span>
                    </div>
                 </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 bg-bg-surface px-3 py-1.5 rounded-full border border-ui-border">
                  <Star size={14} className="text-[#F59E0B]" fill="currentColor" />
                  <span className="text-[14px] font-bold text-text-primary leading-none">{doc.rating}</span>
                  <span className="text-[12px] text-text-muted leading-none">({doc.reviewCount})</span>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono font-bold tracking-widest uppercase ${doc.available ? 'bg-[#22C55E1A] text-[#22C55E] border border-[#22C55E33]' : 'bg-state-error/10 text-state-error border border-state-error/20'}`}>
                  {doc.available ? (t('patient.findDoctor.available') || 'Available') : (t('patient.findDoctor.unavailable') || 'Unavailable')}
                </div>
              </div>

              <p className="text-[14px] text-text-secondary leading-relaxed line-clamp-2">
                {doc.description}
              </p>

              <div className="flex items-center gap-3 p-3 bg-bg-surface border border-ui-border rounded-xl">
                <div className="w-8 h-8 rounded-full bg-brand-indigo/10 flex items-center justify-center text-brand-indigo shrink-0">
                   <User size={14} />
                </div>
                <div className="flex flex-col min-w-0">
                   <span className="text-[10px] text-text-muted uppercase tracking-widest font-mono mb-0.5">{t('patient.findDoctor.secretary') || 'Secretary'}</span>
                   <strong className="text-[13px] text-text-primary font-medium truncate">{doc.secretary.name}</strong>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {doc.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="px-3 py-1.5 bg-brand-indigo/5 border border-brand-indigo/10 rounded-full text-[12px] font-medium text-brand-indigo">
                    {tag}
                  </span>
                ))}
                {doc.tags.length > 3 && (
                  <span className="px-3 py-1.5 bg-bg-surface border border-ui-border rounded-full text-[12px] font-medium text-text-muted">
                    +{doc.tags.length - 3}
                  </span>
                )}
              </div>

              <button className="w-full mt-auto py-3 bg-brand-indigo/5 text-brand-indigo border border-transparent hover:bg-brand-indigo hover:text-white hover:border-brand-indigo/20 rounded-xl text-[14px] font-medium transition-all group-hover:shadow-[0_4px_12px_rgba(75,74,207,0.2)]">
                {t('patient.findDoctor.viewBook') || 'View Profile & Book'}
              </button>
            </motion.div>
        ))}
      </div>

      <AnimatePresence>
         {activeDoctor && (
           <>
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setActiveDoctor(null)}
               className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
             />
             <motion.div 
               initial={{ x: '100%' }}
               animate={{ x: 0 }}
               exit={{ x: '100%' }}
               transition={{ type: 'spring', damping: 25, stiffness: 200 }}
               className="fixed top-0 right-0 h-full w-full max-w-[520px] bg-bg-canvas border-l border-ui-border shadow-2xl z-50 overflow-y-auto"
             >
                <div className="sticky top-0 bg-bg-canvas/80 backdrop-blur-md border-b border-ui-border p-4 flex items-center justify-between z-10">
                   <h2 className="text-[18px] font-sans font-bold text-text-primary flex items-center gap-2">
                     <button className="w-8 h-8 rounded-full hover:bg-bg-input flex items-center justify-center transition-colors" onClick={() => setActiveDoctor(null)}>
                       <X size={18} />
                     </button>
                     {activeDoctor.name}
                   </h2>
                </div>

                <div className="p-6">
                   <div className="flex flex-col items-center mb-8">
                     <div className="w-20 h-20 rounded-full bg-brand-indigo/10 border-2 border-brand-indigo/30 flex items-center justify-center text-[24px] font-bold text-brand-indigo mb-4 font-mono">
                       {getInitials(activeDoctor.name)}
                     </div>
                     <h3 className="text-[22px] font-bold text-text-primary">{activeDoctor.name}</h3>
                     <p className="text-[15px] text-brand-indigo font-medium">{activeDoctor.specialty}</p>
                     
                     <div className="flex items-center gap-4 mt-3">
                       <span className="flex items-center gap-1 text-[14px] text-text-primary font-medium"><Star size={14} className="text-[#F59E0B]" fill="#F59E0B" /> {activeDoctor.rating} <span className="text-text-muted font-normal">({activeDoctor.reviewCount} {(t('patient.findDoctor.reviews') || 'reviews').replace('{n}', '')})</span></span>
                       <span className="w-1 h-1 rounded-full bg-ui-border"></span>
                       <span className={`flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider ${activeDoctor.available ? 'text-[#22C55E]' : 'text-state-error'}`}>
                         <div className={`w-2 h-2 rounded-full ${activeDoctor.available ? 'bg-[#22C55E]' : 'bg-state-error'}`}></div>
                         {activeDoctor.available ? 'Available' : 'Unavailable'}
                       </span>
                     </div>
                   </div>

                   <div className="space-y-8">
                     <section>
                       <h4 className="text-[11px] font-mono uppercase tracking-[0.15em] text-text-muted mb-3 flex items-center gap-2">
                         <span className="flex-1 h-px bg-ui-border"></span>
                         About
                         <span className="flex-1 h-px bg-ui-border"></span>
                       </h4>
                       <p className="text-[14px] text-text-secondary leading-relaxed mb-4">
                         {activeDoctor.description}
                       </p>
                       <div className="bg-bg-surface border border-ui-border rounded-xl p-4 space-y-3">
                         <div className="flex justify-between text-[13px]">
                           <span className="text-text-muted">{t('patient.findDoctor.languages') || 'Languages'}</span>
                           <span className="font-medium text-text-primary">{activeDoctor.languages.join(', ')}</span>
                         </div>
                         <div className="h-px bg-ui-border"></div>
                         <div className="flex justify-between text-[13px]">
                           <span className="text-text-muted">{t('patient.findDoctor.consultation') || 'Consultation'}</span>
                           <span className="font-medium text-text-primary">{activeDoctor.consultationDuration} min · {activeDoctor.consultationFee} MAD</span>
                         </div>
                       </div>
                     </section>

                     <section>
                       <h4 className="text-[11px] font-mono uppercase tracking-[0.15em] text-text-muted mb-3 flex items-center gap-2">
                         <span className="flex-1 h-px bg-ui-border"></span>
                         {t('patient.findDoctor.secretary') || 'Secretary'}
                         <span className="flex-1 h-px bg-ui-border"></span>
                       </h4>
                       <div className="secretary-row !bg-bg-surface">
                         <div className="w-8 h-8 rounded-full bg-brand-indigo/10 flex items-center justify-center text-brand-indigo"><User size={16} /></div>
                         <div className="flex-1">
                           <div className="font-medium text-text-primary text-[13px]">{activeDoctor.secretary.name}</div>
                           <div className="text-[11px] text-text-muted">{activeDoctor.secretary.email}</div>
                         </div>
                       </div>
                       <p className="text-[11px] text-text-muted mt-2 text-center">
                         <Info size={14} className="inline-block mr-1 text-brand-indigo shrink-0" /> {t('patient.findDoctor.secretaryNotice') || "The secretary will review your request and confirm or deny it. You'll be notified in Messages."}
                       </p>
                     </section>
                     
                     <section>
                       <h4 className="text-[11px] font-mono uppercase tracking-[0.15em] text-text-muted mb-3 flex items-center gap-2">
                         <span className="flex-1 h-px bg-ui-border"></span>
                         {(t('patient.findDoctor.reviews') || 'Reviews').replace('{n}', activeDoctor.reviewCount.toString())}
                         <span className="flex-1 h-px bg-ui-border"></span>
                       </h4>
                       <div className="space-y-3">
                         {activeDoctor.reviews.map((r: any, i: number) => (
                           <div key={i} className="review-card">
                             <div className="review-header">
                               <span className="review-author">{r.author}</span>
                               <span className="review-date">{r.date}</span>
                             </div>
                             <div className="review-stars text-[#F59E0B] text-[12px]">
                               <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, stIdx) => <Star key={stIdx} size={12} fill={stIdx < (r.rating) ? "currentColor" : "none"} className={stIdx < (r.rating) ? "text-[#F59E0B]" : "text-ui-border"} />)}</div>
                             </div>
                             <div className="review-text">"{r.text}"</div>
                           </div>
                         ))}
                       </div>
                     </section>

                     <section>
                       <h4 className="text-[11px] font-mono uppercase tracking-[0.15em] text-text-muted mb-3 flex items-center gap-2">
                         <span className="flex-1 h-px bg-ui-border"></span>
                         {t('patient.findDoctor.chooseDateTime') || 'Choose a Date & Time'}
                         <span className="flex-1 h-px bg-ui-border"></span>
                       </h4>
                       <div className="day-tabs">
                         {Object.keys(activeDoctor.availability).map(dateStr => {
                           const parts = dateStr.split(' ');
                           const dayName = parts[0].substring(0,3);
                           const dayNum = parts[2];
                           const isSelected = selectedDate === dateStr;
                           return (
                             <div key={dateStr} className={`day-tab ${isSelected ? 'active' : ''}`} onClick={() => { setSelectedDate(dateStr); setSelectedTime(null); }}>
                               <div className="day-name">{dayName}</div>
                               <div className="day-number">{dayNum}</div>
                             </div>
                           )
                         })}
                       </div>
                       
                       {selectedDate && (
                         <div className="time-slots">
                           {activeDoctor.availability[selectedDate].map((time: string) => (
                             <div key={time} className={`time-slot ${selectedTime === time ? 'selected' : ''}`} onClick={() => setSelectedTime(time)}>
                               {time}
                             </div>
                           ))}
                         </div>
                       )}

                       {selectedDate && selectedTime && (
                         <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4">
                           <textarea 
                             className="reason-textarea" 
                             placeholder={t('patient.findDoctor.reasonPlaceholder') || 'Reason for visit (optional)'}
                             value={reason}
                             onChange={(e) => setReason(e.target.value)}
                           ></textarea>
                         </motion.div>
                       )}
                     </section>
                   </div>
                </div>

                <div className="sticky bottom-0 bg-bg-canvas/90 backdrop-blur-md border-t border-ui-border p-4 z-10 w-full">
                  <button 
                    className={`book-btn ${(!selectedDate || !selectedTime) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={!selectedDate || !selectedTime}
                    onClick={handleBook}
                  >
                    {t('patient.findDoctor.requestBtn') || 'Request Appointment'}
                  </button>
                </div>
             </motion.div>
           </>
         )}
      </AnimatePresence>

      <AnimatePresence>
        {showConfirm && activeDoctor && (
          <div className="fixed inset-0 flex items-center justify-center z-[100] px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowConfirm(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="bg-bg-canvas border border-ui-border rounded-2xl w-full max-w-md p-6 relative z-10 shadow-2xl">
              <h3 className="text-[20px] font-serif text-text-primary mb-4">{t('patient.findDoctor.confirmTitle') || 'Confirm Request'}</h3>
              
              <div className="bg-bg-surface border border-ui-border rounded-xl p-4 mb-4">
                 <div className="font-bold text-text-primary text-[15px]">{activeDoctor.name}</div>
                 <div className="text-[13px] text-brand-indigo mb-3">{activeDoctor.specialty}</div>
                 
                 <div className="space-y-1 text-[13px] text-text-secondary">
                   <div className="flex items-center gap-2"><Calendar size={14} className="text-text-muted" /> {selectedDate}</div>
                   <div className="flex items-center gap-2"><Clock size={14} className="text-text-muted" /> {selectedTime}</div>
                   <div className="flex items-center gap-2"><Timer size={14} className="text-text-muted" /> {activeDoctor.consultationDuration} min · {activeDoctor.consultationFee} MAD</div>
                 </div>
              </div>

              <p className="text-[12px] text-text-secondary mb-4 p-3 bg-brand-indigo/5 border border-brand-indigo/10 rounded-lg flex items-start gap-1.5">
                <Info size={16} className="text-brand-indigo shrink-0" />
                <span>{t('patient.findDoctor.secretaryNotice') || "The secretary will review your request and confirm or deny it. You'll be notified in Messages."}</span>
              </p>

              <div className="flex gap-3 mt-6">
                 <button onClick={() => setShowConfirm(false)} className="flex-1 py-3 px-4 rounded-xl border border-ui-border text-text-primary hover:bg-bg-surface transition-colors font-medium text-[14px]">
                   Cancel
                 </button>
                 <button onClick={confirmBooking} disabled={createAptMutation.isPending} className="flex-1 py-3 px-4 bg-brand-indigo hover:bg-[#7C75FF] text-white rounded-xl transition-colors font-medium text-[14px] shadow-[0_4px_12px_rgba(99,91,255,0.3)] flex justify-center items-center disabled:opacity-50">
                   {createAptMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : (t('patient.findDoctor.sendRequest') || 'Send Request')}
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
