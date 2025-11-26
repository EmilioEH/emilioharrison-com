import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import { Menu, X, ArrowRight, Code, User, Mail, ShoppingBag, Send, Smartphone, MousePointer2, Maximize, Minimize, RotateCcw, Play, Pause, Settings2, Activity, FileText, Zap, Grid, Hexagon, Triangle, Circle, Square, Target, BarChart2, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import matter from 'gray-matter';
import { Buffer } from 'buffer';

// Polyfill Buffer for gray-matter in browser
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
}

// --- THEME CONFIGURATION ---
const THEMES = {
  default: {
    id: 'default',
    colors: {
      bg: "bg-[#fdfbf7]",
      text: "text-gray-900",
      primary: "bg-[#2a9d8f]",
      secondary: "bg-[#e76f51]",
      accent: "bg-[#e9c46a]",
      dark: "bg-[#264653]",
      border: "border-black",
      card: "bg-white",
      highlight: "text-[#2a9d8f]",
      shape: "stroke-black"
    },
    font: "font-sans",
    shadow: "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
    shadowHover: "hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all",
    border: "border-2 border-black",
  },
  blueprint: {
    id: 'blueprint',
    colors: {
      bg: "bg-[#002147]",
      text: "text-blue-100",
      primary: "bg-[#004e92]",
      secondary: "bg-[#ff4d4d]",
      accent: "bg-[#ffd700]",
      dark: "bg-[#00152e]",
      border: "border-blue-200",
      card: "bg-[#002a5c]",
      highlight: "text-[#4db8ff]",
      shape: "stroke-blue-300"
    },
    font: "font-mono",
    shadow: "shadow-[4px_4px_0px_0px_rgba(191,219,254,0.3)]",
    shadowHover: "hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(191,219,254,0.3)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all",
    border: "border-2 border-blue-200",
  }
};

// --- REAL CONTENT DATA ---
// Load markdown files
const modules = import.meta.glob('./content/posts/*.md', { as: 'raw', eager: true });

const BLOG_POSTS = Object.keys(modules).map((path, index) => {
  const { data, content } = matter(modules[path]);
  return {
    id: index + 1,
    ...data,
    content,
    slug: path.split('/').pop().replace('.md', '')
  };
}).sort((a, b) => new Date(b.date) - new Date(a.date));

// --- UI COMPONENTS ---
const BrutalButton = ({ children, onClick, color, className = "", type = "button", active = false, theme }) => {
  const bg = color || (theme.id === 'blueprint' ? theme.colors.card : 'bg-white');
  const text = theme.id === 'blueprint' ? 'text-blue-100' : 'text-black';

  return (
    <button
      type={type}
      onClick={onClick}
      className={`
          ${theme.border} ${theme.shadow}
          ${active ? 'translate-x-[4px] translate-y-[4px] shadow-none' : theme.shadowHover}
          ${bg} px-6 py-3 font-bold ${text} flex items-center gap-2
          ${className}
        `}
    >
      {children}
    </button>
  );
};

const BrutalCard = ({ children, className = "", color, theme }) => {
  const bg = color || theme.colors.card;
  return (
    <div className={`${theme.border} ${theme.shadow} ${bg} p-6 ${className}`}>
      {children}
    </div>
  );
};

const SectionTitle = ({ children, theme }) => (
  <h2 className={`text-4xl font-black mb-8 uppercase tracking-tight flex items-center gap-3 ${theme.colors.text}`}>
    <span className={`w-4 h-4 ${theme.id === 'blueprint' ? 'bg-blue-200' : 'bg-black'} block`}></span>
    {children}
  </h2>
);

// --- SECTIONS ---

const Hero = ({ theme }) => {
  const navigate = useNavigate();
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-24 items-center animate-in fade-in duration-700">
      <div className="md:col-span-7 space-y-6">
        <div className={`inline-block ${theme.border} ${theme.colors.accent} px-3 py-1 font-bold text-sm mb-2 transform -rotate-2 text-black`}>
          UX RESEARCHER & CREATIVE TECHNOLOGIST
        </div>
        <h1 className="text-6xl md:text-8xl font-black leading-[0.9] tracking-tighter">
          EMILIO<br />HARRISON
        </h1>
        <p className={`text-xl md:text-2xl max-w-lg leading-relaxed border-l-4 pl-6 ${theme.id === 'blueprint' ? 'border-blue-200 text-blue-200' : 'border-black text-gray-700'}`}>
          Building utility-focused digital tools and exploring "vibe coding"—the intersection of intentionality and system design.
        </p>
        <div className="flex flex-wrap gap-4 pt-4">
          <BrutalButton theme={theme} color={theme.colors.primary} onClick={() => navigate('/lab')}>
            <BeakerIcon size={20} /> View Experiments
          </BrutalButton>
          <BrutalButton theme={theme} onClick={() => navigate('/contact')}>
            <Mail size={20} /> Get in Touch
          </BrutalButton>
        </div>
      </div>

      <div className="md:col-span-5 relative min-h-[400px] flex items-center justify-center">
        <div className="relative w-full h-full max-w-sm mx-auto">
          <div className={`absolute top-0 right-0 w-32 h-32 ${theme.border} ${theme.colors.secondary} rounded-full z-10`}></div>
          <div className={`absolute bottom-10 left-10 w-40 h-40 ${theme.border} ${theme.colors.primary} z-0 transform rotate-12`}></div>
          <div className={`absolute top-20 left-10 w-24 h-24 ${theme.border} ${theme.colors.accent} z-20 transform -rotate-6 flex items-center justify-center font-black text-2xl text-black`}>
            UX
          </div>
          <div className={`absolute bottom-0 right-10 w-full h-24 ${theme.border} ${theme.colors.card} z-10 flex items-center justify-center text-center font-bold`}>
            Utility & Usability
          </div>
        </div>
      </div>
    </div>
  )
};

const BlogList = ({ theme }) => {
  const navigate = useNavigate();
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <SectionTitle theme={theme}>Field Notes</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {BLOG_POSTS.map(post => (
          <BrutalCard key={post.id} theme={theme} className="flex flex-col h-full group cursor-pointer hover:opacity-90 transition-opacity">
            <div className="flex justify-between items-start mb-4">
              <span className={`text-xs font-bold border-2 ${theme.id === 'blueprint' ? 'border-blue-200 bg-blue-900 text-blue-100' : 'border-black bg-yellow-200 text-black'} px-2 py-0.5`}>
                {post.category}
              </span>
              <span className={`text-sm font-medium ${theme.id === 'blueprint' ? 'text-blue-300' : 'text-gray-500'}`}>{post.date}</span>
            </div>
            <h3 className="text-2xl font-black mb-3 leading-tight group-hover:underline decoration-2 underline-offset-2">
              {post.title}
            </h3>
            <p className={`${theme.id === 'blueprint' ? 'text-blue-200' : 'text-gray-600'} mb-6 flex-grow leading-relaxed line-clamp-3`}>
              {post.excerpt}
            </p>
            <button
              onClick={() => navigate(`/fieldnotes/${post.slug}`)}
              className={`flex items-center gap-2 font-bold mt-auto border-b-2 border-transparent w-fit pb-0.5 ${theme.id === 'blueprint' ? 'hover:border-blue-200' : 'hover:border-black'}`}
            >
              Read Article <ArrowRight size={16} />
            </button>
          </BrutalCard>
        ))}
      </div>
    </div>
  )
};

const BlogPost = ({ theme }) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [readMode, setReadMode] = useState('deep');

  const post = BLOG_POSTS.find(p => p.slug === slug);

  if (!post) return <div className="text-center py-20">Post not found</div>;

  return (
    <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-8 duration-500">
      <button onClick={() => navigate('/fieldnotes')} className="mb-8 font-bold flex items-center gap-2 hover:underline">
        <ArrowRight className="rotate-180" size={16} /> Back to Field Notes
      </button>

      <div className={`sticky top-24 z-40 mb-8 p-2 ${theme.colors.card} ${theme.border} ${theme.shadow} flex justify-between items-center transition-all duration-300`}>
        <span className="font-bold text-sm uppercase tracking-widest pl-2 hidden md:block">Reading Mode:</span>
        <div className="flex gap-2 w-full md:w-auto">
          <BrutalButton theme={theme} onClick={() => setReadMode('deep')} active={readMode === 'deep'} color={readMode === 'deep' ? theme.colors.primary : theme.colors.card} className={readMode === 'deep' ? 'text-white' : ''}>
            <FileText size={16} /> Deep Dive
          </BrutalButton>
          <BrutalButton theme={theme} onClick={() => setReadMode('skim')} active={readMode === 'skim'} color={readMode === 'skim' ? theme.colors.accent : theme.colors.card} className={readMode === 'skim' ? 'text-black' : ''}>
            <Zap size={16} /> Skim
          </BrutalButton>
        </div>
      </div>

      <BrutalCard theme={theme} className="p-8 md:p-12 min-h-[60vh] transition-all duration-500">
        <div className={`mb-8 border-b-4 ${theme.id === 'blueprint' ? 'border-blue-200' : 'border-black'} pb-6`}>
          <span className={`inline-block ${theme.colors.accent} border-2 ${theme.id === 'blueprint' ? 'border-blue-200' : 'border-black'} px-3 py-1 font-bold text-sm mb-4 text-black`}>
            {post.category}
          </span>
          <h1 className="text-4xl md:text-6xl font-black mb-4 leading-tight">{post.title}</h1>
          <p className={`${theme.id === 'blueprint' ? 'text-blue-300' : 'text-gray-500'} font-medium`}>Published on {post.date} • By Emilio Harrison</p>
        </div>

        {readMode === 'deep' ? (
          <div className={`prose prose-lg prose-headings:font-black ${theme.id === 'blueprint' ? 'prose-invert prose-p:text-blue-100 prose-headings:text-blue-50' : 'prose-p:text-gray-800'} animate-in fade-in duration-500`}>
            <p className="lead text-xl font-medium mb-6 italic">{post.excerpt}</p>
            <div>
              <ReactMarkdown
                components={{
                  img: ({ node, ...props }) => <img {...props} className="rounded-lg border-2 border-black shadow-lg my-8" />,
                  code: ({ node, inline, className, children, ...props }) => {
                    return !inline ? (
                      <pre className={`bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-6 border-2 ${theme.id === 'blueprint' ? 'border-blue-200' : 'border-black'}`}>
                        <code {...props} className={className}>
                          {children}
                        </code>
                      </pre>
                    ) : (
                      <code {...props} className={`bg-gray-200 text-red-600 px-1 py-0.5 rounded font-mono text-sm`}>
                        {children}
                      </code>
                    )
                  }
                }}
              >
                {post.content}
              </ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="animate-in slide-in-from-right-4 duration-300">
            <div className={`${theme.colors.accent} p-4 border-2 ${theme.id === 'blueprint' ? 'border-blue-200' : 'border-black'} font-black text-xl mb-8 flex items-center gap-2 ${theme.shadow} text-black`}>
              <Zap /> TL;DR — THE UTILITY
            </div>
            <div className="grid gap-6">
              {post.takeaways ? post.takeaways.map((takeaway, idx) => (
                <div key={idx} className="group">
                  <h3 className="text-2xl font-black mb-2 flex items-center gap-3">
                    <span className={`${theme.id === 'blueprint' ? 'bg-blue-200 text-blue-900' : 'bg-black text-white'} w-8 h-8 flex items-center justify-center text-sm rounded-full`}>{idx + 1}</span>
                    {takeaway.title}
                  </h3>
                  <p className={`text-xl leading-relaxed border-l-4 pl-6 py-2 transition-colors ${theme.id === 'blueprint' ? 'border-blue-800 text-blue-100 group-hover:border-blue-400' : 'border-gray-200 text-gray-800 group-hover:border-[#2a9d8f]'}`}>
                    {takeaway.text}
                  </p>
                </div>
              )) : (
                <p>No summary available for this post.</p>
              )}
            </div>
            <div className={`mt-12 p-6 border-2 border-dashed text-center ${theme.id === 'blueprint' ? 'border-blue-200' : 'border-black'}`}>
              <p className={`font-bold mb-4 ${theme.id === 'blueprint' ? 'text-blue-300' : 'text-gray-500'}`}>Interested in the context behind these insights?</p>
              <button onClick={() => setReadMode('deep')} className={`underline font-black text-lg hover:${theme.colors.highlight}`}>
                Switch to Deep Dive
              </button>
            </div>
          </div>
        )}
      </BrutalCard>
    </div>
  );
};

// --- PLACEHOLDER PAGES ---
const Experiments = ({ theme }) => <div className="text-center py-20"><SectionTitle theme={theme}>The Lab</SectionTitle><p>Experiments coming soon...</p></div>;
const Shop = ({ theme }) => <div className="text-center py-20"><SectionTitle theme={theme}>Shop</SectionTitle><p>Shop coming soon...</p></div>;
const Contact = ({ theme }) => <div className="text-center py-20"><SectionTitle theme={theme}>Contact</SectionTitle><p>Get in touch...</p></div>;
const About = ({ theme }) => <div className="text-center py-20"><SectionTitle theme={theme}>About</SectionTitle><p>UX Researcher & Creative Technologist.</p></div>;

// --- LAYOUT ---
const Layout = ({ children, theme, setThemeId }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/about', label: 'About' },
    { path: '/fieldnotes', label: 'Notes' },
    { path: '/lab', label: 'Lab' },
    { path: '/shop', label: 'Shop' },
    { path: '/contact', label: 'Contact' }
  ];

  const isActive = (path) => {
    if (path === '/' && location.pathname !== '/') return false;
    return location.pathname.startsWith(path);
  };

  return (
    <div className={`min-h-screen ${theme.colors.bg} ${theme.colors.text} ${theme.font} transition-colors duration-500 overflow-hidden relative`}>

      {theme.id === 'blueprint' && (
        <div className="fixed inset-0 pointer-events-none opacity-10 z-0" style={{ backgroundImage: 'linear-gradient(#4db8ff 1px, transparent 1px), linear-gradient(90deg, #4db8ff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      )}

      <header className={`sticky top-0 z-50 ${theme.colors.card} border-b-4 ${theme.id === 'blueprint' ? 'border-blue-200' : 'border-black'}`}>
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-20 flex justify-between items-center relative z-10">
          <div onClick={() => navigate('/')} className={`text-2xl font-black tracking-tighter cursor-pointer hover:${theme.colors.highlight} transition-colors`}>EMILIO<span className={theme.colors.highlight}>.</span>HARRISON</div>
          <nav className="hidden md:flex gap-6 items-center">
            {navItems.map(item => (
              <button key={item.path} onClick={() => navigate(item.path)} className={`font-bold uppercase tracking-wide text-sm py-2 border-b-2 ${isActive(item.path) ? (theme.id === 'blueprint' ? 'border-blue-200 text-blue-100' : 'border-black text-black') : 'border-transparent opacity-60 hover:opacity-100'} transition-all`}>{item.label}</button>
            ))}
            <button onClick={() => setThemeId(theme.id === 'default' ? 'blueprint' : 'default')} className={`ml-4 p-2 ${theme.border} rounded-full hover:opacity-80`} title="Toggle Blueprint Mode">
              {theme.id === 'default' ? <Grid size={20} /> : <Settings2 size={20} />}
            </button>
          </nav>
          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>{mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}</button>
        </div>
        {mobileMenuOpen && (
          <div className={`md:hidden border-t-2 ${theme.id === 'blueprint' ? 'border-blue-200' : 'border-black'} ${theme.colors.card} absolute w-full shadow-xl`}>
            {navItems.map(item => (
              <button key={item.path} onClick={() => { navigate(item.path); setMobileMenuOpen(false); }} className={`block w-full text-left px-8 py-4 font-bold uppercase border-b ${theme.id === 'blueprint' ? 'border-blue-800' : 'border-gray-100'}`}>{item.label}</button>
            ))}
            <button onClick={() => setThemeId(theme.id === 'default' ? 'blueprint' : 'default')} className={`block w-full text-left px-8 py-4 font-bold uppercase border-b ${theme.id === 'blueprint' ? 'border-blue-800' : 'border-gray-100'}`}>
              {theme.id === 'default' ? 'Switch to Blueprint Mode' : 'Switch to Paper Mode'}
            </button>
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-8 py-12 min-h-[60vh] relative z-10">
        {children}
      </main>

      <div className={`${theme.colors.dark} text-white p-8 md:p-12 border-t-4 ${theme.id === 'blueprint' ? 'border-blue-200' : 'border-black'} relative z-10`}>
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="md:w-1/2"><h3 className={`text-2xl font-black mb-2 ${theme.id === 'blueprint' ? 'text-[#ffd700]' : 'text-[#e9c46a]'}`}>JOIN THE MAILING LIST</h3><p className="text-gray-200">Get weekly thoughts on UX research, code, and creative experiments.</p></div>
          <div className="md:w-1/2 w-full flex gap-4"><input type="email" placeholder="Enter your email" className={`flex-grow p-3 border-2 ${theme.id === 'blueprint' ? 'border-blue-200 bg-blue-900 text-white' : 'border-black text-black'} font-medium focus:outline-none`} /><BrutalButton theme={theme} color={theme.colors.secondary} className="text-white">Join</BrutalButton></div>
        </div>
      </div>
      <footer className="bg-black text-white py-12 px-4 text-center relative z-10"><div className="font-bold text-2xl tracking-tighter mb-4">EMILIOHARRISON.COM</div><p className="text-gray-500 text-sm">© {new Date().getFullYear()} Emilio Harrison. Built with React & Tailwind.</p></footer>
    </div>
  );
};

export default function App() {
  const [themeId, setThemeId] = useState('default');
  const theme = THEMES[themeId];

  return (
    <BrowserRouter>
      <Layout theme={theme} setThemeId={setThemeId}>
        <Routes>
          <Route path="/" element={<><Hero theme={theme} /><BlogList theme={theme} /></>} />
          <Route path="/about" element={<About theme={theme} />} />
          <Route path="/fieldnotes" element={<BlogList theme={theme} />} />
          <Route path="/fieldnotes/:slug" element={<BlogPost theme={theme} />} />
          <Route path="/lab" element={<Experiments theme={theme} />} />
          <Route path="/shop" element={<Shop theme={theme} />} />
          <Route path="/contact" element={<Contact theme={theme} />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

function BeakerIcon(props) { return <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 3h15" /><path d="M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3" /><path d="M6 14h12" /></svg>; }
