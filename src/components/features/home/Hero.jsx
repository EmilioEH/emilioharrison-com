import React from 'react';
import { Mail } from 'lucide-react';
import BrutalButton from '../../ui/BrutalButton';
import { useStore } from '@nanostores/react';
import { themeId } from '../../../lib/store';
import { THEMES } from '../../../lib/themes';

function BeakerIcon(props) { return <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 3h15" /><path d="M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3" /><path d="M6 14h12" /></svg>; }

const Hero = () => {
    const currentThemeId = useStore(themeId);
    const theme = THEMES[currentThemeId];

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
                    Trying to figure out where AI actually helps people—not replaces them or makes more internet garbage. Just... useful stuff that matters.
                </p>
                <div className="flex flex-wrap gap-4 pt-4">
                    <BrutalButton theme={theme} color={theme.colors.primary} href="/lab">
                        <BeakerIcon size={20} /> View Experiments
                    </BrutalButton>
                    <BrutalButton theme={theme} href="/contact">
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

export default Hero;
