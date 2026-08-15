import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Upload, Eye, EyeOff, CheckCircle2, Info, Loader2, Check, X, Copy, HeartPulse } from 'lucide-react';
import { getMe, updateMe, changePassword } from '../../services/authService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

const passwordSchema = z.object({
  old_password: z.string().min(1, "Current password is required"),
  new_password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-z]/, "Password must contain lowercase letter")
    .regex(/[A-Z]/, "Password must contain uppercase letter")
    .regex(/\d/, "Password must contain number")
    .regex(/[@$!%*#?&]/, "Password must contain special character"),
  confirm_password: z.string()
}).refine(data => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

const Toast: React.FC<{ message: string, type: 'success' | 'error', onClose: () => void }> = ({ message, type, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 120 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 120, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', damping: 20, stiffness: 120 }}
      className={`fixed top-24 right-8 z-50 glass-island border px-4 py-3 rounded-lg shadow-lg flex flex-col overflow-hidden min-w-[300px] ${type === 'success' ? 'border-l-4 border-l-state-success' : 'border-l-4 border-l-state-error'}`}
    >
      <div className="flex items-center gap-3 text-[14px] text-text-primary mb-2">
        {type === 'success' ? <CheckCircle2 className="w-5 h-5 text-state-success" /> : <Info className="w-5 h-5 text-state-error" />}
        <span>{message}</span>
      </div>
      <motion.div
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: 4, ease: 'linear' }}
        className={`h-1 bg-ui-border absolute bottom-0 left-0 w-full`}
      >
        <div className={`h-full ${type === 'success' ? 'bg-state-success' : 'bg-state-error'}`} />
      </motion.div>
    </motion.div>
  );
}

export default function PatientSettings() {
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: getMe
  });

  // Toasts
  const [toasts, setToasts] = useState<{id: string, msg: string, type: 'success'|'error'}[]>([]);
  const addToast = (msg: string, type: 'success'|'error') => {
    setToasts(prev => [...prev, { id: Math.random().toString(), msg, type }]);
  };
  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setPreviewPhoto(user.avatar || null);
    }
  }, [user]);

  // Photo Upload Mutation
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoSuccess, setPhotoSuccess] = useState(false);
  
  const updatePhotoMutation = useMutation({
    mutationFn: (fd: FormData) => updateMe(fd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setPhotoSuccess(true);
      setTimeout(() => setPhotoSuccess(false), 2000);
      addToast(t('admin.settings.photo.success') || "Profile photo updated", 'success');
    },
    onError: () => {
      addToast(t('admin.settings.photo.error') || "Failed to update photo", 'error');
    }
  });

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      addToast(t('admin.settings.photo.error') || "File must be under 2MB", 'error');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewPhoto(url);
  };

  const savePhoto = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('avatar', file);
    updatePhotoMutation.mutate(fd);
  };

  // Info Update Mutation
  const [emailShake, setEmailShake] = useState(false);
  
  const updateInfoMutation = useMutation({
    mutationFn: (data: Partial<any>) => updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      addToast(t('admin.settings.info.success') || "Profile updated successfully", 'success');
    },
    onError: () => {
      setEmailShake(true);
      setTimeout(() => setEmailShake(false), 400);
      addToast(t('admin.settings.info.errorEmail') || "Update failed. This email might be taken.", 'error');
    }
  });

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const isEmailValid = validateEmail(email);

  const saveInfo = async () => {
    updateInfoMutation.mutate({ 
      first_name: firstName, 
      last_name: lastName, 
      email, 
      phone
    });
  };

  // Password Change Mutation
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confPwd, setConfPwd] = useState('');
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwdFocused, setPwdFocused] = useState(false);
  const [pwdShake, setPwdShake] = useState(false);

  const changePasswordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      addToast(t('admin.settings.password.success') || "Password updated. Please sign in again.", 'success');
      setCurrentPwd(''); setNewPwd(''); setConfPwd('');
    },
    onError: () => {
      setPwdShake(true);
      setTimeout(() => setPwdShake(false), 400);
      addToast(t('admin.settings.password.errorCurrent') || "Current password is incorrect", 'error');
    }
  });

  const hasLen = newPwd.length >= 8;
  const hasUp = /[A-Z]/.test(newPwd);
  const hasNum = /[0-9]/.test(newPwd);
  const hasSpec = /[!@#$%^&*()[\]{}<>\\|]/.test(newPwd);
  const score = [hasLen, hasUp, hasNum, hasSpec].filter(Boolean).length;
  const strengthLevels = ['weak', 'weak', 'fair', 'good', 'strong'];
  const strengthColors = ['bg-state-error', 'bg-state-error', 'bg-state-warning', 'bg-brand-indigo', 'bg-state-success'];
  const pStrength = strengthLevels[score] as any;
  const match = newPwd !== '' && newPwd === confPwd;
  const canUpdatePwd = currentPwd && newPwd && match && score === 4;

  const savePwd = async () => {
    if (!canUpdatePwd) return;
    try {
      const payload = {
        old_password: currentPwd,
        new_password: newPwd,
        confirm_password: confPwd
      };
      passwordSchema.parse(payload);
      changePasswordMutation.mutate(payload);
    } catch (err) {
      if (err instanceof z.ZodError) {
        addToast(err.errors[0].message, 'error');
      }
    }
  };

  const formatDate = (ds: string | null | undefined) => {
    if (!ds) return 'N/A';
    try {
       const d = new Date(ds);
       if (isNaN(d.getTime())) return 'N/A';
       return d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return 'N/A'; }
  };

  const getEyeIcon = (show: boolean) => (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={show ? 'show' : 'hide'} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.2 }}>
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </motion.div>
    </AnimatePresence>
  );
  
  const initials = ((firstName[0]||'') + (lastName[0]||'')).toUpperCase();
  
  const getAvatar = (sizeClass: string) => {
    if (previewPhoto) return <img src={previewPhoto} alt="avatar" className={`rounded-full object-cover shadow-lg ${sizeClass}`} />;
    return <div className={`rounded-full bg-gradient-to-tr from-brand-indigo to-brand-lavender text-white font-bold flex items-center justify-center ${sizeClass}`}>{initials}</div>;
  };

  if (isLoading) return <div className="flex-1 flex items-center justify-center min-h-[500px]"><Loader2 className="w-8 h-8 text-brand-indigo animate-spin" /></div>;

  return (
    <div className="flex-1 overflow-x-hidden overflow-y-auto pb-12">
      <AnimatePresence>
        {toasts.map(t => <Toast key={t.id} message={t.msg} type={t.type} onClose={() => removeToast(t.id)} />)}
      </AnimatePresence>

      <div className="max-w-[1200px] mx-auto w-full">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h2 className="text-[36px] font-serif italic text-text-primary leading-tight">Settings</h2>
          <p className="text-[16px] font-sans text-text-muted mt-1">Manage your account and preferences.</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:items-start">
          
          {/* Left Column (Forms) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Sec 1: Profile Photo */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, ease: 'easeOut', duration: 0.5 }} className="glass-island border border-ui-border rounded-[20px] p-6 lg:p-8 relative overflow-hidden backdrop-blur-md">
              <h3 className="text-[16px] font-sans font-semibold text-text-primary mb-6">Profile Photo</h3>
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full border-2 border-brand-indigo outline-brand-indigo animate-[spin_4s_linear_infinite] opacity-50 shadow-[0_0_15px_rgba(75,74,207,0.4)] pointer-events-none" style={{ margin: '-4px' }}></div>
                  <AnimatePresence mode="popLayout">
                    <motion.div key={previewPhoto || 'initial'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
                      {getAvatar('w-24 h-24 text-[32px]')}
                    </motion.div>
                  </AnimatePresence>
                </div>
                
                <div className="flex-1 w-full text-center sm:text-left">
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" ref={fileInputRef} onChange={handlePhotoSelect} />
                  <div onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-ui-border rounded-xl p-6 hover:border-brand-indigo transition-all cursor-pointer group flex flex-col items-center justify-center bg-[#ffffff05]">
                    <Upload className="w-5 h-5 text-brand-lavender mb-2 group-hover:-translate-y-1 transition-transform" />
                    <span className="text-[14px] text-text-primary block font-medium">Click to upload</span>
                    <span className="text-[12px] text-text-muted mt-0.5">Max 5MB · JPG, PNG</span>
                  </div>
                  {previewPhoto && (
                    <button onClick={() => setPreviewPhoto(null)} className="mt-3 text-[12px] text-text-muted hover:text-state-error transition-colors">
                      × Remove photo
                    </button>
                  )}
                  {fileInputRef.current?.files?.[0] && (
                    <div className="mt-4 flex justify-end">
                      <button onClick={savePhoto} disabled={updatePhotoMutation.isPending} className="relative overflow-hidden px-5 py-2.5 rounded-xl bg-brand-indigo text-white text-[14px] font-medium transition-all hover:shadow-[0_0_15px_rgba(75,74,207,0.4)] disabled:opacity-50 flex items-center justify-center w-[160px]">
                        {updatePhotoMutation.isPending ? <div className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</div> : photoSuccess ? <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Photo updated!</div> : "Update Photo"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Sec 2: Personal Info */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, ease: 'easeOut', duration: 0.5 }} className="glass-island border border-ui-border rounded-[20px] p-6 lg:p-8 backdrop-blur-md">
              <h3 className="text-[16px] font-sans font-semibold text-text-primary mb-6">Personal Information</h3>
              
              <div className="grid sm:grid-cols-2 gap-5 mb-5">
                <div className="relative group">
                  <input type="text" value={firstName} onChange={e=>setFirstName(e.target.value)} id="fName" className="w-full bg-bg-input border border-ui-border rounded-xl px-4 pt-6 pb-2 text-[14px] text-text-primary outline-none focus:border-brand-indigo focus:shadow-[0_0_12px_rgba(75,74,207,0.2)] transition-all peer" placeholder=" " />
                  <label htmlFor="fName" className="absolute top-2 left-4 text-[11px] font-medium text-text-muted transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-[14px] peer-focus:top-2 peer-focus:text-[11px] peer-focus:text-brand-lavender pointer-events-none">
                    First Name
                  </label>
                </div>
                <div className="relative group">
                  <input type="text" value={lastName} onChange={e=>setLastName(e.target.value)} id="lName" className="w-full bg-bg-input border border-ui-border rounded-xl px-4 pt-6 pb-2 text-[14px] text-text-primary outline-none focus:border-brand-indigo focus:shadow-[0_0_12px_rgba(75,74,207,0.2)] transition-all peer" placeholder=" " />
                  <label htmlFor="lName" className="absolute top-2 left-4 text-[11px] font-medium text-text-muted transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-[14px] peer-focus:top-2 peer-focus:text-[11px] peer-focus:text-brand-lavender pointer-events-none">
                    Last Name
                  </label>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5 mb-5">
                <div className="relative group">
                  <div className={`relative rounded-xl border transition-all ${emailShake ? 'animate-[shake_400ms_ease-in-out] border-state-error' : 'border-ui-border focus-within:border-brand-indigo focus-within:shadow-[0_0_12px_rgba(75,74,207,0.2)]'}`}>
                     <input type="email" name="medera_user_email" value={email} onChange={e=>setEmail(e.target.value)} id="userEmail" autoComplete="off" className="w-full bg-bg-input rounded-xl px-4 pt-6 pb-2 text-[14px] text-text-primary outline-none peer" placeholder=" " />
                     <label htmlFor="userEmail" className="absolute top-2 left-4 text-[11px] font-medium text-text-muted transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-[14px] peer-focus:top-2 peer-focus:text-[11px] peer-focus:text-brand-lavender pointer-events-none">
                       Email address
                     </label>
                     {email.length > 0 && (
                       <div className="absolute top-1/2 -translate-y-1/2 right-4 pointer-events-none">
                         {isEmailValid ? <CheckCircle2 className="w-4 h-4 text-state-success" /> : <Info className="w-4 h-4 text-state-error" />}
                       </div>
                     )}
                  </div>
                </div>
                <div className="relative group flex">
                  <div className="bg-bg-input border border-ui-border border-r-0 rounded-l-xl px-3 flex items-center justify-center text-[14px] text-text-primary min-w-[50px]">+212</div>
                  <div className="relative flex-1">
                    <input type="tel" name="medera_user_phone" value={phone.replace(/^\+212\s?/, '')} onChange={e=>setPhone(`+212 ${e.target.value}`)} id="userPhone" autoComplete="off" className="w-full bg-bg-input border border-l-0 border-ui-border rounded-r-xl px-4 pt-6 pb-2 text-[14px] text-text-primary outline-none focus:border-brand-indigo focus:border-l-[1px] focus:ml-[-1px] transition-all peer" placeholder=" " />
                    <label htmlFor="userPhone" className="absolute top-2 left-4 text-[11px] font-medium text-text-muted transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-[14px] peer-focus:top-2 peer-focus:text-[11px] peer-focus:text-brand-lavender pointer-events-none">
                      Phone number
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-8 border-t border-ui-border pt-6 flex justify-end">
                 <button onClick={saveInfo} disabled={updateInfoMutation.isPending} className="w-full sm:w-auto relative overflow-hidden px-8 py-3 rounded-xl bg-brand-indigo text-white text-[14px] font-medium transition-all hover:shadow-[0_0_15px_rgba(75,74,207,0.4)] disabled:opacity-50 flex items-center justify-center">
                    {updateInfoMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Changes"}
                 </button>
              </div>
            </motion.div>

            {/* Sec 3: Health Info (Read Only) */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22, ease: 'easeOut', duration: 0.5 }} className="glass-island border border-[#F59E0B20] rounded-[20px] p-6 lg:p-8 backdrop-blur-md group hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(75,74,207,0.08)] transition-all">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[16px] font-sans font-semibold text-text-primary flex items-center gap-2">
                  <HeartPulse size={18} className="text-[#F59E0B]" /> Health Information
                </h3>
              </div>
              <p className="text-[13px] text-text-muted italic mb-6 flex items-start gap-1.5 border-b border-[#F59E0B20] pb-4">
                <Info size={16} className="shrink-0 mt-0.5" /> This information is managed by your doctor and cannot be edited here. Contact your clinic to update medical records.
              </p>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-6 pb-4 border-b border-ui-border">
                  <div className="col-span-1 text-[13px] font-medium text-text-muted">Blood Group</div>
                  <div className="col-span-2">
                    <span className="px-3 py-1 bg-[#EF44441a] border border-[#EF444440] text-[#EF4444] font-mono text-[12px] font-bold rounded">
                      {user?.blood_group || 'N/A'}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-6 pb-4 border-b border-ui-border">
                  <div className="col-span-1 text-[13px] font-medium text-text-muted">Allergies</div>
                  <div className="col-span-2 flex flex-wrap gap-2">
                    {user?.allergies && user.allergies.length > 0 ? user.allergies.map((a: string) => (
                      <span key={a} className="px-3 py-1 bg-[#F59E0B1a] border border-[#F59E0B40] text-[#F59E0B] font-sans text-[12px] rounded-full">
                          {a}
                      </span>
                    )) : <span className="text-[13px] text-text-muted">None recorded</span>}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6 pb-4 border-b border-ui-border">
                  <div className="col-span-1 text-[13px] font-medium text-text-muted">Medical History</div>
                  <div className="col-span-2 text-[13px] text-text-primary leading-relaxed">
                    {user?.medical_history || 'None recorded'}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div className="col-span-1 text-[13px] font-medium text-text-muted">Insurance</div>
                  <div className="col-span-2">
                    <span className="px-3 py-1 bg-bg-elevated border border-ui-border text-text-muted font-sans text-[12px] rounded-full">
                      {user?.insurance_provider || 'Not provided'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Sec 4: Change Password */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26, ease: 'easeOut', duration: 0.5 }} className="glass-island border border-ui-border rounded-[20px] overflow-hidden backdrop-blur-md mb-8">
              <div className="bg-state-warning-bg border-b border-state-warning/30 px-6 py-3 flex items-center gap-3">
                 <span className="text-state-warning"><Info size={16} /></span>
                 <p className="font-mono text-[11px] text-state-warning uppercase tracking-wide font-medium">
                   For your security, enter your current password before setting a new one.
                 </p>
              </div>
              <div className="p-6 lg:p-8">
                <h3 className="text-[16px] font-sans font-semibold text-text-primary mb-6">Change Password</h3>
                
                <div className="max-w-[400px] space-y-5">
                  <div className="relative group">
                    <div className={`relative rounded-xl border transition-all ${pwdShake ? 'animate-[shake_400ms_ease-in-out] border-state-error' : 'border-ui-border focus-within:border-brand-indigo focus-within:shadow-[0_0_12px_rgba(75,74,207,0.2)]'}`}>
                      <input type={showCur ? 'text' : 'password'} value={currentPwd} onChange={e=>setCurrentPwd(e.target.value)} id="curPwd" className="w-full bg-bg-input rounded-xl px-4 pt-6 pb-2 text-[14px] text-text-primary outline-none peer pr-12" placeholder=" " />
                      <label htmlFor="curPwd" className="absolute top-2 left-4 text-[11px] font-medium text-text-muted transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-[14px] peer-focus:top-2 peer-focus:text-[11px] peer-focus:text-brand-lavender pointer-events-none">
                        Current Password
                      </label>
                      <button onClick={()=>setShowCur(!showCur)} className="absolute top-1/2 -translate-y-1/2 right-4 text-text-muted hover:text-text-primary transition-colors focus:outline-none">
                         {getEyeIcon(showCur)}
                      </button>
                    </div>
                  </div>

                  <div className="relative group">
                    <div className={`relative rounded-xl border border-ui-border focus-within:border-brand-indigo focus-within:shadow-[0_0_12px_rgba(75,74,207,0.2)] transition-all`}>
                      <input type={showNew ? 'text' : 'password'} value={newPwd} onChange={e=>setNewPwd(e.target.value)} onFocus={()=>setPwdFocused(true)} id="newPwd" className="w-full bg-bg-input rounded-xl px-4 pt-6 pb-2 text-[14px] text-text-primary outline-none peer pr-12" placeholder=" " />
                      <label htmlFor="newPwd" className="absolute top-2 left-4 text-[11px] font-medium text-text-muted transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-[14px] peer-focus:top-2 peer-focus:text-[11px] peer-focus:text-brand-lavender pointer-events-none">
                        New Password
                      </label>
                      <button onClick={()=>setShowNew(!showNew)} className="absolute top-1/2 -translate-y-1/2 right-4 text-text-muted hover:text-text-primary transition-colors focus:outline-none">
                         {getEyeIcon(showNew)}
                      </button>
                    </div>
                    {/* Strength Bar */}
                    <div className="mt-2 flex items-center justify-between px-1">
                      <div className="flex gap-1 w-full h-[4px] mr-4">
                        {[0,1,2,3].map(i => (
                          <div key={i} className="flex-1 rounded-full bg-bg-input bg-opacity-50 overflow-hidden relative">
                             {score > i && (
                               <motion.div layoutId={`str-${i}`} initial={{width:0}} animate={{width:'100%'}} transition={{duration:0.3}} className={`absolute inset-0 ${strengthColors[score]}`} />
                             )}
                          </div>
                        ))}
                      </div>
                      <span className="text-[10px] font-mono font-medium text-text-muted uppercase min-w-[50px] text-right">
                        {pStrength ? pStrength : ''}
                      </span>
                    </div>
                  </div>

                  {/* Rules grid reveal */}
                  <motion.div 
                    initial={false}
                    animate={{ height: pwdFocused ? 'auto' : 0, opacity: pwdFocused ? 1 : 0 }}
                    style={{ overflow: 'hidden' }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="p-3 mb-2 rounded-xl bg-[#ffffff05] border border-ui-border text-[12px] space-y-1">
                       <p className={`flex items-center gap-2 ${hasLen ? 'text-state-success' : 'text-text-muted'}`}>{hasLen ? <Check size={14}/> : <X size={14}/>} At least 8 characters</p>
                       <p className={`flex items-center gap-2 ${hasUp ? 'text-state-success' : 'text-text-muted'}`}>{hasUp ? <Check size={14}/> : <X size={14}/>} One uppercase letter</p>
                       <p className={`flex items-center gap-2 ${hasNum ? 'text-state-success' : 'text-text-muted'}`}>{hasNum ? <Check size={14}/> : <X size={14}/>} One number</p>
                       <p className={`flex items-center gap-2 ${hasSpec ? 'text-state-success' : 'text-text-muted'}`}>{hasSpec ? <Check size={14}/> : <X size={14}/>} One special character</p>
                    </div>
                  </motion.div>

                  <div className="relative group">
                    <div className={`relative rounded-xl border border-ui-border focus-within:border-brand-indigo focus-within:shadow-[0_0_12px_rgba(75,74,207,0.2)] transition-all`}>
                      <input type="password" value={confPwd} onChange={e=>setConfPwd(e.target.value)} onFocus={()=>setPwdFocused(true)} id="confPwd" className="w-full bg-bg-input rounded-xl px-4 pt-6 pb-2 text-[14px] text-text-primary outline-none peer pr-12" placeholder=" " />
                      <label htmlFor="confPwd" className="absolute top-2 left-4 text-[11px] font-medium text-text-muted transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-[14px] peer-focus:top-2 peer-focus:text-[11px] peer-focus:text-brand-lavender pointer-events-none">
                        Confirm New Password
                      </label>
                      <AnimatePresence>
                        {match && (
                          <motion.div initial={{scale:0}} animate={{scale:1}} exit={{scale:0}} className="absolute top-1/2 -translate-y-1/2 right-4 pointer-events-none">
                             <CheckCircle2 className="w-4 h-4 text-state-success" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="pt-4">
                     <button onClick={savePwd} disabled={!canUpdatePwd || changePasswordMutation.isPending} className="w-full relative overflow-hidden px-8 py-3 rounded-xl bg-brand-indigo text-white text-[14px] font-medium transition-all hover:shadow-[0_0_15px_rgba(75,74,207,0.4)] disabled:opacity-50 disabled:hover:shadow-none flex items-center justify-center">
                        {changePasswordMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update Password"}
                     </button>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>

          {/* Right Column (Preview) */}
          <div className="lg:col-span-4 relative">
            <div className="sticky top-[88px]">
               <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.5, ease: 'easeOut' }} className="glass-island border border-ui-border rounded-[20px] p-6 lg:p-8 backdrop-blur-xl">
                  
                  <h4 className="font-mono text-[11px] text-text-muted tracking-[0.2em] uppercase mb-8">
                     Preview
                  </h4>

                  <div className="flex flex-col items-center text-center">
                     <div className="relative mb-5">
                       <AnimatePresence mode="popLayout">
                         <motion.div key={previewPhoto || 'pi'} initial={{ opacity: 0.6 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
                           {getAvatar('w-20 h-20 text-[28px] ring-4 ring-bg-input')}
                         </motion.div>
                       </AnimatePresence>
                     </div>

                     <AnimatePresence mode="wait">
                       <motion.div key={firstName+lastName} initial={{opacity: 0.6}} animate={{opacity: 1}} transition={{duration: 0.15}}>
                         <h3 className="text-[24px] font-serif text-text-primary capitalize leading-tight mb-2">
                           {firstName || lastName ? `${firstName} ${lastName}` : 'Patient Name'}
                         </h3>
                       </motion.div>
                     </AnimatePresence>

                     <span className="font-mono text-[10px] uppercase font-bold text-state-success bg-state-success/10 px-2 py-0.5 rounded border border-state-success/30 mb-5">
                       PATIENT
                     </span>

                     <div className="space-y-1 w-full border-b border-ui-border pb-6 mb-6">
                       <AnimatePresence mode="wait">
                         <motion.p key={email} initial={{opacity: 0.6}} animate={{opacity: 1}} transition={{duration: 0.15}} className="font-sans text-[14px] text-text-muted">
                           {email || 'patient@medera.ma'}
                         </motion.p>
                       </AnimatePresence>
                       <AnimatePresence mode="wait">
                         <motion.p key={phone} initial={{opacity: 0.6}} animate={{opacity: 1}} transition={{duration: 0.15}} className="font-sans text-[14px] text-text-muted">
                           {phone ? (phone.startsWith('+212') ? phone : '+212 ' + phone.trim()) : '+212 600-000000'}
                         </motion.p>
                       </AnimatePresence>
                     </div>

                     <div className="w-full space-y-4">
                       <div className="flex items-center justify-between text-[12px]">
                         <span className="text-text-muted">Account created</span>
                         <span className="text-text-primary font-medium">{user ? formatDate(user.created_at) : 'N/A'}</span>
                       </div>
                       <div className="flex items-center justify-between text-[12px]">
                         <span className="text-text-muted">Last login</span>
                         <span className="text-text-primary font-medium">{user ? 'Today' : 'N/A'}</span>
                       </div>
                       <div className="flex items-center justify-between text-[12px]">
                         <span className="text-text-muted">User ID</span>
                         <span className="text-text-primary font-mono bg-[#ffffff0a] px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 cursor-pointer hover:bg-ui-border transition-colors">
                           {user?.id ? user.id.split('-')[0] : 'N/A'}... <Copy size={10} />
                         </span>
                       </div>
                     </div>
                  </div>

               </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
