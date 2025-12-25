import React, { useState, useEffect } from 'react'
import { 
  ArrowLeft, Clock, Users, Flame, Edit2, Trash2, FolderInput, 
  Calendar, Check, Maximize2, Minimize2, MoreHorizontal 
} from 'lucide-react'
// import { Button } from '../ui/Button'

// Wake Lock Helper
const useWakeLock = (enabled) => {
  useEffect(() => {
    if (!enabled || !'wakeLock' in navigator) return

    let wakeLock = null
    const requestLock = async () => {
      try {
        wakeLock = await navigator.wakeLock.request('screen')
      } catch (err) {
        console.warn('Wake Lock error:', err)
      }
    }
    requestLock()

    return () => wakeLock?.release()
  }, [enabled])
}

const DetailHeader = ({ recipe, onClose, onAction, cookingMode, setCookingMode }) => (
  <div className={`sticky top-0 z-20 flex items-center justify-between border-b-2 border-ink bg-paper px-4 py-4 transition-all ${cookingMode ? 'py-2' : ''}`}>
    <button onClick={onClose} className="rounded-full hover:bg-black/5 p-2 transition">
        <ArrowLeft className="h-6 w-6 text-ink" />
    </button>
    
    <div className="flex gap-2">
      <button 
        onClick={() => setCookingMode(!cookingMode)}
        className={`p-2 rounded-full border-2 transition ${cookingMode ? 'bg-teal border-ink text-ink' : 'border-transparent text-gray-400 hover:text-ink'}`}
        title="Cooking Mode (Keep Screen On)"
      >
        {cookingMode ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
      </button>
      <div className="relative group">
        <button className="p-2 text-ink hover:bg-black/5 rounded-full">
            <MoreHorizontal className="h-6 w-6" />
        </button>
        {/* Dropdown Menu */}
        <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border-2 border-ink bg-white shadow-hard opacity-0 bg-white invisible group-hover:opacity-100 group-hover:visible transition-all z-30 flex flex-col overflow-hidden">
            <button onClick={() => onAction('addToWeek')} className="flex items-center gap-2 px-4 py-3 text-sm font-bold hover:bg-yellow-50 text-left">
                <Calendar className="h-4 w-4" /> {recipe.thisWeek ? 'Remove from Week' : 'Add to This Week'}
            </button>
            <button onClick={() => onAction('move')} className="flex items-center gap-2 px-4 py-3 text-sm font-bold hover:bg-gray-50 text-left">
                <FolderInput className="h-4 w-4" /> Move Folder
            </button>
            <button onClick={() => onAction('edit')} className="flex items-center gap-2 px-4 py-3 text-sm font-bold hover:bg-gray-50 text-left">
                <Edit2 className="h-4 w-4" /> Edit Recipe
            </button>
            <button onClick={() => onAction('delete')} className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 text-left border-t border-gray-100">
                <Trash2 className="h-4 w-4" /> Delete
            </button>
        </div>
      </div>
    </div>
  </div>
)

const CheckableItem = ({ text, isChecked, onToggle, largeText }) => {
    return (
        <button 
            onClick={onToggle}
            className={`flex w-full items-start gap-4 p-3 text-left transition-all ${isChecked ? 'opacity-40 grayscale' : ''}`}
        >
            <div className={`mt-0.5 flex items-center justify-center rounded border-2 border-ink transition-colors ${isChecked ? 'bg-ink' : 'bg-white'} ${largeText ? 'h-6 w-6' : 'h-5 w-5'}`}>
                {isChecked && <Check className="h-3 w-3 text-white" />}
            </div>
            <span className={`flex-1 font-body text-ink ${largeText ? 'text-lg leading-relaxed' : 'text-base'} ${isChecked ? 'line-through' : ''}`}>
                {text}
            </span>
        </button>
    )
}

export const RecipeDetail = ({ recipe, onClose, onUpdate, onDelete }) => {
  const [cookingMode, setCookingMode] = useState(false)
  
  // Local state for checkboxes
  // We don't necessarily need to persist this to the DB permanently immediately, 
  // but it's nice to have. For now, let's keep it local to the session or lift it up if needed.
  // Actually, keeping it local is fine for a simple "session" of cooking.
  const [checkedIngredients, setCheckedIngredients] = useState({})
  const [checkedSteps, setCheckedSteps] = useState({})

  useWakeLock(cookingMode)

  const handleAction = (action) => {
    if (action === 'delete') {
        if (confirm('Are you certain you want to delete this recipe?')) {
            onDelete(recipe.id)
        }
    } else if (action === 'edit') {
        onUpdate({ ...recipe }, 'edit')
    } else if (action === 'addToWeek') {
        onUpdate({ ...recipe, thisWeek: !recipe.thisWeek }, 'save')
    }
    // "move" - implementing a folder picker is out of scope for this precise chunk, 
    // but we can map it to 'edit' which has access to fields, or simple prompt.
    // Let's defer "move" to just opening edit mode for now, or a simple prompt.
    else if (action === 'move') {
       onUpdate({ ...recipe }, 'edit') // Simply go to edit to change protein
    }
  }

  return (
    <div className={`fixed inset-0 z-50 flex flex-col bg-paper overflow-hidden animate-in slide-in-from-bottom-10 ${cookingMode ? 'safe-area-pt bg-white' : ''}`}>
        <DetailHeader 
            recipe={recipe} 
            onClose={onClose} 
            onAction={handleAction} 
            cookingMode={cookingMode}
            setCookingMode={setCookingMode}
        />

        <div className={`flex-1 overflow-y-auto pb-20 ${cookingMode ? 'px-4' : ''}`}>
             <div className="relative">
                {recipe.sourceImage && !cookingMode && (
                     <div className="h-64 w-full">
                         <img src={recipe.sourceImage} className="h-full w-full object-cover" alt="Recipe" />
                     </div>
                )}
                
                <div className={`bg-paper relative ${cookingMode ? 'pt-4' : '-mt-6 rounded-t-3xl border-t-2 border-ink p-6'}`}>
                    {/* Metadata Header */}
                    <div className="mb-6">
                        <div className="flex gap-2 mb-2">
                             {recipe.protein && <span className="text-[10px] font-bold uppercase tracking-wider bg-black text-white px-2 py-1 rounded">{recipe.protein}</span>}
                             {recipe.difficulty && <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-200 text-gray-600 px-2 py-1 rounded">{recipe.difficulty}</span>}
                        </div>
                        <h1 className="font-display text-3xl font-black leading-tight text-ink mb-2">{recipe.title}</h1>
                        
                        <div className="flex gap-4 text-sm font-bold text-gray-500 border-y border-gray-200 py-3 mt-4">
                            <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4 text-teal" />
                                <span>{recipe.prepTime + recipe.cookTime}m</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Users className="h-4 w-4 text-teal" />
                                <span>{recipe.servings} Servings</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Flame className="h-4 w-4 text-teal" />
                                <span>{recipe.difficulty || 'Easy'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Ingredients */}
                    <div className="mb-8">
                        <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
                            Ingredients 
                            <span className="text-sm font-normal text-gray-400 font-body">({recipe.ingredients?.length || 0})</span>
                        </h2>
                        <div className={`rounded-xl border-2 border-dashed border-gray-300 p-2 ${cookingMode ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50'}`}>
                            {recipe.ingredients.map((ing, idx) => {
                                const prep = ing.prep ? `, ${ing.prep}` : ''
                                const text = `${ing.amount} ${ing.name}${prep}`
                                return (
                                    <CheckableItem 
                                        key={idx} 
                                        text={text} 
                                        isChecked={checkedIngredients[idx]} 
                                        onToggle={() => setCheckedIngredients(p => ({ ...p, [idx]: !p[idx] }))} 
                                    />
                                )
                            })}
                        </div>
                    </div>

                    {/* Steps */}
                    <div className="mb-8">
                         <h2 className="font-display text-xl font-bold mb-4">Instructions</h2>
                         <div className="space-y-4">
                             {recipe.steps.map((step, idx) => (
                                 <div key={idx} className="flex gap-4">
                                     <div className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full border-2 font-bold transition-colors ${checkedSteps[idx] ? 'bg-teal border-teal text-white' : 'border-ink bg-white text-ink'}`}>
                                         {checkedSteps[idx] ? <Check className="h-4 w-4" /> : idx + 1}
                                     </div>
                                     <button 
                                        onClick={() => setCheckedSteps(p => ({ ...p, [idx]: !p[idx] }))}
                                        className={`text-left font-body text-ink transition-opacity ${cookingMode ? 'text-lg leading-relaxed' : ''} ${checkedSteps[idx] ? 'opacity-50 line-through' : ''}`}
                                     >
                                         {step}
                                     </button>
                                 </div>
                             ))}
                         </div>
                    </div>
                    
                    {recipe.notes && (
                        <div className="mb-8 rounded-xl bg-blue-50 p-4 text-sm text-blue-800 border-l-4 border-blue-400">
                            <strong>Chef's Notes:</strong>
                            <p className="mt-1">{recipe.notes}</p>
                        </div>
                    )}

                </div>
             </div>
        </div>
    </div>
  )
}
