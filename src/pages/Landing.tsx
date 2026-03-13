import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Zap, Users, MessageSquare, Cpu, ArrowRight, Sparkles, Heart, Music, Film } from 'lucide-react';
import profile from "../assets/avinash.png"
const features = [
  {
    title: "Find Your Perfect Vibe",
    desc: "Connect with like-minded students based on shared music, movies, hobbies, and goals.",
    icon: Zap,
    color: "from-accent-blue to-accent-purple"
  },
  {
    title: "Real-time Matching",
    desc: "Our algorithm finds your best matches instantly based on your unique profile.",
    icon: Users,
    color: "from-accent-purple to-accent-pink"
  },
  {
    title: "Instant Connection",
    desc: "Automatically start chatting with your best matches and build meaningful connections.",
    icon: MessageSquare,
    color: "from-accent-pink to-accent-blue"
  },
  {
    title: "Vibe Simulation",
    desc: "Try our unique simulation to see how well you'd vibe with different personalities.",
    icon: Cpu,
    color: "from-accent-blue via-accent-purple to-accent-pink"
  }
];

export default function Landing() {
  return (
    <div className="relative overflow-hidden min-h-screen">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent-blue/10 blur-[120px] rounded-full -z-10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-pink/10 blur-[120px] rounded-full -z-10" />
      <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-accent-purple/10 blur-[120px] rounded-full -z-10" />
      
      <div className="max-w-7xl mx-auto pt-20 pb-32 px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center mb-32">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-accent-blue text-xs font-bold tracking-[0.2em] uppercase mb-8 backdrop-blur-md">
              
              The Future of Social Matching
            </div>
            
            <h1 className="text-7xl md:text-9xl font-display font-black tracking-tighter mb-8 leading-[0.85] uppercase">
              Find Your <br />
              <span className="gradient-text">Campus Vibe.</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-white/40 max-w-xl mb-12 leading-relaxed font-medium">
              The first Compatibility matching platform for students. Connect based on skills, interests, and creative energy.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link 
                to="/signup" 
                className="gradient-btn w-full sm:w-auto flex items-center justify-center gap-2"
              >
                Get Started Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                to="/simulation" 
                className="px-8 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-lg transition-all w-full sm:w-auto text-center backdrop-blur-md"
              >
                Try Simulation
              </Link>
            </div>

            <div className="mt-16 flex items-center gap-8">
              <div className="flex -space-x-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-12 h-12 rounded-full border-2 border-bg overflow-hidden bg-white/10">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} alt="User" />
                  </div>
                ))}
              </div>
              <div className="text-sm font-medium">
                <span className="text-white font-bold">2,000+</span> <span className="text-white/40">students already vibing</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className="relative hidden lg:block"
          >
            <div className="glass-card p-8 relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/10">
                  <img src={profile} alt="User"  />

                </div>
                <div>
                  <h3 className="text-xl font-bold">Avinash</h3>
                  <p className="text-white/40 text-sm">97% Match with you</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-lg bg-accent-blue/20 text-accent-blue text-[10px] font-bold uppercase tracking-widest">Lo-Fi Hip Hop</span>
                  <span className="px-3 py-1 rounded-lg bg-accent-purple/20 text-accent-purple text-[10px] font-bold uppercase tracking-widest">Sci-Fi Movies</span>
                  <span className="px-3 py-1 rounded-lg bg-accent-pink/20 text-accent-pink text-[10px] font-bold uppercase tracking-widest">Coding</span>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-sm text-white/60 italic">
                  "Looking for someone to build cool projects with and share music playlists!"
                </div>
              </div>
            </div>
            {/* Floating elements */}
            <div className="absolute top-[-20px] right-[-20px] w-20 h-20 rounded-2xl bg-accent-pink/20 backdrop-blur-xl border border-white/10 flex items-center justify-center animate-bounce duration-[3000ms]">
              <Heart className="text-accent-pink w-8 h-8 fill-current" />
            </div>
            <div className="absolute bottom-[-30px] left-[-30px] w-24 h-24 rounded-3xl bg-accent-blue/20 backdrop-blur-xl border border-white/10 flex items-center justify-center animate-pulse">
              <Music className="text-accent-blue w-10 h-10" />
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              className="glass-card p-8 hover:border-white/20 transition-all group"
            >
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                <feature.icon className="text-white w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-4 text-white">{feature.title}</h3>
              <p className="text-white/50 leading-relaxed text-sm">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

