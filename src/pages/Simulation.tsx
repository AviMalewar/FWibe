import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Cpu, Sparkles, Zap, Shield, Search, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const STEPS = [
  { id: 'interests', label: 'Analyzing Interests...', icon: Sparkles, color: 'accent-blue' },
  { id: 'skills', label: 'Comparing Skills...', icon: Cpu, color: 'accent-purple' },
  { id: 'compatibility', label: 'Calculating Compatibility...', icon: Zap, color: 'accent-pink' },
  { id: 'security', label: 'Verifying Profile Integrity...', icon: Shield, color: 'accent-blue' },
  { id: 'searching', label: 'Searching for Perfect Matches...', icon: Search, color: 'accent-purple' },
];

export default function Simulation() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (progress < 100) {
      const timer = setTimeout(() => {
        setProgress(prev => prev + 1);
        if (progress % 20 === 0 && currentStep < STEPS.length - 1) {
          setCurrentStep(Math.floor(progress / 20));
        }
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setIsComplete(true);
      // Wait a bit then navigate
      const finalTimer = setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
      return () => clearTimeout(finalTimer);
    }
  }, [progress, currentStep, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#030712] p-4 overflow-hidden relative">
      {/* Background Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent-blue/5 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-accent-purple/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent-pink/5 rounded-full blur-[100px]" />

      <div className="max-w-2xl w-full relative z-10">
        <AnimatePresence mode="wait">
          {!isComplete ? (
            <motion.div
              key="scanning"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="glass-card p-12 text-center space-y-12 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
              
              <div className="relative">
                <div className="w-32 h-32 mx-auto relative">
                  <svg className="w-full h-full -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="60"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      className="text-white/5"
                    />
                    <motion.circle
                      cx="64"
                      cy="64"
                      r="60"
                      fill="none"
                      stroke="url(#scanGradient)"
                      strokeWidth="4"
                      strokeDasharray={377}
                      strokeDashoffset={377 - (377 * progress) / 100}
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="scanGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      key={currentStep}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-accent-blue"
                    >
                      {(() => {
                        const Icon = STEPS[currentStep].icon;
                        return <Icon className="w-10 h-10" />;
                      })()}
                    </motion.div>
                  </div>
                </div>
                
                {/* Scanning Line */}
                <motion.div 
                  className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-blue to-transparent"
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
              </div>

              <div className="space-y-6">
                <h2 className="text-3xl font-display font-black text-white tracking-tighter uppercase tracking-widest">
                  {STEPS[currentStep].label}
                </h2>
                <div className="flex justify-center gap-2">
                  {STEPS.map((_, idx) => (
                    <div 
                      key={idx}
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        idx < currentStep ? 'w-8 bg-accent-blue' : 
                        idx === currentStep ? 'w-12 bg-gradient-to-r from-accent-blue to-accent-purple' : 
                        'w-4 bg-white/10'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Neural Load</p>
                  <p className="text-xl font-display font-black text-white">{progress}%</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Compatibility</p>
                  <p className="text-xl font-display font-black text-accent-blue">Optimizing</p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-12 text-center space-y-8"
            >
              <div className="w-24 h-24 bg-gradient-to-br from-accent-blue to-accent-purple rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-accent-blue/20">
                <CheckCircle2 className="w-12 h-12 text-white" />
              </div>
              <div className="space-y-4">
                <h2 className="text-5xl font-display font-black text-white tracking-tighter">
                  Match <span className="gradient-text">Found!</span>
                </h2>
                <p className="text-white/40 text-lg font-medium">
                  We've analyzed thousands of profiles and found your perfect vibe matches.
                </p>
              </div>
              
              <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-accent-blue/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-[10px] font-black text-accent-blue uppercase tracking-[0.3em] mb-2">Top Match Score</p>
                    <p className="text-6xl font-display font-black text-white tracking-tighter">91%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-2">Vibe Status</p>
                    <p className="text-2xl font-display font-black text-accent-pink uppercase tracking-widest">Elite</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-white/20 text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">
                Redirecting to Dashboard
                <ArrowRight className="w-3 h-3" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
