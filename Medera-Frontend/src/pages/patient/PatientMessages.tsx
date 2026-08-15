import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../../contexts/LanguageContext';
import { MessageSquare, Send, CheckCircle2, ChevronRight, Plus, CheckCheck, Check, X, ChevronDown, ArrowLeft, Loader2 } from 'lucide-react';
import { getThreads, getMessages, sendReply, markThreadRead, createThread } from '../../services/messagingService';
import { getContacts } from '../../services/patientService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { useToast } from '../../components/Toast';
import * as authService from '../../services/authService';

export default function PatientMessages() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [isToDropdownOpen, setIsToDropdownOpen] = useState(false);
  const [newMsg, setNewMsg] = useState({ to: '', subject: '', text: '' });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: authService.getMe });

  const { data: threadsResponse, isLoading: threadsLoading } = useQuery({
    queryKey: ['patient-message-threads'],
    queryFn: getThreads,
    refetchInterval: 10000,
  });

  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ['patient-contacts'],
    queryFn: getContacts,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['patient-messages', activeThreadId],
    queryFn: () => {
      if (!activeThreadId) return Promise.resolve([]);
      markThreadRead(activeThreadId).catch(console.error);
      return getMessages(activeThreadId);
    },
    enabled: !!activeThreadId,
    refetchInterval: 5000,
  });

  const threads = threadsResponse?.results || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeThread = threads.find((t: any) => t.id === activeThreadId);

  const selectThread = (id: string) => {
     setActiveThreadId(id);
  };

  const replyMutation = useMutation({
    mutationFn: (content: string) => {
      if (!activeThreadId) throw new Error('No thread selected');
      return sendReply(activeThreadId, content);
    },
    onSuccess: () => {
      setReplyText('');
      queryClient.invalidateQueries({ queryKey: ['patient-messages', activeThreadId] });
      queryClient.invalidateQueries({ queryKey: ['patient-message-threads'] });
    }
  });

  const handleReply = () => {
     if (!replyText.trim() || !activeThread) return;
     replyMutation.mutate(replyText);
  };

  const createThreadMutation = useMutation({
    mutationFn: (data: { recipient_id: string, subject: string, content: string }) => createThread(data),
    onSuccess: (newThread) => {
      queryClient.invalidateQueries({ queryKey: ['patient-message-threads'] });
      setShowNewModal(false);
      setNewMsg({ to: '', subject: '', text: '' });
      setActiveThreadId(newThread.id);
    },
    onError: () => {
      addToast('Cannot create message right now.', 'error');
    }
  });

  const handleCreateNew = () => {
     if (!newMsg.subject || !newMsg.text || !newMsg.to) return;
     createThreadMutation.mutate({
       recipient_id: newMsg.to,
       subject: newMsg.subject,
       content: newMsg.text
     });
  };

  if (threadsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-brand-indigo animate-spin mb-4" />
        <p className="text-text-muted font-sans text-lg">Loading conversations...</p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-bg-canvas">
      <div className="shrink-0 pt-4 px-6 pb-2 hidden lg:block border-b border-ui-border">
        <h2 className="text-[20px] font-sans text-text-primary leading-tight">{t('patient.nav.messages') || 'Messages'}</h2>
        <p className="text-[13px] text-text-muted mt-0.5">Communicate with your doctor and clinic.</p>
      </div>

      <div className="flex-1 min-h-0 flex overflow-hidden bg-bg-surface relative">
         
         {/* Left Panel - Thread List */}
         <div className={`w-full lg:w-[340px] shrink-0 flex flex-col border-r border-ui-border overflow-hidden transition-transform duration-300 ${activeThreadId ? 'hidden lg:flex' : 'flex'}`}>
            <div className="shrink-0 p-4 border-b border-ui-border">
               <button onClick={() => setShowNewModal(true)} className="w-full h-12 bg-brand-indigo hover:bg-[#6C6BFF] text-white rounded-full text-[15px] font-semibold transition-colors flex items-center justify-center gap-2 group shadow-lg shadow-brand-indigo/20">
                  <Plus size={20} className="transition-transform duration-200 group-hover:rotate-45" /> New Message
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
               {threads.length === 0 ? (
                 <div className="p-8 text-center flex flex-col items-center justify-center h-full opacity-50">
                   <MessageSquare className="w-12 h-12 mb-4" />
                   <p className="text-sm">No messages yet</p>
                 </div>
               ) : (
                 threads.map((thread: any) => {
                    const isActive = activeThreadId === thread.id;
                    const otherPartyName = thread.other_party_name || thread.participants?.find((p: any) => p.role !== 'PATIENT')?.name || thread.participants?.[0]?.name || 'Unknown';
                    
                    return (
                       <div 
                          key={thread.id} 
                          onClick={() => selectThread(thread.id)}
                          className={`p-[14px] px-4 border-b border-ui-border cursor-pointer transition-colors relative ${isActive ? 'bg-brand-indigo/5' : 'hover:bg-brand-indigo/[0.02]'}`}
                       >
                          {isActive && <motion.div layoutId="activeThreadIndicator" className="absolute left-0 top-0 bottom-0 w-[4px] bg-brand-indigo"></motion.div>}
                          
                          <div className="flex items-center gap-3">
                             <div className="relative shrink-0">
                                <div className={`w-[38px] h-[38px] rounded-full flex items-center justify-center text-[13px] font-semibold ${isActive ? 'bg-brand-indigo text-white' : 'bg-bg-input text-text-primary'}`}>
                                   {(otherPartyName || 'Un').substring(0, 2).toUpperCase()}
                                </div>
                                {!thread.is_read && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-brand-indigo shadow-[0_0_8px_rgba(75,74,207,0.5)]"></span>}
                             </div>
                             <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                <div className="flex items-center justify-between gap-2">
                                   <div className={`text-[14px] truncate ${!thread.is_read ? 'font-semibold text-text-primary' : 'font-normal text-text-muted'}`}>{otherPartyName}</div>
                                   <div className="font-mono text-[10px] text-text-muted shrink-0">
                                     {thread.updated_at ? format(new Date(thread.updated_at), 'MMM dd') : ''}
                                   </div>
                                </div>
                                <div className={`text-[12px] truncate opacity-80 ${!thread.is_read ? 'text-brand-indigo font-medium' : 'text-text-muted'}`}>{thread.subject}</div>
                             </div>
                          </div>
                       </div>
                    );
                 })
               )}
            </div>
         </div>

         {/* Right Panel - Thread View */}
         <div className={`flex-1 min-w-0 flex flex-col overflow-hidden bg-bg-surface ${!activeThreadId ? 'hidden lg:flex' : 'flex'}`}>
            {activeThread ? (
               <>
                  <div className="shrink-0 p-4 lg:px-6 border-b border-ui-border bg-bg-surface flex items-center gap-3">
                     <button className="lg:hidden p-2 -ml-2 text-text-muted hover:text-white" onClick={() => setActiveThreadId(null)}>
                        <ArrowLeft size={20} />
                     </button>
                     <div className="relative shrink-0">
                        <div className="w-[42px] h-[42px] rounded-full border-2 border-brand-indigo/30 flex items-center justify-center bg-bg-input text-text-primary font-semibold text-[14px]">
                           {(activeThread.other_party_name || activeThread.participants?.find((p: any) => p.role !== 'PATIENT')?.name || activeThread.participants?.[0]?.name || 'Un').substring(0,2).toUpperCase()}
                        </div>
                        <span className="absolute bottom-0 right-0 w-3 h-3 border-2 border-bg-surface bg-[#22C55E] rounded-full"></span>
                     </div>
                     <div className="flex-1 min-w-0 ml-1">
                        <div className="text-[16px] font-semibold text-text-primary truncate">
                           {activeThread.other_party_name || activeThread.participants?.find((p: any) => p.role !== 'PATIENT')?.name || activeThread.participants?.[0]?.name || 'Unknown'}
                        </div>
                        <div className="text-[12px] text-[#22C55E]">{t('patient.msg.online') || 'Active'}</div>
                     </div>
                  </div>

                  <div className="flex-1 overflow-y-auto min-h-0 p-4 lg:p-6 flex flex-col gap-4 scroll-smooth custom-scrollbar bg-bg-surface/50">
                     {messagesLoading ? (
                       <div className="flex flex-col items-center justify-center h-full opacity-50">
                         <Loader2 className="animate-spin mb-2" />
                         <span className="text-xs">Loading messages...</span>
                       </div>
                     ) : messages.length === 0 ? (
                       <div className="flex flex-col items-center justify-center h-full opacity-50">
                         <p className="text-sm">No messages in this conversation yet</p>
                       </div>
                     ) : (
                        messages.map((m: any, idx: number, arr: any[]) => {
                           const isMe = me ? m.sender === me.id : false;
                           const isConsecutive = idx > 0 && arr[idx - 1].sender === m.sender;
                          return (
                             <motion.div 
                                key={m.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex flex-col max-w-[75%] ${isMe ? 'self-end items-end' : 'self-start items-start'} ${isConsecutive ? 'mt-[-8px]' : ''}`}
                             >
                                <div className={`p-3 px-4 text-[14px] leading-relaxed break-words ${isMe ? 'bg-brand-indigo text-white rounded-[18px] rounded-br-[4px]' : 'bg-bg-input border border-ui-border text-text-primary rounded-[18px] rounded-bl-[4px]'}`}>
                                   {m.content}
                                </div>
                                <div className={`font-mono text-[10px] text-text-muted mt-1.5 flex items-center gap-1.5`}>
                                   {isMe ? 'You' : m.sender_name} · {m.created_at ? format(parseISO(m.created_at), 'HH:mm') : ''}
                                   {isMe && (
                                      <span className={`flex items-center gap-0.5 ${m.is_read ? 'text-brand-indigo' : 'text-text-muted'}`}>
                                         {m.is_read ? <CheckCheck size={14} /> : <Check size={14} />}
                                      </span>
                                   )}
                                </div>
                             </motion.div>
                          );
                       })
                     )}
                     <div ref={messagesEndRef} />
                  </div>

                  <div className="shrink-0 p-4 bg-bg-surface border-t border-ui-border">
                     <div className="flex items-end gap-3 bg-bg-input/50 border border-ui-border rounded-[16px] p-2.5 pl-4 focus-within:border-brand-indigo transition-all">
                        <textarea
                           value={replyText}
                           onChange={(e) => {
                              setReplyText(e.target.value);
                              e.target.style.height = 'auto';
                              e.target.style.height = Math.min(120, e.target.scrollHeight) + 'px';
                           }}
                           className="flex-1 min-h-[24px] max-h-[120px] bg-transparent text-[14px] text-text-primary resize-none outline-none py-1.5 font-sans leading-relaxed custom-scrollbar"
                           placeholder="Type a message..."
                           onKeyDown={(e) => { 
                              if(e.key === 'Enter' && !e.shiftKey) { 
                                 e.preventDefault(); 
                                 if (replyText.trim() && !replyMutation.isPending) {
                                    handleReply();
                                    e.currentTarget.style.height = 'auto';
                                 }
                              } 
                           }}
                        />
                        <button 
                           onClick={handleReply}
                           disabled={!replyText.trim() || replyMutation.isPending}
                           className="w-10 h-10 rounded-full bg-brand-indigo text-white flex items-center justify-center shrink-0 hover:scale-[1.12] active:scale-[0.94] hover:shadow-[0_4px_16px_rgba(75,74,207,0.5)] transition-all duration-200 disabled:opacity-50 mb-0.5"
                        >
                           {replyMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="-translate-x-0.5 translate-y-[1px]" />}
                        </button>
                     </div>
                  </div>
               </>
            ) : (
               <div className="flex-1 flex flex-col items-center justify-center text-center bg-bg-surface hidden lg:flex">
                  <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}>
                     <MessageSquare className="w-16 h-16 text-ui-border mb-6" />
                  </motion.div>
                  <h3 className="text-[20px] font-sans text-text-primary mb-2">Select a conversation or start a new one</h3>
               </div>
            )}
         </div>

      </div>

      <AnimatePresence>
         {showNewModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-canvas/80 backdrop-blur-sm" onClick={(e) => { if(e.target === e.currentTarget) setShowNewModal(false); }}>
               <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-lg glass-island border border-ui-border rounded-3xl overflow-hidden shadow-2xl">
                  <div className="p-6 border-b border-ui-border flex items-center justify-between">
                     <h3 className="text-[22px] font-sans text-text-primary">New Message</h3>
                     <button onClick={() => setShowNewModal(false)} className="p-2 text-text-muted hover:text-text-primary transition-colors">
                        <X size={20} />
                     </button>
                  </div>

                  <div className="p-6 space-y-4">
                     <div className="space-y-1.5 relative">
                        <label className="text-xs font-mono text-text-muted uppercase tracking-wider">Recipient</label>
                        <button 
                           className="w-full flex items-center justify-between px-4 py-3 bg-bg-input border border-ui-border rounded-md text-left" 
                           onClick={() => setIsToDropdownOpen(!isToDropdownOpen)}
                           disabled={contactsLoading}
                        >
                           <span>
                              {contactsLoading ? 'Loading contacts...' : 
                               newMsg.to ? contacts.find((c: any) => c.id === newMsg.to)?.name || newMsg.to :
                               'Select recipient...'}
                           </span>
                           <ChevronDown size={18} className={`transition-transform ${isToDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        <AnimatePresence>
                        {isToDropdownOpen && !contactsLoading && (
                           <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute z-[60] left-0 right-0 top-full mt-2 max-h-[250px] overflow-y-auto glass-island bg-bg-surface border border-ui-border rounded-md shadow-xl custom-scrollbar">
                              
                              {contacts.filter((c: any) => c.role === 'DOCTOR').length > 0 && (
                                 <>
                                    <div className="px-4 py-2 text-[10px] font-mono text-text-muted uppercase tracking-wider bg-bg-surface sticky top-0 z-10">Doctors</div>
                                    {contacts.filter((c: any) => c.role === 'DOCTOR').map((contact: any) => (
                                 <div 
                                    key={contact.id}
                                    className={`px-4 py-3 cursor-pointer hover:bg-brand-indigo/5 flex items-center gap-3 ${newMsg.to === contact.id ? 'bg-brand-indigo/10' : ''}`}
                                    onClick={() => { setNewMsg({...newMsg, to: contact.id}); setIsToDropdownOpen(false); }}
                                 >
                                    <div className="w-8 h-8 rounded-full bg-bg-input flex items-center justify-center text-xs font-bold text-text-primary">
                                       DR
                                    </div>
                                    <div className="flex-1">
                                       <div className="text-sm font-medium text-text-primary">{contact.name}</div>
                                    </div>
                                    {newMsg.to === contact.id && <Check size={16} className="text-brand-indigo" />}
                                 </div>
                              ))}
                              </>
                              )}

                              {contacts.filter((c: any) => c.role === 'SECRETARY').length > 0 && (
                                 <>
                                    <div className="px-4 py-2 text-[10px] font-mono text-text-muted uppercase tracking-wider bg-bg-surface sticky top-0 z-10 border-t border-ui-border">Secretaries</div>
                                    {contacts.filter((c: any) => c.role === 'SECRETARY').map((contact: any) => (
                                 <div 
                                    key={contact.id}
                                    className={`px-4 py-3 cursor-pointer hover:bg-brand-indigo/5 flex items-center gap-3 border-t border-ui-border ${newMsg.to === contact.id ? 'bg-brand-indigo/10' : ''}`}
                                    onClick={() => { setNewMsg({...newMsg, to: contact.id}); setIsToDropdownOpen(false); }}
                                 >
                                    <div className="w-8 h-8 rounded-full bg-bg-input flex items-center justify-center text-xs font-bold text-brand-indigo">
                                       SEC
                                    </div>
                                    <div className="flex-1">
                                       <div className="text-sm font-medium text-text-primary">{contact.name}</div>
                                    </div>
                                    {newMsg.to === contact.id && <Check size={16} className="text-brand-indigo" />}
                                 </div>
                              ))}
                              </>
                              )}
                           </motion.div>
                        )}
                        </AnimatePresence>
                     </div>

                     <div className="space-y-1.5">
                        <label className="text-xs font-mono text-text-muted uppercase tracking-wider">Subject</label>
                        <input value={newMsg.subject} onChange={e => setNewMsg({...newMsg, subject: e.target.value})} className="w-full px-4 py-3 bg-bg-input border border-ui-border rounded-xl outline-none focus:border-brand-indigo transition-colors" placeholder="Medical inquiry, follow-up, etc." />
                     </div>

                     <div className="space-y-1.5">
                        <label className="text-xs font-mono text-text-muted uppercase tracking-wider">Message</label>
                        <textarea value={newMsg.text} onChange={e => setNewMsg({...newMsg, text: e.target.value})} className="w-full px-4 py-3 bg-bg-input border border-ui-border rounded-xl outline-none focus:border-brand-indigo transition-colors min-h-[120px] resize-none custom-scrollbar" placeholder="Type your message here..." />
                     </div>
                  </div>

                  <div className="p-6 pt-0">
                     <button 
                        onClick={handleCreateNew} 
                        disabled={!newMsg.to || !newMsg.subject || !newMsg.text.trim() || createThreadMutation.isPending} 
                        className="w-full py-4 bg-brand-indigo hover:bg-[#6C6BFF] text-white rounded-xl text-[15px] font-semibold transition-all shadow-lg shadow-brand-indigo/20 flex items-center justify-center gap-2 disabled:opacity-50"
                     >
                        {createThreadMutation.isPending ? <Loader2 size={20} className="animate-spin" /> : <Send size={18} />} Send Message
                     </button>
                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>
    </div>
  );
}
