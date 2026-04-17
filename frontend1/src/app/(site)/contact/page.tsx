'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mail, Building, User, MessageSquare, ChevronDown, Loader2, CheckCircle, Smartphone } from 'lucide-react';
import SectionHeader from '@/components/shared/SectionHeader';
import ParticleBackground from '@/components/shared/ParticleBackground';

const industries = ['Manufacturing', 'Automotive', 'Energy', 'Oil & Gas', 'Pharma', 'Mining', 'Logistics', 'Robotics', 'Other'];

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', company: '', email: '', industry: '', message: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 1500));
    setIsSubmitting(false);
    setSubmitted(true);
  };

  return (
    <div className="pb-32 min-h-screen">
      <section className="section-padding relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <ParticleBackground count={40} />
          <div className="absolute inset-0 hero-radial opacity-60" />
        </div>

        <div className="container-custom relative z-10">
          <div className="text-center mb-32">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/30 bg-emerald-500/5 mb-10">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 text-[10px] font-orbitron tracking-[4px] uppercase font-bold">Secure Protocol</span>
            </div>
            <h1 className="font-orbitron font-black text-6xl md:text-8xl gradient-text-cyan mb-8 tracking-tighter uppercase">Establish Link</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-20 max-w-7xl mx-auto">
            {/* Info Panel */}
            <div className="lg:col-span-2 space-y-10">
              {[
                { icon: Mail, label: 'Direct Protocol', value: 'connect@aura.io', color: '#00f5ff' },
                { icon: Building, label: 'Headquarters', value: 'Bangalore / Remote', color: '#a855f7' },
                { icon: User, label: 'Response Time', value: '< 4 Hours (SLA)', color: '#10b981' },
              ].map(item => (
                <div key={item.label} className="glass-card p-10 flex items-center gap-8 border-white/5 group hover:border-cyan-500/20 transition-all">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform" style={{ background: `${item.color}10`, border: `1px solid ${item.color}20` }}>
                    <item.icon className="w-6 h-6" style={{ color: item.color }} />
                  </div>
                  <div>
                    <div className="text-slate-600 text-[10px] font-mono uppercase tracking-[4px] mb-2">{item.label}</div>
                    <div className="text-white text-lg font-orbitron font-bold tracking-tight">{item.value}</div>
                  </div>
                </div>
              ))}

              <div className="glass-card p-12 border border-cyan-500/10 bg-cyan-500/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-3xl" />
                <h4 className="font-orbitron font-bold text-cyan-400 text-[11px] uppercase tracking-[4px] mb-10">Pilot Requirements</h4>
                <ul className="space-y-6">
                  {['Live sensor data stream (SSE/WS)', 'Assigned maintenance supervisor', 'Facility connectivity map', 'Specific machine ID list'].map(item => (
                    <li key={item} className="flex items-center gap-4 text-slate-400 text-sm font-light">
                      <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(0,245,255,0.5)]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Form Panel */}
            <div className="lg:col-span-3">
              <AnimatePresence mode="wait">
                {submitted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card p-16 md:p-24 border border-green-500/20 text-center h-full flex flex-col items-center justify-center"
                  >
                    <div className="w-24 h-24 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mb-10">
                      <CheckCircle className="w-12 h-12 text-green-400" />
                    </div>
                    <h3 className="font-orbitron font-bold text-white text-3xl mb-6 tracking-tight">Transmission Received</h3>
                    <p className="text-slate-500 text-lg max-w-md font-light leading-relaxed">
                      Our systems have established a link. A Logic Weaver will reach out within 4 hours to begin the ROI analysis.
                    </p>
                    <button 
                      onClick={() => setSubmitted(false)}
                      className="mt-16 text-cyan-400 text-xs font-orbitron font-bold uppercase tracking-[4px] hover:text-white transition-colors border-b border-cyan-500/20 pb-2"
                    >
                      Establish New Link
                    </button>
                  </motion.div>
                ) : (
                  <motion.form 
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onSubmit={handleSubmit} 
                    className="glass-card p-12 md:p-16 space-y-10 border-white/5"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                      <div className="space-y-4">
                        <label className="text-slate-500 text-[10px] font-mono tracking-[3px] uppercase flex items-center gap-2">
                          <User className="w-3 h-3 text-cyan-400" /> Personnel Name
                        </label>
                        <input
                          required
                          type="text"
                          value={form.name}
                          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                          placeholder="John Smith"
                          className="input-neon"
                        />
                      </div>
                      <div className="space-y-4">
                        <label className="text-slate-500 text-[10px] font-mono tracking-[3px] uppercase flex items-center gap-2">
                          <Building className="w-3 h-3 text-cyan-400" /> Facility Name
                        </label>
                        <input
                          required
                          type="text"
                          value={form.company}
                          onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                          placeholder="Acme Industrial"
                          className="input-neon"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-slate-500 text-[10px] font-mono tracking-[3px] uppercase flex items-center gap-2">
                        <Mail className="w-3 h-3 text-cyan-400" /> Corporate Protocol (Email)
                      </label>
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="john@facility.io"
                        className="input-neon"
                      />
                    </div>

                    <div className="space-y-4">
                      <label className="text-slate-500 text-[10px] font-mono tracking-[3px] uppercase flex items-center gap-2">
                        <ChevronDown className="w-3 h-3 text-cyan-400" /> Operational Sector
                      </label>
                      <select
                        required
                        value={form.industry}
                        onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                        className="input-neon appearance-none cursor-pointer"
                      >
                        <option value="" disabled>Select your sector</option>
                        {industries.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                      </select>
                    </div>

                    <div className="space-y-4">
                      <label className="text-slate-500 text-[10px] font-mono tracking-[3px] uppercase flex items-center gap-2">
                        <MessageSquare className="w-3 h-3 text-cyan-400" /> Requirement Profile
                      </label>
                      <textarea
                        value={form.message}
                        onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                        placeholder="Describe your machine fleet and current pain points..."
                        rows={5}
                        className="input-neon resize-none"
                      />
                    </div>

                    <motion.button
                      type="submit"
                      disabled={isSubmitting}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-orbitron font-black text-xs tracking-[4px] uppercase flex items-center justify-center gap-4 shadow-xl hover:shadow-cyan-500/30 disabled:opacity-50 transition-all mt-8"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          ESTABLISHING LINK...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          TRANSMIT REQUEST
                        </>
                      )}
                    </motion.button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
