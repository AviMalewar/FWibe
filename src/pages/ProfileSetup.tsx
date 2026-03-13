import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { updateUserProfile } from '../services/authService';
import { storage } from '../firebase/firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, MapPin, GraduationCap, Music, Film, Heart, 
  Code, Target, UserCircle, Clock, Check, ChevronRight, ChevronLeft, Loader2, Camera, Sparkles 
} from 'lucide-react';
import InterestSelector from '../components/InterestSelector';

const SECTIONS = [
  { id: 'basic', title: 'Basic Info', icon: User },
  { id: 'music', title: 'Music', icon: Music },
  { id: 'movies', title: 'Movies', icon: Film },
  { id: 'hobbies', title: 'Hobbies', icon: Heart },
  { id: 'skills', title: 'Skills', icon: Code },
  { id: 'goals', title: 'Goals', icon: Target },
  { id: 'personality', title: 'Personality', icon: UserCircle },
  { id: 'availability', title: 'Availability', icon: Clock },
];

const OPTIONS: Record<string, string[]> = {
  music: ['Lofi', 'Hip Hop', 'Rap', 'Pop', 'Rock', 'EDM', 'Classical', 'Indie', 'Bollywood', 'K-Pop'],
  movies: ['Action', 'Sci-Fi', 'Anime', 'Thriller', 'Comedy', 'Documentary', 'Horror', 'Drama'],
  hobbies: ['Gaming', 'Photography', 'Reading', 'Gym', 'Traveling', 'Coding', 'Blogging', 'Designing'],
  skills: ['Web Development', 'React', 'Node.js', 'UI/UX', 'AI / ML', 'Data Science', 'Cybersecurity', 'App Development'],
  goals: ['Hackathons', 'Startup building', 'Study partners', 'Open source', 'Networking', 'Casual friends'],
  personality: ['Introvert', 'Extrovert', 'Morning person', 'Night owl', 'Solo Study', 'Group Study'],
  availability: ['Weekends', 'Evenings', 'Anytime', 'Mornings']
};

export default function ProfileSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    gender: '' as 'male' | 'female' | 'other',
    college: '',
    course: '',
    year: '',
    location: '',
    bio: '',
    profileImage: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`,
    music: [] as string[],
    movies: [] as string[],
    hobbies: [] as string[],
    skills: [] as string[],
    goals: [] as string[],
    personality: '',
    availability: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleInterestToggle = (category: string, item: string) => {
    setFormData(prev => {
      const current = (prev as any)[category] || [];
      const updated = current.includes(item)
        ? current.filter((i: string) => i !== item)
        : [...current, item];
      return { ...prev, [category]: updated };
    });
  };

  const handleSingleSelect = (category: string, value: string) => {
    setFormData(prev => ({ ...prev, [category]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, profileImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const nextStep = () => {
    // Validation
    const section = SECTIONS[currentStep];
    if (section.id === 'basic') {
      if (!formData.username || !formData.gender || !formData.college || !formData.course || !formData.year || !formData.bio) {
        alert('Please fill in all required fields');
        return;
      }
    } else if (section.id !== 'personality' && section.id !== 'availability') {
      if ((formData as any)[section.id].length === 0) {
        alert('Please select at least one interest');
        return;
      }
    } else {
      if (!(formData as any)[section.id]) {
        alert('Please select an option');
        return;
      }
    }

    if (currentStep < SECTIONS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      console.log("Starting profile setup submission...");
      let profileImageUrl = formData.profileImage;
      const uploadedPhotos: string[] = [];

      if (imageFile) {
        try {
          console.log("Uploading profile image...");
          const storageRef = ref(storage, `profile_images/${user.uid}`);
          
          const uploadPromise = uploadBytes(storageRef, imageFile);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Profile image upload timed out.")), 30000)
          );
          
          const uploadResult = await Promise.race([uploadPromise, timeoutPromise]) as any;
          profileImageUrl = await getDownloadURL(uploadResult.ref);
          console.log("Profile image uploaded successfully:", profileImageUrl);
        } catch (err: any) {
          console.error("Profile image upload failed:", err);
          throw new Error(`Profile image upload failed: ${err.message || 'Unknown error'}`);
        }
      }

      console.log("Saving user profile data to Firestore...");
      await updateUserProfile(user.uid, { 
        ...formData, 
        profileImage: profileImageUrl,
        profileComplete: true,
        collaborationScore: 5.0,
        projectsCount: 0,
        hackathonsCount: 0
      });
      console.log("Profile setup complete!");
      navigate('/dashboard');
    } catch (err: any) {
      console.error("Setup failed:", err);
      setError(err.message || 'An error occurred during setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    const section = SECTIONS[currentStep];
    
    switch (section.id) {
      case 'basic':
        return (
          <div className="space-y-6">
            <div className="flex justify-center mb-8">
              <div className="relative group">
                <div className="w-40 h-40 rounded-[3rem] bg-white/5 border border-white/10 p-2 overflow-hidden shadow-2xl group-hover:border-accent-blue/50 transition-all">
                  <img 
                    src={formData.profileImage} 
                    alt="Avatar" 
                    className="w-full h-full object-cover rounded-[2.5rem]"
                  />
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 p-4 rounded-2xl bg-accent-blue text-white shadow-xl hover:bg-accent-blue/80 transition-all hover:scale-110 active:scale-95"
                >
                  <Camera className="w-6 h-6" />
                </button>
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black">Username</label>
                <input 
                  name="username" 
                  value={formData.username} 
                  onChange={handleInputChange}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white focus:outline-none focus:ring-2 focus:ring-accent-blue/50 font-bold"
                  placeholder="@username"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black">Gender</label>
                <div className="flex gap-2">
                  {['male', 'female', 'other'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        const seed = g === 'female' ? `female-${user?.uid}` : `male-${user?.uid}`;
                        setFormData(prev => ({ 
                          ...prev, 
                          gender: g as any,
                          profileImage: imageFile ? prev.profileImage : `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`
                        }));
                      }}
                      className={`flex-1 p-4 rounded-2xl border transition-all font-black uppercase text-[10px] tracking-widest ${
                        formData.gender === g 
                          ? 'bg-accent-blue border-transparent text-white' 
                          : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black">College</label>
                <input 
                  name="college" 
                  value={formData.college} 
                  onChange={handleInputChange}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white focus:outline-none focus:ring-2 focus:ring-accent-blue/50 font-bold"
                  placeholder="University Name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black">Course</label>
                <input 
                  name="course" 
                  value={formData.course} 
                  onChange={handleInputChange}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white focus:outline-none focus:ring-2 focus:ring-accent-blue/50 font-bold"
                  placeholder="B.Tech CS"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black">Year</label>
                <select 
                  name="year" 
                  value={formData.year} 
                  onChange={handleInputChange}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white focus:outline-none focus:ring-2 focus:ring-accent-blue/50 font-bold appearance-none"
                >
                  <option value="" className="bg-bg">Select Year</option>
                  <option value="1" className="bg-bg">1st Year</option>
                  <option value="2" className="bg-bg">2nd Year</option>
                  <option value="3" className="bg-bg">3rd Year</option>
                  <option value="4" className="bg-bg">4th Year</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black">Bio</label>
              <textarea 
                name="bio" 
                value={formData.bio} 
                onChange={handleInputChange}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white focus:outline-none focus:ring-2 focus:ring-accent-blue/50 h-32 resize-none font-bold"
                placeholder="Tell us about yourself..."
              />
            </div>
          </div>
        );

      case 'personality':
      case 'availability':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {OPTIONS[section.id].map(opt => (
              <button
                key={opt}
                onClick={() => handleSingleSelect(section.id, opt)}
                className={`p-6 rounded-2xl border transition-all text-left font-black tracking-widest uppercase text-xs ${
                  (formData as any)[section.id] === opt 
                    ? 'bg-gradient-to-r from-accent-blue to-accent-purple border-transparent text-white shadow-lg shadow-accent-blue/20 scale-[1.02]' 
                    : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        );

      default:
        return (
          <InterestSelector 
            options={OPTIONS[section.id]} 
            selected={(formData as any)[section.id]} 
            onToggle={(item) => handleInterestToggle(section.id, item)}
          />
        );
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-20 px-4">
      <div className="mb-16">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-blue/10 border border-accent-blue/20 text-accent-blue text-[10px] font-black tracking-[0.2em] uppercase mb-4">
              <Sparkles className="w-3 h-3" />
              Onboarding
            </div>
            <h1 className="text-5xl md:text-6xl font-display font-black tracking-tighter text-white uppercase leading-none">
              SETUP YOUR <span className="gradient-text">PROFILE.</span>
            </h1>
            <p className="text-white/40 text-lg mt-4 font-medium">Let's find your perfect student vibe.</p>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-5xl font-display font-black text-accent-blue leading-none">{currentStep + 1}</span>
            <span className="text-white/20 font-black text-2xl pb-1">/ {SECTIONS.length}</span>
          </div>
        </div>
        
        <div className="flex gap-2">
          {SECTIONS.map((s, i) => (
            <div 
              key={s.id} 
              className={`h-2 flex-1 rounded-full transition-all duration-700 ${
                i <= currentStep ? 'bg-gradient-to-r from-accent-blue to-accent-purple' : 'bg-white/5'
              }`}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="glass-card p-8 md:p-12 min-h-[500px] flex flex-col"
        >
          {error && (
            <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm font-bold flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {error}
            </div>
          )}
          <div className="flex items-center gap-6 mb-12">
            <div className="w-16 h-16 rounded-2xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center text-accent-blue shadow-xl">
              {(() => {
                const Icon = SECTIONS[currentStep].icon;
                return <Icon className="w-8 h-8" />;
              })()}
            </div>
            <div>
              <h2 className="text-3xl font-display font-black text-white uppercase tracking-tight">{SECTIONS[currentStep].title}</h2>
              <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mt-1">Step {currentStep + 1} of {SECTIONS.length}</p>
            </div>
          </div>

          <div className="flex-1">
            {renderStep()}
          </div>

          <div className="flex items-center justify-between mt-16 gap-6">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 text-white flex items-center justify-center hover:bg-white/10 transition-all disabled:opacity-0 group"
            >
              <ChevronLeft className="w-8 h-8 group-hover:-translate-x-1 transition-transform" />
            </button>
            
            <button
              onClick={nextStep}
              disabled={loading}
              className="flex-1 h-20 rounded-3xl bg-gradient-to-r from-accent-blue via-accent-purple to-accent-pink text-white font-black tracking-[0.2em] text-xs shadow-xl shadow-accent-purple/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-4 group"
            >
              {loading ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span>UPLOADING DATA...</span>
                </div>
              ) : (
                <>
                  {currentStep === SECTIONS.length - 1 ? 'COMPLETE SETUP' : 'NEXT STEP'}
                  <ChevronRight className="w-8 h-8 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
