import React from 'react';
import { Smartphone, Activity, MousePointer2 } from 'lucide-react';
import SectionTitle from '../components/ui/SectionTitle';
import BrutalCard from '../components/ui/BrutalCard';
import MazeGame from '../experiments/MazeGame';
import LifeSim from '../experiments/LifeSim';
import FittsLaw from '../experiments/FittsLaw';

const Lab = ({ theme }) => (
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
                {/* <BrutalCard theme={theme} className="p-4"><FittsLaw theme={theme} /></BrutalCard> */}
            </div>

            <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg text-center">
                <p className={`text-xl max-w-md mx-auto ${theme.id === 'blueprint' ? 'text-blue-200' : 'text-gray-600'} mb-8`}>Digital products, high-fidelity prompts, and masterclasses are currently in the workshop.</p>
            </div>
        </div>
    </div>
);

export default Lab;
