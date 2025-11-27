import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import TapeButton from '../../../ui/TapeButton';

const FittsLaw = () => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [state, setState] = useState({ running: false, round: 0, score: 0, history: [] });
    const [target, setTarget] = useState({ x: 0, y: 0, r: 0, active: false });
    const lastClick = useRef({ x: 0, y: 0, time: 0 });

    useEffect(() => {
        const obs = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect;
            if (canvasRef.current) { canvasRef.current.width = width; canvasRef.current.height = height; }
        });
        if (containerRef.current) obs.observe(containerRef.current);
        return () => obs.disconnect();
    }, []);

    const start = () => {
        if (!canvasRef.current) return;
        // eslint-disable-next-line react-hooks/purity
        const now = Date.now();
        setState({ running: true, round: 0, score: 0, history: [] });
        lastClick.current = { x: canvasRef.current.width / 2, y: canvasRef.current.height / 2, time: now };
        nextTarget();
    };

    const nextTarget = () => {
        const w = canvasRef.current.width, h = canvasRef.current.height;
        const r = Math.random() * 30 + 10;
        const margin = r + 10;
        setTarget({
            x: Math.max(margin, Math.min(w - margin, Math.random() * w)),
            y: Math.max(margin, Math.min(h - margin, Math.random() * h)),
            r, active: true
        });
    };

    const handleClick = (e) => {
        if (!state.running || !target.active) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const dist = Math.hypot((e.clientX - rect.left) - target.x, (e.clientY - rect.top) - target.y);

        if (dist < target.r) {
            const now = Date.now();
            const travelDist = Math.hypot(target.x - lastClick.current.x, target.y - lastClick.current.y);
            const id = Math.log2(travelDist / (target.r * 2) + 1);
            setState(prev => {
                const newState = { ...prev, round: prev.round + 1, score: prev.score + 1, history: [...prev.history, { time: now - lastClick.current.time, id }] };
                if (newState.round >= 9) { setTarget({ ...target, active: false }); return { ...newState, running: false }; }
                return newState;
            });
            lastClick.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, time: now };
            if (state.round < 9) nextTarget();
        }
    };

    useEffect(() => {
        const cvs = canvasRef.current, ctx = cvs?.getContext('2d');
        if (!cvs || !ctx) return;

        let af;
        const draw = () => {
            ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cvs.width, cvs.height);
            if (state.running && target.active) {
                ctx.beginPath(); ctx.arc(target.x, target.y, target.r, 0, Math.PI * 2);
                ctx.fillStyle = '#e76f51'; ctx.fill(); ctx.stroke();
            }
            if (!state.running && state.history.length > 0) {
                // Draw chart
                const m = 40, w = cvs.width - m * 2, h = cvs.height - m * 2;
                const maxTime = Math.max(...state.history.map(d => d.time), 1000), maxID = Math.max(...state.history.map(d => d.id), 5);
                ctx.beginPath(); ctx.moveTo(m, cvs.height - m); ctx.lineTo(cvs.width - m, cvs.height - m); ctx.moveTo(m, cvs.height - m); ctx.lineTo(m, m); ctx.stroke();
                state.history.forEach(p => {
                    ctx.beginPath(); ctx.arc(m + (p.id / maxID) * w, (cvs.height - m) - (p.time / maxTime) * h, 4, 0, Math.PI * 2);
                    ctx.fillStyle = '#2a9d8f'; ctx.fill();
                });
                ctx.fillStyle = 'black'; ctx.font = '12px monospace'; ctx.fillText("Difficulty (ID)", w / 2 + m, cvs.height - 10);
            }
            af = requestAnimationFrame(draw);
        };
        draw();
        return () => cancelAnimationFrame(af);
    }, [target, state.running, state.history]);

    return (
        <div className="space-y-4">
            <div className="flex justify-between font-bold text-sm bg-white p-2 border-2 border-black">
                <span>Score: {state.score}/10</span><span>{state.running ? "Tap fast!" : "Results"}</span>
            </div>
            <div ref={containerRef} className="w-full h-64 bg-white border border-gray-300 shadow-inner">
                <canvas
                    ref={canvasRef}
                    onClick={handleClick}
                    className="w-full h-full cursor-crosshair block"
                    style={{ touchAction: 'none' }}
                    aria-label="Fitts Law Test Canvas"
                    role="img"
                />
            </div>
            <div className="flex justify-center">
                <TapeButton onClick={start} color="bg-mustard" className="text-black">
                    {state.history.length > 0 ? <RotateCcw size={16} /> : <Play size={16} />} {state.history.length > 0 ? "Restart" : "Start Test"}
                </TapeButton>
            </div>
        </div>
    );
};

export default FittsLaw;
