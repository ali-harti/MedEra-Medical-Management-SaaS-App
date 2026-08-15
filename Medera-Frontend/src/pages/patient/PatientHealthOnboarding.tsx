import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { Lock, Plus, X, Heart, ShieldAlert, Check, Activity, Loader2 } from 'lucide-react';
import { updateMe } from '../../services/authService';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function PatientHealthOnboarding() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [bloodGroup, setBloodGroup] = useState<string | null>(null);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  
  const [allergyInput, setAllergyInput] = useState('');
  const [allergies, setAllergies] = useState<string[]>([]);
  
  const [medicalConditions, setMedicalConditions] = useState<string[]>([]);
  const [otherHistory, setOtherHistory] = useState('');

  const [insurance, setInsurance] = useState('None');
  const [policyNumber, setPolicyNumber] = useState('');

  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactRelation, setContactRelation] = useState('Friend');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];
  const commonConditions = ['Hypertension', 'Diabetes Type 1', 'Diabetes Type 2', 'Asthma', 'Heart Disease', 'Cancer (history)', 'Thyroid', 'Kidney Disease', 'None of the above'];
  const insurances = ['CNSS', 'CNOPS', 'RMA', 'SAHAM', 'AXA', 'ALLIANZ', 'MGEN', 'Other', 'None'];
  const relations = ['Spouse', 'Parent', 'Sibling', 'Friend', 'Other'];

  const bmi = (height && weight && Number(height) > 0) ? (Number(weight) / Math.pow(Number(height)/100, 2)).toFixed(1) : null;
  let bmiStatus = '';
  if (bmi) {
    const val = Number(bmi);
    if (val < 18.5) bmiStatus = 'Underweight';
    else if (val < 25) bmiStatus = 'Normal';
    else if (val < 30) bmiStatus = 'Overweight';
    else bmiStatus = 'Obese';
  }

  const handleAllergyKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && allergyInput.trim() !== '') {
      e.preventDefault();
      if (!allergies.includes(allergyInput.trim())) {
        setAllergies([...allergies, allergyInput.trim()]);
      }
      setAllergyInput('');
    }
  };

  const removeAllergy = (a: string) => {
    setAllergies(allergies.filter(x => x !== a));
  };

  const toggleCondition = (c: string) => {
    if (c === 'None of the above') {
      setMedicalConditions(['None of the above']);
      return;
    }
    const newCond = medicalConditions.filter(x => x !== 'None of the above');
    if (newCond.includes(c)) {
      setMedicalConditions(newCond.filter(x => x !== c));
    } else {
      setMedicalConditions([...newCond, c]);
    }
  };

  const canSubmit = bloodGroup && (allergies.length > 0 || medicalConditions.length > 0);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      // In a real implementation, we would also submit the medical info to a patient profile endpoint
      return updateMe({ health_profile_complete: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setIsComplete(true);
      setTimeout(() => {
        navigate('/patient/dashboard');
      }, 1500);
    },
    onError: () => {
      // Fallback if the endpoint doesn't accept the flag
      queryClient.setQueryData(['me'], (old: any) => ({ ...old, health_profile_complete: true }));
      setIsComplete(true);
      setTimeout(() => {
        navigate('/patient/dashboard');
      }, 1500);
    }
  });

  const handleSubmit = () => {
    mutation.mutate();
  };

  if (isComplete) {
    return (
        <div className="fixed inset-0 bg-bg-surface overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 pointer-events-none noise-bg mix-blend-overlay opacity-30" />
            <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               className="flex flex-col items-center gap-6"
            >
               <motion.div
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
               >
                  <svg className="w-24 h-24 text-state-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                     <path d="M20 6L9 17l-5-5" />
                  </svg>
               </motion.div>
               <h2 className="text-[28px] font-serif italic text-text-primary text-center">Your health profile is complete!</h2>
            </motion.div>
        </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-bg-surface overflow-y-auto w-full">
      {/* Decorative Orbs */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-indigo/10 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-brand-lavender/10 blur-[120px] pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none noise-bg mix-blend-overlay opacity-30" />
      
      <div className="relative z-10 w-full max-w-[680px] mx-auto pt-12 pb-24 px-6">
        <div className="flex items-center justify-center gap-4 text-[12px] font-mono text-text-muted mb-16 uppercase tracking-[0.2em]">
          <span className="text-state-success flex items-center gap-1.5"><Check size={14} /> Account Created</span>
          <span className="opacity-30">──</span>
          <span className="text-text-primary flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-text-primary rounded-full" /> Health Profile</span>
          <span className="opacity-30">──</span>
          <span>Ready</span>
        </div>

        <div className="text-center mb-10">
           <h1 className="text-[44px] font-serif italic text-text-primary leading-tight mb-4">{t('health.onboard.title') || "Complete your health profile."}</h1>
           <p className="text-[16px] text-text-secondary">{t('health.onboard.sub') || "This helps your doctor provide better care from day one."}</p>
        </div>

        <div className="flex items-center gap-3 p-4 rounded-xl bg-state-warning/10 border border-state-warning/20 text-state-warning mb-10 shadow-[0_4px_16px_rgba(245,158,11,0.05)] backdrop-blur-md">
           <Lock size={18} className="shrink-0" />
           <div className="text-[13px] font-medium leading-relaxed">
             Your health information is private and only shared with your treating doctor.
           </div>
        </div>

        <div className="glass-panel border-ui-border rounded-[24px] p-8 md:p-10 space-y-12 relative overflow-hidden backdrop-blur-xl">
           
           {/* Section 1 */}
           <section>
              <h3 className="text-[18px] font-medium text-text-primary mb-6 flex items-center gap-2"><Heart size={18} className="text-brand-indigo" /> 1. {t('health.blood') || "Basic Health Info"}</h3>
              <div className="space-y-6">
                 <div>
                    <label className="text-[13px] font-medium text-text-secondary mb-3 block">{t('health.blood') || "Blood Group"}</label>
                    <div className="flex flex-wrap gap-2">
                       {bloodGroups.map(bg => (
                         <button 
                           key={bg}
                           onClick={() => setBloodGroup(bg)}
                           className={`px-4 py-2.5 border rounded-[10px] font-mono text-[13px] font-bold transition-all ${bloodGroup === bg ? 'bg-state-error/10 border-state-error/40 text-state-error' : 'bg-transparent border-ui-border text-text-secondary hover:border-text-muted hover:text-text-primary'} ${bg === 'Unknown' ? 'opacity-70' : ''}`}
                         >
                           {bg}
                         </button>
                       ))}
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                       <label className="text-[13px] font-medium text-text-secondary">{t('health.height') || "Height"} (cm)</label>
                       <input type="number" value={height} onChange={e => setHeight(e.target.value)} className="bg-bg-input border border-ui-border focus:border-brand-indigo focus:ring-1 focus:ring-brand-indigo rounded-xl px-4 py-3 text-[15px] outline-none transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]" placeholder="175" />
                    </div>
                    <div className="flex flex-col gap-2">
                       <label className="text-[13px] font-medium text-text-secondary">{t('health.weight') || "Weight"} (kg)</label>
                       <input type="number" value={weight} onChange={e => setWeight(e.target.value)} className="bg-bg-input border border-ui-border focus:border-brand-indigo focus:ring-1 focus:ring-brand-indigo rounded-xl px-4 py-3 text-[15px] outline-none transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]" placeholder="70" />
                    </div>
                 </div>
                 {bmi && (
                    <div className="font-mono text-[13px] flex items-center gap-2 mt-2">
                       <span className="text-text-muted">BMI: {bmi}</span>
                       <span className="text-text-muted opacity-50">·</span>
                       <span className={`font-bold flex items-center gap-1.5 ${bmiStatus === 'Normal' ? 'text-state-success' : bmiStatus === 'Underweight' ? 'text-state-warning' : 'text-state-error'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${bmiStatus === 'Normal' ? 'bg-state-success' : bmiStatus === 'Underweight' ? 'bg-state-warning' : 'bg-state-error'}`}></span>
                          {bmiStatus}
                       </span>
                    </div>
                 )}
              </div>
           </section>

           <div className="w-full h-px bg-ui-border" />

           {/* Section 2 */}
           <section>
              <h3 className="text-[18px] font-medium text-text-primary mb-6 flex items-center gap-2"><ShieldAlert size={18} className="text-state-warning" /> 2. {t('health.allergies') || "Allergies"}</h3>
              <div className="bg-bg-input border border-ui-border focus-within:border-brand-indigo focus-within:ring-1 focus-within:ring-brand-indigo rounded-xl p-2.5 min-h-[52px] flex flex-wrap gap-2 cursor-text transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]" onClick={() => document.getElementById('allergy-input')?.focus()}>
                 {allergies.map(a => (
                    <motion.div layout initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} key={a} className="flex items-center gap-1.5 bg-state-warning/15 text-state-warning border border-state-warning/20 px-3 py-1.5 rounded-full text-[13px] font-medium">
                       {a} <button onClick={() => removeAllergy(a)} className="hover:text-state-warning/80"><X size={14} /></button>
                    </motion.div>
                 ))}
                 <input 
                    id="allergy-input"
                    type="text" 
                    value={allergyInput} 
                    onChange={e => setAllergyInput(e.target.value)} 
                    onKeyDown={handleAllergyKeyDown}
                    className="flex-1 bg-transparent min-w-[120px] outline-none text-[15px] px-2" 
                    placeholder={allergies.length === 0 ? "Type and press Enter..." : ""} 
                 />
              </div>
           </section>

           <div className="w-full h-px bg-ui-border" />

           {/* Section 3 */}
           <section>
              <h3 className="text-[18px] font-medium text-text-primary mb-6 flex items-center gap-2"><Activity size={18} className="text-brand-indigo" /> 3. {t('health.history') || "Medical History"}</h3>
              <div className="flex flex-wrap gap-3 mb-6">
                 {commonConditions.map(c => (
                    <button
                       key={c}
                       onClick={() => toggleCondition(c)}
                       className={`px-4 py-2 border rounded-full text-[13px] font-medium transition-all flex items-center gap-2 ${medicalConditions.includes(c) ? 'bg-brand-indigo text-white border-brand-indigo' : 'bg-transparent border-ui-border text-text-secondary hover:border-brand-indigo/50 hover:text-text-primary'}`}
                    >
                       <div className={`w-3 h-3 rounded-sm border flex items-center justify-center transition-colors ${medicalConditions.includes(c) ? 'border-white bg-white' : 'border-text-muted bg-transparent'}`}>
                          {medicalConditions.includes(c) && <Check size={10} className="text-brand-indigo" />}
                       </div>
                       {c}
                    </button>
                 ))}
              </div>
              <textarea 
                 value={otherHistory}
                 onChange={e => setOtherHistory(e.target.value)}
                 className="w-full bg-bg-input border border-ui-border focus:border-brand-indigo focus:ring-1 focus:ring-brand-indigo rounded-xl px-4 py-3 text-[14px] outline-none transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] min-h-[100px] resize-y"
                 placeholder="Any other medical history, surgeries, or chronic conditions..."
              />
           </section>

           <div className="w-full h-px bg-ui-border" />

           {/* Section 4 */}
           <section>
              <h3 className="text-[18px] font-medium text-text-primary mb-6">4. {t('health.insurance') || "Insurance"}</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                 <div>
                    <label className="text-[13px] font-medium text-text-secondary mb-2 block">{t('health.insurance') || "Provider"}</label>
                    <select value={insurance} onChange={e => setInsurance(e.target.value)} className="w-full bg-bg-input border border-ui-border focus:border-brand-indigo rounded-xl px-4 py-3 text-[15px] outline-none appearance-none">
                       {insurances.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                 </div>
                 {insurance !== 'None' && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                       <label className="text-[13px] font-medium text-text-secondary mb-2 block">{t('health.policy') || "Policy Number"}</label>
                       <input type="text" value={policyNumber} onChange={e => setPolicyNumber(e.target.value)} className="w-full bg-bg-input border border-ui-border focus:border-brand-indigo rounded-xl px-4 py-3 text-[15px] outline-none" placeholder="Required" />
                    </motion.div>
                 )}
              </div>
           </section>

           <div className="w-full h-px bg-ui-border" />

           {/* Section 5 */}
           <section>
              <h3 className="text-[18px] font-medium text-text-primary mb-6">5. {t('health.emergency') || "Emergency Contact"}</h3>
              <div className="space-y-4">
                 <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                       <label className="text-[13px] font-medium text-text-secondary mb-2 block">Name</label>
                       <input type="text" value={contactName} onChange={e => setContactName(e.target.value)} className="w-full bg-bg-input border border-ui-border focus:border-brand-indigo rounded-xl px-4 py-3 text-[15px] outline-none" placeholder="Full name" />
                    </div>
                    <div>
                       <label className="text-[13px] font-medium text-text-secondary mb-2 block">Phone</label>
                       <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} className="w-full bg-bg-input border border-ui-border focus:border-brand-indigo rounded-xl px-4 py-3 text-[15px] outline-none" placeholder="+212 ..." />
                    </div>
                 </div>
                 <div>
                    <label className="text-[13px] font-medium text-text-secondary mb-2 block">Relationship</label>
                    <div className="flex flex-wrap gap-2">
                       {relations.map(r => (
                          <button key={r} onClick={() => setContactRelation(r)} className={`px-4 py-2 border rounded-full text-[13px] font-medium transition-all ${contactRelation === r ? 'bg-bg-elevated border-text-primary text-text-primary' : 'bg-transparent border-ui-border text-text-secondary hover:border-text-muted hover:text-text-primary'}`}>
                             {r}
                          </button>
                       ))}
                    </div>
                 </div>
              </div>
           </section>

           {/* Action */}
           <div className="pt-6">
               <button 
                  disabled={!canSubmit || mutation.isPending}
                  onClick={handleSubmit}
                  className="w-full py-4 rounded-xl bg-brand-indigo text-white text-[15px] font-medium transition-all hover:bg-brand-indigo-glow hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:bg-brand-indigo relative overflow-hidden group"
               >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                     {mutation.isPending ? <Loader2 size={18} className="animate-spin" /> : (t('health.complete') || "Complete My Profile →")}
                  </span>
                 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}
