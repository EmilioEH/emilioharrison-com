import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw, Play } from 'lucide-react';
import BrutalButton from '../components/ui/BrutalButton';

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

export default FittsLaw;
