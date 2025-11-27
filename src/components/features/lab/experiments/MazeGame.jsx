import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, Maximize, Minimize, RotateCcw, Activity } from 'lucide-react';
import BrutalButton from '../../../ui/BrutalButton';

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

export default MazeGame;
