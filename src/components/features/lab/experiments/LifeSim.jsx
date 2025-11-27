import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw, Play, Pause } from 'lucide-react';

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
        const cvs = canvasRef.current;
        if (!cvs) return;
        const ctx = cvs.getContext('2d');
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

export default LifeSim;
