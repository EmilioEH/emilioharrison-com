import React, { useEffect, useRef, useMemo } from 'react';

/**
 * ReactiveBackground Component
 * An animated background with floating shapes that react to mouse movement and scroll.
 * Uses direct DOM manipulation for performance (skipping React render cycle).
 * 
 * @param {Object} props
 * @param {boolean} props.rippleTrigger - Triggers a ripple effect animation
 */
const ReactiveBackground = ({ rippleTrigger }) => {
    const containerRef = useRef(null);
    const shapesRef = useRef([]);
    const requestRef = useRef();
    const mouseParams = useRef({ x: 0, y: 0, scrollY: 0 });

    const shapesData = useMemo(() => [
        { type: 'circle', x: 10, y: 15, size: 120, pattern: 'url(#pattern-dots)', speed: 0.05, float: 1 },
        { type: 'rect', x: 85, y: 10, size: 150, pattern: 'url(#pattern-hatch)', speed: -0.03, float: 1.5, rot: 15 },
        { type: 'triangle', x: 5, y: 45, size: 100, pattern: 'url(#pattern-grid)', speed: 0.08, float: -1, rot: 45 },
        { type: 'circle', x: 90, y: 60, size: 80, pattern: 'url(#pattern-dots)', speed: 0.02, float: 2 },
        { type: 'rect', x: 15, y: 75, size: 180, pattern: 'url(#pattern-hatch)', speed: -0.05, float: -1.5, rot: 15 },
        { type: 'triangle', x: 80, y: 85, size: 140, pattern: 'url(#pattern-grid)', speed: 0.04, float: 1, rot: 45 },
    ], []);

    useEffect(() => {
        const handleScroll = () => { mouseParams.current.scrollY = window.scrollY; };
        const handleMouseMove = (e) => {
            mouseParams.current.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouseParams.current.y = (e.clientY / window.innerHeight) * 2 - 1;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('mousemove', handleMouseMove);

        const animate = () => {
            if (shapesRef.current.length === 0) return;

            const { x, y, scrollY } = mouseParams.current;
            const rippleScale = rippleTrigger ? 1.1 : 1;

            shapesRef.current.forEach((el, i) => {
                if (!el) return;
                const data = shapesData[i];
                const yOffset = scrollY * data.speed;
                const xDrift = x * 20 * data.float;
                const yDrift = y * 20 * data.float;
                const rotation = data.rot ? `rotate(${data.rot}deg)` : '';

                // Direct DOM manipulation bypasses React render cycle
                el.style.transform = `translate(${xDrift}px, ${yOffset + yDrift}px) scale(${rippleScale}) ${rotation}`;
            });

            requestRef.current = requestAnimationFrame(animate);
        };

        requestRef.current = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('mousemove', handleMouseMove);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [rippleTrigger, shapesData]);

    return (
        <div ref={containerRef} className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
            <svg width="100%" height="100%">
                {/* Patterns defined in PatternDefs.jsx */}
                {shapesData.map((shape, i) => (
                    <g key={i} ref={el => shapesRef.current[i] = el} style={{ transition: 'transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.27)', transformOrigin: 'center' }}>
                        {shape.type === 'circle' && <circle cx={`${shape.x}%`} cy={`${shape.y}%`} r={shape.size / 2} fill={shape.pattern} stroke="#264653" strokeWidth="2" className="opacity-60" />}
                        {shape.type !== 'circle' && <rect x={`${shape.x}%`} y={`${shape.y}%`} width={shape.size} height={shape.size} fill={shape.pattern} stroke="#264653" strokeWidth="2" className="opacity-60" />}
                    </g>
                ))}
            </svg>
        </div>
    );
};

export default ReactiveBackground;
