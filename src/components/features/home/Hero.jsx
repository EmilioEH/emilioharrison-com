import React from 'react';
import { Mail, FlaskConical } from 'lucide-react';
import TapeButton from '../../ui/TapeButton';

const Hero = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-24 items-center animate-in fade-in duration-700 relative z-10">
            <div className="md:col-span-7 space-y-8">
                <div className="inline-block transform -rotate-2">
                    <div className="bg-mustard border-2 border-black px-4 py-1 font-black tracking-widest uppercase text-sm shadow-hard-sm text-black">
                        UX Researcher & Creative Technologist
                    </div>
                </div>
                <h1 className="text-6xl md:text-8xl font-black leading-[0.9] tracking-tighter text-ink">
                    EMILIO<br />HARRISON
                </h1>
                <div className="relative p-6 bg-white border-4 border-black shadow-hard transform rotate-1 max-w-lg">
                    <p className="text-xl md:text-2xl text-black font-bold leading-relaxed">
                        Building utility-focused digital tools and exploring <span className="bg-coral text-white px-1">"vibe coding"</span>—the intersection of intentionality and system design.
                    </p>
                </div>
                <div className="flex flex-wrap gap-4 pt-4">
                    <a href="/lab" className="no-underline">
                        <TapeButton color="bg-teal">
                            <FlaskConical size={20} /> View Lab
                        </TapeButton>
                    </a>
                    <a href="/contact" className="no-underline">
                        <TapeButton color="bg-coral">
                            <Mail size={20} /> Contact
                        </TapeButton>
                    </a>
                </div>
            </div>

            {/* Decorative right side (optional, or keep empty/image) */}
            <div className="md:col-span-5 relative min-h-[400px] hidden md:flex items-center justify-center pointer-events-none">
                {/* Shapes or Image can go here. For now, keeping it clean as per prototype which focused on text/shapes in background */}
            </div>
        </div>
    );
};

export default Hero;
