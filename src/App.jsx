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
// --- EXPERIMENTS (MazeGame, LifeSim, FittsLaw) ---
const MazeGame = ({ theme }) => {
  const canvasRef = useRef(null); const containerRef = useRef(null);
  const [started, setStarted] = useState(false); const [status, setStatus] = useState("Start to play");
  const [permission, setPermission] = useState(false); const [fullScreen, setFullScreen] = useState(false);
  const [sensorsActive, setSensorsActive] = useState(false);
  const gameState = useRef({ ball: { x: 50, y: 50, vx: 0, vy: 0 }, tilt: { x: 0, y: 0 }, walls: [], goal: {}, won: false, grid: [], r: 11, c: 15 });

  const generateMazeGrid = (w, h) => {
    const maze = Array(h).fill().map(() => Array(w).fill(1));
    let stack = [[1, 1]], dx = [0, 0, -2, 2], dy = [-2, 2, 0, 0]; maze[1][1] = 0;
    while (stack.length) {
      let [cx, cy] = stack[stack.length - 1], dirs = [];
      for (let i = 0; i < 4; i++) { let nx = cx + dx[i], ny = cy + dy[i]; if (nx > 0 && nx < w - 1 && ny > 0 && ny < h - 1 && maze[ny][nx] === 1) dirs.push(i); }
      if (dirs.length) { let d = dirs[Math.floor(Math.random() * dirs.length)], nx = cx + dx[d], ny = cy + dy[d]; maze[ny][nx] = 0; maze[cy + dy[d] / 2][cx + dx[d] / 2] = 0; stack.push([nx, ny]); } else stack.pop();
    }
    maze[1][1] = 2; maze[h - 2][w - 2] = 3; return maze;
  };
  const init = () => gameState.current.grid = generateMazeGrid(gameState.current.c, gameState.current.r);
  const layout = (w, h) => {
    const { grid, r, c } = gameState.current; if (!grid.length) return;
    const cw = w / c, ch = h / r; gameState.current.walls = [];
    for (let y = 0; y < r; y++)for (let x = 0; x < c; x++) {
      if (grid[y][x] === 1) gameState.current.walls.push({ x: x * cw, y: y * ch, w: cw, h: ch });
      else if (grid[y][x] === 2) { gameState.current.ball.x = x * cw + cw / 2; gameState.current.ball.y = y * ch + ch / 2; }
      else if (grid[y][x] === 3) gameState.current.goal = { x: x * cw, y: y * ch, w: cw, h: ch };
    }
  };
  const handleRestart = () => { init(); if (canvasRef.current) layout(canvasRef.current.width, canvasRef.current.height); gameState.current.won = false; gameState.current.tilt = { x: 0, y: 0 }; };
  const start = async () => {
    init();
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try { const p = await DeviceOrientationEvent.requestPermission(); if (p === 'granted') { setPermission(true); setStatus("Tilt to play"); } } catch (e) { setStatus("Swipe to play"); }
    } else { setPermission(true); setStatus("Tilt/Swipe/Mouse"); }
    setStarted(true);
  };

  useEffect(() => {
    if (!started || !containerRef.current) return;
    const obs = new ResizeObserver(e => { const { width, height } = e[0].contentRect; if (canvasRef.current) { canvasRef.current.width = width; canvasRef.current.height = height; layout(width, height); } });
    obs.observe(containerRef.current);
    const fs = () => setFullScreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', fs);
    return () => { obs.disconnect(); document.removeEventListener('fullscreenchange', fs); };
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const cvs = canvasRef.current, ctx = cvs.getContext('2d');
    const ori = (e) => { if ((e.gamma && Math.abs(e.gamma) > 1) || (e.beta && Math.abs(e.beta) > 1)) setSensorsActive(true); gameState.current.tilt = { x: (e.gamma || 0) / 45, y: (e.beta || 0) / 45 } };
    const move = (e) => { if (!permission) { const r = cvs.getBoundingClientRect(); gameState.current.tilt = { x: (e.clientX - r.left - r.width / 2) / (r.width / 4), y: (e.clientY - r.top - r.height / 2) / (r.height / 4) } } };
    const touch = (e) => { e.preventDefault(); const r = cvs.getBoundingClientRect(); const t = e.touches[0]; gameState.current.tilt = { x: Math.max(-1, Math.min(1, (t.clientX - r.left - r.width / 2) / (r.width / 4))), y: Math.max(-1, Math.min(1, (t.clientY - r.top - r.height / 2) / (r.height / 4))) } };

    window.addEventListener('deviceorientation', ori); cvs.addEventListener('mousemove', move); cvs.addEventListener('touchmove', touch, { passive: false }); cvs.addEventListener('touchstart', touch, { passive: false }); cvs.addEventListener('touchend', () => { gameState.current.tilt = { x: 0, y: 0 } });

    let af;
    const loop = () => {
      const s = gameState.current;
      if (s.won) {
        ctx.fillStyle = theme.colors.bg; ctx.fillRect(0, 0, cvs.width, cvs.height);
        ctx.fillStyle = theme.id === 'blueprint' ? '#4db8ff' : '#e9c46a';
        ctx.font = 'bold 30px monospace'; ctx.textAlign = 'center'; ctx.fillText("NICE VIBES!", cvs.width / 2, cvs.height / 2);
        ctx.font = '16px monospace'; ctx.fillText("Tap restart", cvs.width / 2, cvs.height / 2 + 30);
        af = requestAnimationFrame(loop); return;
      }
      if (!fullScreen && containerRef.current) containerRef.current.style.transform = `perspective(1000px) rotateX(${-s.tilt.y * 10}deg) rotateY(${s.tilt.x * 10}deg) scale(0.98)`;
      else if (containerRef.current) containerRef.current.style.transform = 'none';

      s.ball.vx += Math.max(-1, Math.min(1, s.tilt.x)) * 0.5; s.ball.vy += Math.max(-1, Math.min(1, s.tilt.y)) * 0.5;
      s.ball.vx *= 0.9; s.ball.vy *= 0.9;
      let nx = s.ball.x + s.ball.vx, ny = s.ball.y + s.ball.vy;
      for (let w of s.walls) { if (nx + 8 > w.x && nx - 8 < w.x + w.w && s.ball.y + 8 > w.y && s.ball.y - 8 < w.y + w.h) { s.ball.vx *= -0.5; nx = s.ball.x; } } s.ball.x = nx;
      for (let w of s.walls) { if (s.ball.x + 8 > w.x && s.ball.x - 8 < w.x + w.w && ny + 8 > w.y && ny - 8 < w.y + w.h) { s.ball.vy *= -0.5; ny = s.ball.y; } } s.ball.y = ny;
      if (s.ball.x > s.goal.x && s.ball.x < s.goal.x + s.goal.w && s.ball.y > s.goal.y && s.ball.y < s.goal.y + s.goal.h) s.won = true;

      ctx.clearRect(0, 0, cvs.width, cvs.height);
      ctx.fillStyle = theme.id === 'blueprint' ? '#004e92' : '#264653'; for (let w of s.walls) ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.fillStyle = theme.id === 'blueprint' ? '#ffd700' : '#e9c46a'; ctx.fillRect(s.goal.x, s.goal.y, s.goal.w, s.goal.h);
      ctx.fillStyle = theme.id === 'blueprint' ? '#ff4d4d' : '#e76f51'; ctx.beginPath(); ctx.arc(s.ball.x, s.ball.y, 8, 0, Math.PI * 2); ctx.fill();
      af = requestAnimationFrame(loop);
    };
    af = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(af);
  }, [started, fullScreen, permission, theme]);

  if (!started) return (
    <div className="flex flex-col items-center justify-center h-64 text-center p-6">
      <Smartphone size={48} className={`mb-4 ${theme.colors.text}`} />
      <h3 className="text-2xl font-black mb-2">Gravity Maze</h3>
      <p className="mb-6 max-w-xs">Tilt your phone or use your mouse to guide the ball to the goal.</p>
      <BrutalButton theme={theme} onClick={start} color={theme.colors.primary} className="text-white">Start Experiment</BrutalButton>
    </div>
  );

  return (
    <div className="relative w-full h-96 bg-gray-900 overflow-hidden select-none touch-none">
      <div ref={containerRef} className="w-full h-full transition-transform duration-100 ease-out origin-center will-change-transform">
        <canvas ref={canvasRef} onClick={() => gameState.current.won && handleRestart()} className="w-full h-full block" />
        <div className="absolute top-4 right-4 flex gap-2">
          <button onClick={() => { if (!document.fullscreenElement) containerRef.current.requestFullscreen(); else document.exitFullscreen(); }} className="bg-white/20 p-2 rounded-full text-white backdrop-blur-sm">
            {fullScreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
          <button onClick={handleRestart} className="bg-white/20 p-2 rounded-full text-white backdrop-blur-sm"><RotateCcw size={20} /></button>
        </div>
        <div className={`absolute bottom-2 left-2 ${theme.colors.card} ${theme.border} px-2 py-1 text-xs font-bold ${theme.colors.text} flex items-center gap-2`}>
          <Activity size={14} className={sensorsActive ? "text-green-500 animate-pulse" : "text-gray-400"} /> {status}
        </div>
      </div>
    </div>
  );
};

const LifeSim = ({ theme }) => {
  const canvasRef = useRef(null);
  const [run, setRun] = useState(false);
  const [stats, setStats] = useState({ day: 0, a: 2, b: 2 });
  const [strat, setStrat] = useState({ a: 'share', b: 'steal' });
  const s = useRef({ orgs: [], food: [], w: 0, h: 0, f: 0 });

  const init = () => {
    const w = 600, h = 300; s.current.w = w; s.current.h = h;
    s.current.orgs = [
      { t: 'a', x: w * Math.random(), y: h * Math.random(), vx: 1, vy: 1, r: 0 }, { t: 'a', x: w * Math.random(), y: h * Math.random(), vx: -1, vy: 1, r: 0 },
      { t: 'b', x: w * Math.random(), y: h * Math.random(), vx: 1, vy: -1, r: 0 }, { t: 'b', x: w * Math.random(), y: h * Math.random(), vx: -1, vy: -1, r: 0 }
    ];
    s.current.food = Array(15).fill(0).map(() => ({ x: w * Math.random(), y: h * Math.random() }));
    setStats({ day: 1, a: 2, b: 2 });
  };

  useEffect(() => {
    const cvs = canvasRef.current; const ctx = cvs.getContext('2d');
    if (!s.current.orgs.length) init();

    let af;
    const loop = () => {
      if (!run) return;
      const st = s.current;
      st.orgs.forEach(o => {
        o.x += o.vx; o.y += o.vy;
        if (o.x < 0 || o.x > st.w) o.vx *= -1; if (o.y < 0 || o.y > st.h) o.vy *= -1;
        for (let i = st.food.length - 1; i >= 0; i--) {
          const f = st.food[i];
          if (Math.hypot(o.x - f.x, o.y - f.y) < 15) { o.r++; st.food.splice(i, 1); }
        }
      });
      ctx.fillStyle = theme.id === 'blueprint' ? '#002147' : '#fdfbf7'; ctx.fillRect(0, 0, st.w, st.h);
      ctx.fillStyle = theme.id === 'blueprint' ? '#ffd700' : '#e9c46a'; st.food.forEach(f => { ctx.beginPath(); ctx.arc(f.x, f.y, 4, 0, 7); ctx.fill(); });
      st.orgs.forEach(o => {
        ctx.fillStyle = o.t === 'a' ? (theme.id === 'blueprint' ? '#4db8ff' : '#2a9d8f') : (theme.id === 'blueprint' ? '#ff4d4d' : '#e76f51');
        ctx.beginPath(); ctx.arc(o.x, o.y, 8, 0, 7); ctx.fill(); ctx.stroke();
      });
      st.f++;
      if (st.f > 600) {
        st.f = 0; st.food = Array(15).fill(0).map(() => ({ x: st.w * Math.random(), y: st.h * Math.random() }));
        st.orgs = st.orgs.filter(o => o.r >= 1).flatMap(o => {
          o.r--;
          if (o.r >= 1) { o.r--; return [o, { ...o, x: o.x + 10, r: 0 }]; }
          return [o];
        });
        setStats(p => ({ day: p.day + 1, a: st.orgs.filter(o => o.t === 'a').length, b: st.orgs.filter(o => o.t === 'b').length }));
      }
      af = requestAnimationFrame(loop);
    };
    if (run) loop();
    return () => cancelAnimationFrame(af);
  }, [run, theme]);

  return (
    <div className="space-y-4">
      <div className={`flex justify-between font-bold text-sm ${theme.colors.card} p-2 ${theme.border} ${theme.colors.text}`}>
        <span className={theme.id === 'blueprint' ? 'text-blue-300' : 'text-gray-300'}>Type A: {stats.a} ({strat.a})</span>
        <span>Day: {stats.day}</span>
        <span className={theme.id === 'blueprint' ? 'text-red-300' : 'text-[#e76f51]'}>Type B: {stats.b} ({strat.b})</span>
      </div>
      <canvas ref={canvasRef} width={600} height={300} className={`w-full h-64 ${theme.colors.bg} ${theme.border}`} />
      <div className="flex justify-between">
        <div className="flex gap-2">
          <button onClick={() => setStrat(s => ({ ...s, a: s.a === 'share' ? 'steal' : 'share' }))} className={`text-xs border ${theme.id === 'blueprint' ? 'border-blue-200 bg-blue-800 text-white' : 'border-black bg-[#2a9d8f] text-white'} px-2 py-1`}>Toggle A</button>
          <button onClick={() => setStrat(s => ({ ...s, b: s.b === 'share' ? 'steal' : 'share' }))} className={`text-xs border ${theme.id === 'blueprint' ? 'border-blue-200 bg-red-900 text-white' : 'border-black bg-[#e76f51] text-white'} px-2 py-1`}>Toggle B</button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { init(); setRun(false); }} className={`p-2 ${theme.border} ${theme.colors.card} ${theme.colors.text}`}><RotateCcw size={16} /></button>
          <button onClick={() => setRun(r => !r)} className={`px-4 py-2 ${theme.colors.accent} ${theme.border} font-bold flex gap-2 text-black`}>{run ? <Pause size={16} /> : <Play size={16} />} {run ? 'Pause' : 'Run'}</button>
        </div>
      </div>
    </div>
  );
};

const FittsLaw = ({ theme }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [state, setState] = useState({ running: false, round: 0, score: 0, history: [] });
  const [target, setTarget] = useState({ x: 0, y: 0, r: 0, active: false });
  const lastClick = useRef({ x: 0, y: 0, time: 0 });

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        canvasRef.current.width = width;
        canvasRef.current.height = height;
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const start = () => {
    if (!canvasRef.current) return;
    setState({ running: true, round: 0, score: 0, history: [] });
    // Start relative to current center
    lastClick.current = { x: canvasRef.current.width / 2, y: canvasRef.current.height / 2, time: Date.now() };
    nextTarget();
  };

  const nextTarget = () => {
    if (!canvasRef.current) return;
    const w = canvasRef.current.width;
    const h = canvasRef.current.height;
    const r = Math.random() * 30 + 10; // Radius 10-40px
    const margin = r + 10;
    const x = Math.max(margin, Math.min(w - margin, Math.random() * w));
    const y = Math.max(margin, Math.min(h - margin, Math.random() * h));
    setTarget({ x, y, r, active: true });
  };

  const handleClick = (e) => {
    if (!state.running || !target.active) return;
    const rect = canvasRef.current.getBoundingClientRect();
    // Correct coordinate mapping
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dist = Math.hypot(x - target.x, y - target.y);

    if (dist < target.r) {
      const now = Date.now();
      const time = now - lastClick.current.time;
      const travelDist = Math.hypot(target.x - lastClick.current.x, target.y - lastClick.current.y);
      // ID calculation: log2(Distance / Width + 1), width = 2*r
      const id = Math.log2(travelDist / (target.r * 2) + 1);

      const newHistory = [...state.history, { time, id }];
      setState(prev => ({ ...prev, round: prev.round + 1, score: prev.score + 1, history: newHistory }));

      lastClick.current = { x, y, time: now };

      if (state.round >= 9) {
        setTarget({ ...target, active: false });
        setState(prev => ({ ...prev, running: false }));
      } else {
        nextTarget();
      }
    }
  };

  // Animation Loop
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');

    const draw = () => {
      // Clear with theme bg
      ctx.fillStyle = theme.id === 'blueprint' ? '#002147' : '#fdfbf7';
      ctx.fillRect(0, 0, cvs.width, cvs.height);

      if (state.running && target.active) {
        ctx.beginPath();
        ctx.arc(target.x, target.y, target.r, 0, Math.PI * 2);
        ctx.fillStyle = theme.colors.secondary; // Target color
        ctx.fill();
        ctx.strokeStyle = theme.id === 'blueprint' ? 'white' : 'black';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw chart if finished
      if (!state.running && state.history.length > 0) {
        drawChart(ctx, cvs.width, cvs.height);
      }

      requestAnimationFrame(draw);
    };
    const anim = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(anim);
  }, [target, state.running, state.history, theme]);

  const drawChart = (ctx, width, height) => {
    const margin = 40;
    const chartW = width - margin * 2;
    const chartH = height - margin * 2;

    // Normalize
    const maxTime = Math.max(...state.history.map(h => h.time), 1000) || 1000;
    const maxID = Math.max(...state.history.map(h => h.id), 5) || 5;

    // Axes
    ctx.beginPath();
    ctx.moveTo(margin, height - margin);
    ctx.lineTo(width - margin, height - margin); // X
    ctx.moveTo(margin, height - margin);
    ctx.lineTo(margin, margin); // Y
    ctx.strokeStyle = theme.id === 'blueprint' ? 'white' : 'black';
    ctx.stroke();

    // Points
    state.history.forEach(point => {
      const x = margin + (point.id / maxID) * chartW;
      const y = (height - margin) - (point.time / maxTime) * chartH;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = theme.colors.accent;
      ctx.fill();
    });

    // Labels
    ctx.fillStyle = theme.id === 'blueprint' ? 'white' : 'black';
    ctx.font = '12px monospace';
    ctx.fillText("Difficulty (ID)", width / 2 - 40, height - 10);
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Time (ms)", 0, 0);
    ctx.restore();

    // No Data Fallback
    if (state.history.length === 0) {
      ctx.fillText("No Data", width / 2 - 20, height / 2);
    }
  };

  return (
    <div className="space-y-4">
      <div className={`flex justify-between font-bold text-sm ${theme.colors.card} p-2 ${theme.border} ${theme.colors.text}`}>
        <span>Score: {state.score}/10</span>
        <span>{state.running ? "Tap targets fast!" : "Results Ready"}</span>
      </div>
      <div ref={containerRef} className={`w-full h-64 ${theme.colors.bg} ${theme.border}`}>
        <canvas
          ref={canvasRef}
          onClick={handleClick}
          className="w-full h-full cursor-crosshair block"
          style={{ touchAction: 'none' }}
        />
      </div>
      <div className="flex justify-center">
        <BrutalButton theme={theme} onClick={start} color={theme.colors.accent} className="text-black">
          {state.history.length > 0 ? <RotateCcw size={16} /> : <Play size={16} />}
          {state.history.length > 0 ? "Restart Test" : "Start Fitts Test"}
        </BrutalButton>
      </div>
    </div>
  );
};

const Experiments = ({ theme }) => (
  <div className="animate-in zoom-in-95 duration-500">
    <SectionTitle theme={theme}>The Lab</SectionTitle>
    <p className={`text-xl mb-8 max-w-2xl ${theme.id === 'blueprint' ? 'text-blue-200' : 'text-gray-600'}`}>
      A collection of interactive UI experiments, intention-driven code tests, and usability playgrounds.
    </p>

    <div className="flex flex-col gap-12">
      {/* Gyro Maze */}
      <div className="w-full">
        <div className={`flex justify-between items-end mb-4 border-b-2 ${theme.id === 'blueprint' ? 'border-blue-200' : 'border-black'} pb-2`}>
          <div>
            <span className={`${theme.colors.primary} ${theme.border} px-2 py-0.5 text-xs font-bold mb-2 inline-block text-white`}>EXPERIMENT 01</span>
            <h3 className="text-3xl font-black">Gravity Maze</h3>
          </div>
          <div className={`hidden md:flex gap-2 text-sm font-bold ${theme.id === 'blueprint' ? 'text-blue-400' : 'text-gray-400'}`}><Smartphone size={16} /> Gyro</div>
        </div>
        <BrutalCard theme={theme} className="p-0 overflow-hidden"><MazeGame theme={theme} /></BrutalCard>
      </div>

      {/* Life Sim */}
      <div className="w-full">
        <div className={`flex justify-between items-end mb-4 border-b-2 ${theme.id === 'blueprint' ? 'border-blue-200' : 'border-black'} pb-2`}>
          <div>
            <span className={`${theme.colors.primary} ${theme.border} px-2 py-0.5 text-xs font-bold mb-2 inline-block text-white`}>EXPERIMENT 02</span>
            <h3 className="text-3xl font-black">Hawk vs Dove</h3>
          </div>
          <div className={`hidden md:flex gap-2 text-sm font-bold ${theme.id === 'blueprint' ? 'text-blue-400' : 'text-gray-400'}`}><Activity size={16} /> Sim</div>
        </div>
        <BrutalCard theme={theme} className="p-0 overflow-hidden"><LifeSim theme={theme} /></BrutalCard>
      </div>

      {/* Fitts Law */}
      <div className="w-full">
        <div className={`flex justify-between items-end mb-4 border-b-2 ${theme.id === 'blueprint' ? 'border-blue-200' : 'border-black'} pb-2`}>
          <div>
            <span className={`${theme.colors.primary} ${theme.border} px-2 py-0.5 text-xs font-bold mb-2 inline-block text-white`}>EXPERIMENT 03</span>
            <h3 className="text-3xl font-black">Fitts's Law</h3>
          </div>
          <div className={`hidden md:flex gap-2 text-sm font-bold ${theme.id === 'blueprint' ? 'text-blue-400' : 'text-gray-400'}`}><MousePointer2 size={16} /> Ergonomics</div>
        </div>
        <BrutalCard theme={theme} className="p-4"><FittsLaw theme={theme} /></BrutalCard>
      </div>

      <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg text-center">
        <p className={`text-xl max-w-md mx-auto ${theme.id === 'blueprint' ? 'text-blue-200' : 'text-gray-600'} mb-8`}>Digital products, high-fidelity prompts, and masterclasses are currently in the workshop.</p>
      </div>
    </div>
  </div>
);
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
