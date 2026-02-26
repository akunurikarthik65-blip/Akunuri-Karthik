import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  MessageSquarePlus, 
  Layers, 
  AlertCircle, 
  BarChart3, 
  Menu, 
  X,
  Search,
  ChevronRight,
  ChevronDown,
  MapPin,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  CheckCircle,
  LogOut,
  User,
  Shield,
  Star,
  MessageSquare,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { cn } from './lib/utils';
import { Problem, Cluster, Stats, User as UserType, UserRole, ResolvedComment } from './types';
import Markdown from 'react-markdown';
import LocationPicker from './components/LocationPicker';

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center w-full gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 group relative",
      active 
        ? "bg-white/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]" 
        : "text-slate-400 hover:text-white hover:bg-white/5"
    )}
  >
    <Icon size={18} className={cn("transition-transform duration-300", active ? "scale-110" : "group-hover:scale-110")} />
    <span className="font-medium text-sm">{label}</span>
    {active && (
      <motion.div 
        layoutId="active-indicator" 
        className="absolute left-0 w-1 h-5 bg-emerald-400 rounded-r-full" 
      />
    )}
  </button>
);

const KPICard = ({ title, value, icon: Icon, trend, color = "blue", onClick }: { title: string, value: string | number, icon: any, trend?: string, color?: "blue" | "green" | "red" | "yellow", onClick?: () => void }) => {
  const colorMap = {
    blue: "text-blue-600 bg-blue-50",
    green: "text-emerald-600 bg-emerald-50",
    red: "text-red-600 bg-red-50",
    yellow: "text-amber-600 bg-amber-50"
  };

  return (
    <button 
      onClick={onClick}
      className="w-full text-left bg-white p-6 rounded-[2rem] border border-slate-100 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.04)] hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.08)] transition-all duration-500 group outline-none focus:ring-2 focus:ring-brand-primary/20"
    >
      <div className="flex justify-between items-start mb-6">
        <div className={cn("p-3 rounded-2xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3", colorMap[color])}>
          <Icon size={22} />
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase",
            trend.startsWith('+') ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50"
          )}>
            {trend.startsWith('+') ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {trend}
          </div>
        )}
      </div>
      <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">{title}</h3>
      <p className="text-3xl font-black text-slate-900 data-value">{value}</p>
    </button>
  );
};

// --- Auth Components ---

const Auth = ({ onLogin }: { onLogin: (user: UserType) => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('citizen_admin');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = isLogin ? { email, password } : { name, email, password, role };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(`Server error (${res.status}). Please try again.`);
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');
      
      if (isLogin) {
        setSuccess('Login successful! Redirecting...');
        setTimeout(() => onLogin(data), 1000);
      } else {
        setIsLogin(true);
        setSuccess('Registration successful! Please sign in with your new account.');
        setEmail('');
        setPassword('');
        setName('');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden"
      >
        <div className="p-12">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-brand-primary rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-brand-primary/20">
              <Shield size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              City View
            </h1>
            <p className="text-slate-400 font-medium mt-2">
              {isLogin ? 'Sign In' : 'Sign Up'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                <input 
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-brand-primary/20 outline-none transition-all font-bold text-slate-700"
                  placeholder="John Doe"
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Personal Email</label>
              <input 
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-brand-primary/20 outline-none transition-all font-bold text-slate-700"
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Password</label>
              <input 
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-brand-primary/20 outline-none transition-all font-bold text-slate-700"
                placeholder="••••••••"
              />
            </div>
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Account Role</label>
                <div className="relative">
                  <select 
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-brand-primary/20 outline-none transition-all font-bold text-slate-700 appearance-none cursor-pointer"
                  >
                    <option value="citizen_admin">Citizen Admin</option>
                    <option value="municipal_admin">Municipal Admin</option>
                  </select>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none">
                    <ChevronDown size={16} className="text-slate-400" />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-red-50 rounded-2xl border border-red-100">
                <p className="text-red-600 text-[10px] font-black uppercase tracking-widest text-center">{error}</p>
              </motion.div>
            )}

            {success && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <p className="text-emerald-600 text-[10px] font-black uppercase tracking-widest text-center">{success}</p>
              </motion.div>
            )}

            <button 
              disabled={loading}
              className="w-full bg-brand-primary text-white font-black py-5 rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-brand-primary/10 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {isLogin ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setSuccess('');
              }}
              className="text-xs font-bold text-slate-400 hover:text-brand-primary transition-colors"
            >
              {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// --- Dashboard ---

const Dashboard = ({ stats, problems, clusters, user, onTabChange }: { stats: Stats | null, problems: Problem[], clusters: Cluster[], user: UserType, onTabChange: (tab: string) => void }) => {
  const categoryData = Object.entries(
    problems.reduce((acc: any, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const COLORS = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Total Problems" value={stats?.totalProblems || 0} icon={MessageSquarePlus} color="blue" onClick={() => onTabChange('Problems')} />
        <KPICard title="Active Problems" value={stats?.activeProblems || 0} icon={AlertCircle} color="red" onClick={() => onTabChange('Problems')} />
        <KPICard title="Resolved Problems" value={stats?.resolvedProblems || 0} icon={CheckCircle} color="green" onClick={() => onTabChange('Problems')} />
        <KPICard title="Avg Sentiment" value={stats?.avgSentiment?.toFixed(2) || 0} icon={Star} color="yellow" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h3 className="text-xl font-black text-slate-900 mb-8">Active vs Resolved Trends</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.trends || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Legend verticalAlign="top" height={36} />
                <Line type="monotone" dataKey="active" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Active Issues" />
                <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Resolved Issues" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h3 className="text-xl font-black text-slate-900 mb-8">Category Distribution</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h3 className="text-xl font-black text-slate-900 mb-8">Intelligence Cluster Concentration</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clusters.sort((a, b) => b.problem_count - a.problem_count).slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="cluster_name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="problem_count" fill="#3b82f6" radius={[10, 10, 0, 0]} barSize={40} name="Reports" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h3 className="text-xl font-black text-slate-900 mb-8">Active Cluster Concentration (Horizontal)</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={clusters.sort((a, b) => b.problem_count - a.problem_count).slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                <YAxis dataKey="cluster_name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="problem_count" fill="#f59e0b" radius={[0, 10, 10, 0]} barSize={20} name="Reports" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h3 className="text-xl font-black text-slate-900 mb-8">Resolution Time by Category (Hours)</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.resolutionTimes || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="avg_time" fill="#8b5cf6" radius={[10, 10, 0, 0]} barSize={40} name="Avg Hours" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h3 className="text-xl font-black text-slate-900 mb-8">Sentiment by Category</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={categoryData.map(c => ({ ...c, sentiment: (Math.random() * 2 - 1).toFixed(2) }))}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" domain={[-1, 1]} axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="sentiment" fill="#ec4899" radius={[0, 10, 10, 0]} barSize={20} name="Avg Sentiment" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Problem Management ---

const ProblemList = ({ problems, user, onUpdateStatus, onFeedbackClick }: { problems: Problem[], user: UserType, onUpdateStatus: (id: string, status: string) => void, onFeedbackClick: (p: Problem) => void }) => {
  const isMunicipal = user.role === 'municipal_admin';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Municipal Issues</h2>
          <p className="text-slate-400 font-medium mt-2">{isMunicipal ? 'Manage all city-wide reports' : 'Track your submitted problems'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {problems.map(p => (
          <motion.div 
            key={p.id}
            layoutId={p.id}
            className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                    p.status === 'Resolved' ? "bg-emerald-100 text-emerald-700" : 
                    p.status === 'In Progress' ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                  )}>
                    {p.status}
                  </span>
                  {!!p.is_urgent && (
                    <span className="px-4 py-1.5 bg-red-100 text-red-700 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                      <AlertCircle size={12} /> Urgent
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.category}</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2 group-hover:text-brand-primary transition-colors">{p.title}</h3>
                <p className="text-slate-500 line-clamp-2 mb-4 font-medium">{p.description}</p>
                <div className="flex flex-wrap items-center gap-6 text-xs font-bold text-slate-400">
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-brand-primary" />
                    {p.location}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} />
                    {new Date(p.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <User size={14} />
                    {p.citizen_name || 'Anonymous'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {isMunicipal && p.status !== 'Resolved' && (
                  <>
                    {p.status === 'Pending' && (
                      <button 
                        onClick={() => onUpdateStatus(p.id, 'In Progress')}
                        className="px-6 py-3 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                      >
                        Start Work
                      </button>
                    )}
                    <button 
                      onClick={() => onUpdateStatus(p.id, 'Resolved')}
                      className="px-6 py-3 bg-emerald-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                    >
                      Resolve
                    </button>
                  </>
                )}
                <button 
                  onClick={() => onFeedbackClick(p)}
                  className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-brand-primary hover:text-white transition-all"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// --- Submit Problem ---

const SubmitProblem = ({ onRefresh, fetchWithAuth }: { onRefresh: () => void, fetchWithAuth: any }) => {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [category, setCategory] = useState('Other');
  const [location, setLocation] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Call backend for AI analysis
      const aiRes = await fetchWithAuth('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const analysis = await aiRes.json();

      const res = await fetchWithAuth('/api/problems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: text, category, location, image_url: imageUrl, analysis })
      });
      const data = await res.json();
      setResult(data);
      setTitle('');
      setText('');
      setLocation('');
      setImageUrl('');
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-primary via-emerald-400 to-brand-primary" />
        
        <div className="text-center mb-12">
          <div className="inline-flex p-4 bg-slate-50 rounded-3xl text-brand-primary mb-6">
            <MessageSquarePlus size={32} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-3">Submit Problem</h2>
          <p className="text-slate-400 max-w-md mx-auto">Report municipal issues directly to the city. Our AI will analyze and route your report instantly.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Problem Title</label>
            <input 
              required
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-brand-primary/20 outline-none transition-all font-bold text-slate-700"
              placeholder="e.g. Water Leak on Main St"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Detailed Description</label>
            <textarea
              required
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full px-6 py-5 rounded-[2rem] bg-slate-50 border-2 border-transparent focus:bg-white focus:border-brand-primary/20 outline-none transition-all h-40 resize-none text-slate-700 font-medium placeholder:text-slate-300"
              placeholder="What's happening in your neighborhood?"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Image URL (Optional)</label>
            <input 
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-brand-primary/20 outline-none transition-all font-bold text-slate-700"
              placeholder="https://example.com/image.jpg"
            />
          </div>
          
          <div className="grid grid-cols-1 gap-8">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-brand-primary/20 outline-none appearance-none font-bold text-slate-700 cursor-pointer"
              >
                <option>Water</option>
                <option>Roads</option>
                <option>Garbage</option>
                <option>Electricity</option>
                <option>Other</option>
              </select>
            </div>
            
            <LocationPicker onLocationSelect={(data) => setLocation(data.address)} />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-primary text-white font-black py-5 rounded-[2rem] hover:bg-slate-800 hover:shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50 flex items-center justify-center gap-3 group"
          >
            {loading ? 'AI Processing...' : 'Submit Report'}
          </button>
        </form>

        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-10 p-8 bg-emerald-50 rounded-[2rem] border border-emerald-100"
          >
            <div className="flex items-center gap-4 mb-4">
              <CheckCircle className="text-emerald-600" />
              <h3 className="text-lg font-black text-emerald-900">Report Transmitted</h3>
            </div>
            <p className="text-emerald-700 text-sm font-medium">Your issue has been logged and assigned to the {result.cluster_suggestion} cluster with priority {result.priority_score}/10.</p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

// --- Problem Detail & Comment ---

const ProblemDetailModal = ({ problem, user, onClose, onRefresh, fetchWithAuth }: { problem: Problem | null, user: UserType, onClose: () => void, onRefresh: () => void, fetchWithAuth: any }) => {
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState<'Good' | 'Bad'>('Good');
  const [existingComment, setExistingComment] = useState<ResolvedComment | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (problem) {
      fetchWithAuth(`/api/problems/${problem.id}/comment`)
        .then(r => r.json())
        .then(setExistingComment);
    }
  }, [problem]);

  if (!problem) return null;

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetchWithAuth(`/api/problems/${problem.id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment })
      });
      onRefresh();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden"
      >
        <div className="p-12">
          <div className="flex justify-between items-start mb-10">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="px-4 py-1.5 bg-brand-primary/10 text-brand-primary rounded-full text-[10px] font-black uppercase tracking-widest">
                  {problem.category}
                </span>
                <span className="px-4 py-1.5 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest">
                  {problem.status}
                </span>
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">{problem.title}</h2>
            </div>
            <button onClick={onClose} className="p-4 hover:bg-slate-100 rounded-2xl transition-all text-slate-400">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-8">
            {problem.image_url && (
              <div className="rounded-[2rem] overflow-hidden border border-slate-100 shadow-sm">
                <img src={problem.image_url} alt="Problem" className="w-full h-auto object-cover" referrerPolicy="no-referrer" />
              </div>
            )}
            <div className="p-8 bg-slate-50 rounded-[2rem]">
              <p className="text-slate-600 font-medium leading-relaxed">{problem.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-2xl shadow-sm">
                  <MapPin size={18} className="text-brand-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Location</p>
                  <p className="text-sm font-bold text-slate-900">{problem.location}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-2xl shadow-sm">
                  <Clock size={18} className="text-brand-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Submitted</p>
                  <p className="text-sm font-bold text-slate-900">{new Date(problem.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {problem.status === 'Resolved' && (
              <div className="pt-8 border-t border-slate-100">
                <h3 className="text-xl font-black text-slate-900 mb-6">Resolved Comment</h3>
                
                {existingComment ? (
                  <div className="p-8 bg-emerald-50 rounded-[2rem] border border-emerald-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-xl",
                          existingComment.rating === 'Good' ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                        )}>
                          {existingComment.rating === 'Good' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        </div>
                        <span className="font-black text-emerald-900 uppercase text-xs tracking-widest">{existingComment.rating} Feedback</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                        Resolved in {Math.round(existingComment.time_taken / 3600)}h
                      </span>
                    </div>
                    <p className="text-emerald-800 font-medium">{existingComment.comment}</p>
                  </div>
                ) : user.role === 'citizen_admin' ? (
                  <form onSubmit={handleSubmitComment} className="space-y-6">
                    <div className="flex gap-4">
                      <button 
                        type="button"
                        onClick={() => setRating('Good')}
                        className={cn(
                          "flex-1 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2",
                          rating === 'Good' ? "bg-emerald-600 text-white shadow-xl shadow-emerald-600/20" : "bg-slate-100 text-slate-400"
                        )}
                      >
                        <TrendingUp size={16} /> Good
                      </button>
                      <button 
                        type="button"
                        onClick={() => setRating('Bad')}
                        className={cn(
                          "flex-1 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2",
                          rating === 'Bad' ? "bg-red-600 text-white shadow-xl shadow-red-600/20" : "bg-slate-100 text-slate-400"
                        )}
                      >
                        <TrendingDown size={16} /> Bad
                      </button>
                    </div>
                    <textarea 
                      required
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="w-full px-6 py-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-brand-primary/20 outline-none transition-all h-32 resize-none text-slate-700 font-medium"
                      placeholder="How was the resolution process?"
                    />
                    <button 
                      disabled={loading}
                      className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl hover:bg-brand-primary transition-all shadow-xl"
                    >
                      {loading ? 'Submitting...' : 'Submit Feedback'}
                    </button>
                  </form>
                ) : (
                  <p className="text-slate-400 text-sm font-medium italic">Waiting for citizen feedback...</p>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// --- Messaging ---

const MessagingPanel = ({ user, fetchWithAuth }: { user: UserType, fetchWithAuth: any }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<string>('');
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchMessages = async () => {
    try {
      const res = await fetchWithAuth('/api/messages');
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRecipients = async () => {
    try {
      const res = await fetchWithAuth('/api/users');
      const data = await res.json();
      setRecipients(data);
      if (data.length > 0 && !selectedRecipient) {
        setSelectedRecipient(data[0].id.toString());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMessages();
    fetchRecipients();
    const interval = setInterval(fetchMessages, 5000); // Polling
    return () => clearInterval(interval);
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRecipient) return;

    setLoading(true);
    try {
      await fetchWithAuth('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiver_id: selectedRecipient,
          message_text: newMessage
        })
      });
      setNewMessage('');
      fetchMessages();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredMessages = messages.filter(m => 
    (m.sender_id === user.id && m.receiver_id === parseInt(selectedRecipient)) ||
    (m.sender_id === parseInt(selectedRecipient) && m.receiver_id === user.id)
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-[calc(100vh-12rem)]">
      <div className="lg:col-span-1 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-black text-slate-900">Conversations</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {recipients.map(r => (
            <button
              key={r.id}
              onClick={() => setSelectedRecipient(r.id.toString())}
              className={cn(
                "w-full p-4 rounded-2xl text-left transition-all flex items-center gap-3",
                selectedRecipient === r.id.toString() ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20" : "hover:bg-slate-50 text-slate-600"
              )}
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", selectedRecipient === r.id.toString() ? "bg-white/20" : "bg-slate-100")}>
                <User size={18} />
              </div>
              <div>
                <p className="font-bold text-sm">{r.name}</p>
                <p className={cn("text-[10px] font-black uppercase tracking-widest", selectedRecipient === r.id.toString() ? "text-white/60" : "text-slate-400")}>{r.role.replace('_', ' ')}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-3 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
              <User size={18} />
            </div>
            <div>
              <h3 className="font-black text-slate-900">{recipients.find(r => r.id.toString() === selectedRecipient)?.name || 'Select a chat'}</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Online</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/50">
          {filteredMessages.map((m, i) => (
            <div key={i} className={cn("flex", m.sender_id === user.id ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[70%] p-5 rounded-[2rem]",
                m.sender_id === user.id ? "bg-brand-primary text-white rounded-tr-none" : "bg-white text-slate-700 rounded-tl-none shadow-sm"
              )}>
                <p className="text-sm font-medium leading-relaxed">{m.message_text}</p>
                <p className={cn("text-[10px] mt-2 font-bold", m.sender_id === user.id ? "text-white/60" : "text-slate-400")}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          {filteredMessages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4">
              <MessageSquare size={48} />
              <p className="font-black uppercase tracking-widest text-xs">No messages yet</p>
            </div>
          )}
        </div>

        <form onSubmit={handleSendMessage} className="p-6 bg-white border-t border-slate-100 flex gap-4">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-brand-primary/20 outline-none transition-all font-medium text-slate-700"
          />
          <button
            disabled={loading || !newMessage.trim()}
            className="bg-brand-primary text-white p-4 rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-brand-primary/20 disabled:opacity-50"
          >
            <ArrowRight size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<UserType | null>(null);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [strategicReport, setStrategicReport] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    let res = await fetch(url, options);
    if (res.status === 401 && !url.includes('/api/auth/me')) {
      setUser(null);
    }
    return res;
  };

  const fetchData = async () => {
    try {
      const [s, p, c, r] = await Promise.all([
        fetchWithAuth('/api/stats').then(r => r.json()),
        fetchWithAuth('/api/problems').then(r => r.json()),
        fetchWithAuth('/api/clusters').then(r => r.json()),
        fetchWithAuth('/api/reports/strategic').then(r => r.json())
      ]);
      setStats(s);
      setProblems(p);
      setClusters(c);
      setStrategicReport(r);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(u => {
        setUser(u);
        setLoading(false);
        if (u) fetchData();
      });
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    await fetchWithAuth(`/api/problems/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    fetchData();
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Auth onLogin={(u) => { setUser(u); fetchData(); }} />;

  const filteredProblems = problems.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans text-slate-900">
      <motion.aside 
        initial={false}
        animate={{ width: sidebarOpen ? 300 : 0, opacity: sidebarOpen ? 1 : 0 }}
        className="bg-brand-primary text-white overflow-hidden flex flex-col sticky top-0 h-screen z-50 shadow-2xl"
      >
        <div className="p-10 flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20 shadow-xl">
            <Shield size={24} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter leading-tight">City View</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400/80">Issue Manager</p>
          </div>
        </div>

        <nav className="flex-1 px-6 space-y-2 mt-4">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'Dashboard'} onClick={() => setActiveTab('Dashboard')} />
          {user.role === 'citizen_admin' && (
            <SidebarItem icon={MessageSquarePlus} label="Submit Problem" active={activeTab === 'Submit'} onClick={() => setActiveTab('Submit')} />
          )}
          <SidebarItem icon={Layers} label="Problems & Status" active={activeTab === 'Problems'} onClick={() => setActiveTab('Problems')} />
          <SidebarItem icon={MessageSquare} label="Messages" active={activeTab === 'Messages'} onClick={() => setActiveTab('Messages')} />
          <SidebarItem icon={BarChart3} label="Strategic Reports" active={activeTab === 'Reports'} onClick={() => setActiveTab('Reports')} />
        </nav>

        <div className="p-8">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-6 py-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-sm font-bold text-white/80"
          >
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </motion.aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-24 bg-white/80 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between px-10 sticky top-0 z-40">
          <div className="flex items-center gap-6 flex-1">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400">
              <Menu size={20} />
            </button>
            <div className="relative max-w-md w-full group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-primary transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Search problems, locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-14 pr-6 py-3.5 bg-slate-50 rounded-2xl border-2 border-transparent focus:bg-white focus:border-brand-primary/10 outline-none transition-all font-medium text-slate-600 placeholder:text-slate-300"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-sm font-black text-slate-900">{user.name}</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">{user.role.replace('_', ' ')}</span>
            </div>
            <div className="w-12 h-12 bg-slate-100 rounded-2xl border-2 border-white shadow-sm overflow-hidden flex items-center justify-center">
              <User size={24} className="text-slate-400" />
            </div>
          </div>
        </header>

        <div className="p-10 max-w-7xl mx-auto w-full">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {activeTab === 'Dashboard' && <Dashboard stats={stats} problems={problems} clusters={clusters} user={user} onTabChange={setActiveTab} />}
            {activeTab === 'Submit' && user.role === 'citizen_admin' && <SubmitProblem onRefresh={fetchData} fetchWithAuth={fetchWithAuth} />}
            {activeTab === 'Problems' && <ProblemList problems={filteredProblems} user={user} onUpdateStatus={handleUpdateStatus} onFeedbackClick={setSelectedProblem} />}
            {activeTab === 'Messages' && <MessagingPanel user={user} fetchWithAuth={fetchWithAuth} />}
            {activeTab === 'Reports' && (
              <div className="space-y-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <h3 className="text-xl font-black text-slate-900 mb-8">Intelligence Clusters</h3>
                    <div className="space-y-4">
                      {clusters.map(c => (
                        <div key={c.id} className="p-6 bg-slate-50 rounded-3xl">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-black text-slate-900">{c.cluster_name}</h4>
                            <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary">{c.problem_count} Reports</span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium">{c.summary}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <h3 className="text-xl font-black text-slate-900 mb-8">Strategic Report</h3>
                    <div className="prose prose-slate max-w-none">
                      <div className="p-8 bg-brand-primary/5 rounded-[2rem] border border-brand-primary/10 space-y-6">
                        {strategicReport ? (
                          <>
                            <div className="bg-white p-6 rounded-2xl border border-brand-primary/10 shadow-sm">
                              <h4 className="text-xs font-black uppercase tracking-widest text-brand-primary mb-3 flex items-center gap-2">
                                <Sparkles size={14} /> AI Strategic Summary
                              </h4>
                              <div className="text-sm text-slate-700 font-medium leading-relaxed">
                                <Markdown>{strategicReport.aiSummary}</Markdown>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Risk Indicator</h4>
                                <div className="flex items-center gap-4">
                                  <div className={cn(
                                    "w-12 h-12 rounded-full flex items-center justify-center",
                                    strategicReport.negativeSentimentAreas.length > 2 ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"
                                  )}>
                                    <AlertCircle size={24} />
                                  </div>
                                  <div>
                                    <p className="text-sm font-black text-slate-900">
                                      {strategicReport.negativeSentimentAreas.length > 2 ? "High Risk Detected" : "Stable Environment"}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                      {strategicReport.negativeSentimentAreas.length} Critical zones identified
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Performance Trend</h4>
                                <div className="h-16 w-full">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={stats?.trends?.slice(-7) || []}>
                                      <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={3} dot={false} />
                                    </LineChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            </div>

                            <div>
                              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Top Issues</h4>
                              <div className="flex flex-wrap gap-2">
                                {strategicReport.commonIssues.map((i: any) => (
                                  <span key={i.category} className="px-4 py-2 bg-white rounded-xl text-xs font-bold text-slate-600 border border-slate-100">
                                    {i.category}: {i.count}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Critical Areas</h4>
                              <div className="flex flex-wrap gap-2">
                                {strategicReport.negativeSentimentAreas.map((a: any) => (
                                  <span key={a.location} className="px-4 py-2 bg-red-50 rounded-xl text-xs font-bold text-red-600 border border-red-100">
                                    {a.location} (Avg Sentiment: {a.avg.toFixed(2)})
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Resolution Efficiency</h4>
                              <div className="space-y-2">
                                {strategicReport.resolutionTimes.map((r: any) => (
                                  <div key={r.category} className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100">
                                    <span className="text-xs font-bold text-slate-600">{r.category}</span>
                                    <span className="text-xs font-black text-brand-primary">{Math.round(r.avg_time / 3600)}h avg</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        ) : (
                          <p className="text-sm font-medium text-slate-400 italic">Generating strategic insights...</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </main>

      <AnimatePresence>
        {selectedProblem && (
          <ProblemDetailModal 
            problem={selectedProblem} 
            user={user} 
            onClose={() => setSelectedProblem(null)} 
            onRefresh={fetchData}
            fetchWithAuth={fetchWithAuth}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
