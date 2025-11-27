import React from 'react';
import { Smartphone, Activity, MousePointer2 } from 'lucide-react';
import SectionTitle from '../../ui/SectionTitle';
import StickyNote from '../../ui/StickyNote';
import MazeGame from './experiments/MazeGame';
import LifeSim from './experiments/LifeSim';
import FittsLaw from './experiments/FittsLaw';

const LabContent = () => {
    return (
        <div className="animate-in zoom-in-95 duration-500 relative z-10">
            <SectionTitle>The Lab</SectionTitle>
            <p className="text-xl mb-8 max-w-2xl text-gray-600 pl-4 border-l-4 border-black">
                Interactive UI experiments and intention-driven code tests.
            </p>

            <div className="flex flex-col gap-12">
                {/* Gyro Maze */}
                <div className="w-full">
                    <div className="flex justify-between items-end mb-4 px-2">
                        <div>
                            <span className="bg-teal text-white border-2 border-black px-2 py-0.5 text-xs font-bold mb-2 inline-block shadow-hard-sm transform -rotate-1">EXPERIMENT 01</span>
                            <h3 className="text-3xl font-black text-ink">Gravity Maze</h3>
                        </div>
                        <div className="hidden md:flex gap-2 text-sm font-bold text-gray-400"><Smartphone size={16} /> Gyro</div>
                    </div>
                    <StickyNote color="bg-white" className="p-0 overflow-hidden" rotate={-1}>
                        <MazeGame />
                    </StickyNote>
                </div>

                {/* Life Sim */}
                <div className="w-full">
                    <div className="flex justify-between items-end mb-4 px-2">
                        <div>
                            <span className="bg-coral text-white border-2 border-black px-2 py-0.5 text-xs font-bold mb-2 inline-block shadow-hard-sm transform rotate-1">EXPERIMENT 02</span>
                            <h3 className="text-3xl font-black text-ink">Hawk vs Dove</h3>
                        </div>
                        <div className="hidden md:flex gap-2 text-sm font-bold text-gray-400"><Activity size={16} /> Sim</div>
                    </div>
                    <StickyNote color="bg-white" className="p-0 overflow-hidden" rotate={1}>
                        <LifeSim />
                    </StickyNote>
                </div>

                {/* Fitts Law */}
                <div className="w-full">
                    <div className="flex justify-between items-end mb-4 px-2">
                        <div>
                            <span className="bg-mustard text-black border-2 border-black px-2 py-0.5 text-xs font-bold mb-2 inline-block shadow-hard-sm transform -rotate-2">EXPERIMENT 03</span>
                            <h3 className="text-3xl font-black text-ink">Fitts's Law</h3>
                        </div>
                        <div className="hidden md:flex gap-2 text-sm font-bold text-gray-400"><MousePointer2 size={16} /> Ergonomics</div>
                    </div>
                    <StickyNote color="bg-white" className="p-4" rotate={-2}>
                        <FittsLaw />
                    </StickyNote>
                </div>
            </div>
        </div>
    );
};

export default LabContent;

