import React, { useState } from 'react';
import { X, CheckCircle2, Circle } from 'lucide-react';

const PrepMode = ({ recipe, prepState, togglePrep, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const items = recipe.ingredients || [];
  
  // Progress calculation
  const progress = items.length > 0 ? ((currentIndex + 1) / items.length) * 100 : 0;
  
  const handleNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Completed last item, maybe show a "Done" screen or close?
      // For now, just close or stay on last item
    }
  };

  const currentItem = items[currentIndex];
  const isChecked = !!prepState[recipe.id]?.[currentIndex];

  const handleToggleAndNext = () => {
    if (!isChecked) {
      togglePrep(recipe.id, currentIndex);
      // Optional: Auto-advance after a brief delay?
      // setTimeout(handleNext, 300);
      handleNext();
    } else {
      togglePrep(recipe.id, currentIndex); // Uncheck
    }
  };

  if (items.length === 0) {
    return (
      <div className="fixed inset-0 bg-paper z-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-xl shadow-hard text-center border-2 border-ink">
          <p className="text-gray-500 mb-4 font-body">No ingredients to prep for this recipe.</p>
          <button onClick={onClose} className="px-4 py-2 bg-ink text-paper rounded-lg font-bold shadow-hard-sm hover:translate-y-0.5 hover:shadow-none transition-all">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-paper z-50 flex flex-col animate-in slide-in-from-bottom-10 duration-300">
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b-2 border-ink flex justify-between items-center shadow-sm">
        <div>
          <h2 className="font-display font-bold text-ink flex items-center gap-2 text-xl">
            Steps
          </h2>
          <p className="text-xs text-gray-500 font-body">Prep for {recipe.title}</p>
        </div>
        <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition border-2 border-transparent hover:border-ink">
          <X className="w-5 h-5 text-ink" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-gray-200 w-full">
        <div className="h-full bg-teal transition-all duration-300" style={{ width: `${progress}%` }}></div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-paper relative overflow-hidden">
        
        {/* Dynamic decorative background */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 to-red-500"></div>

        <div className="w-full max-w-md bg-white rounded-3xl shadow-hard-xl border-2 border-ink p-8 text-center relative overflow-hidden">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest border border-gray-200 px-3 py-1 rounded-full mb-4 inline-block font-accent">
              Ingredient {currentIndex + 1} of {items.length}
            </span>
            
            <div className="mb-2 text-4xl md:text-5xl font-display font-bold text-ink tracking-tight mt-4">
                {currentItem.amount}
            </div>
            <div className="text-xl font-medium text-gray-600 mb-8 font-body capitalize">
                {currentItem.name}
            </div>

            <div className={`p-6 mb-8 border-2 border-ink rounded-xl ${currentItem.prep ? 'bg-orange-50' : 'bg-gray-50'}`}>
                <div className="text-xs font-bold text-ink uppercase tracking-wider mb-2 font-accent">Action</div>
                <div className="text-2xl font-bold text-coral capitalize font-display">
                    {currentItem.prep || "Measure & Reserve"}
                </div>
            </div>

            <div className="space-y-3">
                <button 
                  onClick={handleToggleAndNext}
                  className="w-full py-4 bg-ink hover:bg-black text-paper font-bold text-lg rounded-xl shadow-hard active:translate-y-1 active:shadow-none transition flex items-center justify-center gap-2 font-display"
                >
                   {isChecked ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                   {isChecked ? 'Next Item' : 'Mark Done & Next'}
                </button>
            </div>
        </div>

        {/* Navigation Dots / List */}
         <div className="flex gap-2 mt-8 overflow-x-auto max-w-full px-4 pb-4 no-scrollbar">
            {items.map((_, idx) => {
                const isActive = idx === currentIndex;
                const isCompleted = !!prepState[recipe.id]?.[idx];
                let bgClass = 'bg-gray-300';
                if (isActive) {
                    bgClass = 'bg-ink scale-125';
                } else if (isCompleted) {
                    bgClass = 'bg-teal';
                }
                
                return (
                  <div 
                    key={idx} 
                    role="button"
                    tabIndex={0}
                    onClick={() => setCurrentIndex(idx)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setCurrentIndex(idx); }}
                    className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer shrink-0 border border-ink ${bgClass}`}
                  />
                );
            })}
        </div>
      </div>
    </div>
  );
};

export default PrepMode;
