import React, { useState, useEffect } from 'react';
import { 
  Plus, ShoppingBag, ChefHat, Trash2, 
  ChevronDown, ChevronUp, Loader2, Save, Check, MoreHorizontal
} from 'lucide-react';
import PrepMode from './PrepMode';
import { generateGroceryList } from './grocery-utils';

const RECIPES_API_URL = '/api/recipes';

// --- MAIN COMPONENT ---
const RecipeManager = () => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [prepState, setPrepState] = useState({});
  
  // App views: 'list', 'edit', 'prep', 'grocery'
  const [view, setView] = useState('list');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [groceryList, setGroceryList] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, saved, error

  // --- DATA SYNC ---
  useEffect(() => {
    // Initial fetch from Cloudflare KV (via our API)
    const fetchRecipes = async () => {
      try {
        const res = await fetch(RECIPES_API_URL);
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data)) {
            setRecipes(data);
          }
        }
      } catch (err) {
        console.error("Failed to fetch recipes", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecipes();
  }, []);

  // Sync to Cloudflare KV whenever recipes change
  useEffect(() => {
    if (loading) return; // Don't sync initial load
    
    // Debounce save to avoid hammering API
    const timeoutId = setTimeout(async () => {
        setSyncStatus('syncing');
        try {
            await fetch(RECIPES_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(recipes)
            });
            setSyncStatus('saved');
            setTimeout(() => setSyncStatus('idle'), 2000);
        } catch (err) {
            console.error("Sync failed", err);
            setSyncStatus('error');
        }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [recipes, loading]);


  const handleSaveRecipe = (recipe) => {
    if (recipes.find(r => r.id === recipe.id)) {
      setRecipes(recipes.map(r => r.id === recipe.id ? recipe : r));
    } else {
      setRecipes([...recipes, recipe]);
    }
    setView('list');
    setSelectedRecipe(null);
  };

  const handleDeleteRecipe = (id) => {
    if (window.confirm('Are you sure you want to delete this recipe?')) {
      setRecipes(recipes.filter(r => r.id !== id));
      setView('list');
      setSelectedRecipe(null);
    }
  };

  const handleTogglePrep = (recipeId, stepIdx) => {
    setPrepState(prev => ({
      ...prev,
      [recipeId]: {
        ...prev[recipeId],
        [stepIdx]: !prev[recipeId]?.[stepIdx]
      }
    }));
  };

  const handleGenerateList = async () => {
    setIsGenerating(true);
    setView('grocery');
    // For now, generate for ALL recipes. In future, could select specific ones.
    const list = await generateGroceryList(recipes);
    setGroceryList(list);
    setIsGenerating(false);
  };

  // --- RENDER ---

  if (loading) {
      return (
          <div className="h-full flex items-center justify-center bg-paper">
              <Loader2 className="w-8 h-8 animate-spin text-ink" />
          </div>
      );
  }

  if (view === 'prep' && selectedRecipe) {
    return (
      <PrepMode 
        recipe={selectedRecipe} 
        prepState={prepState}
        togglePrep={handleTogglePrep}
        onClose={() => setView('list')}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-paper text-ink relative max-w-2xl mx-auto w-full shadow-2xl">
      {/* HEADER */}
      <header className="px-6 py-4 bg-white border-b-2 border-ink flex justify-between items-center sticky top-0 z-10">
        <div>
            <h1 className="text-2xl font-display font-black tracking-tight">CHEFBOARD</h1>
             <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                {syncStatus === 'syncing' && <><Loader2 className="w-3 h-3 animate-spin"/> Syncing</>}
                {syncStatus === 'saved' && <><Check className="w-3 h-3"/> Saved</>}
                {syncStatus === 'error' && <span className="text-red-500">Sync Error</span>}
                {syncStatus === 'idle' && <span>Ready</span>}
             </div>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => handleGenerateList()}
                className="p-2 rounded-full bg-teal text-ink border-2 border-ink shadow-hard-sm hover:translate-y-0.5 hover:shadow-none transition-all"
                title="Grocery List"
            >
                <ShoppingBag className="w-5 h-5" />
            </button>
            <button 
                onClick={() => { setSelectedRecipe(null); setView('edit'); }}
                className="p-2 rounded-full bg-ink text-paper items-center gap-1 shadow-hard-sm hover:translate-y-0.5 hover:shadow-none transition-all"
            >
                <Plus className="w-5 h-5" />
            </button>
        </div>
      </header>

      {/* BODY */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-20 scrollbar-hide">
        {view === 'list' && (
            <div className="space-y-4">
                {recipes.length === 0 && (
                    <div className="text-center py-20 opacity-50">
                        <ChefHat className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p className="font-display text-xl">No Recipes Yet</p>
                        <p className="font-body">Add your first tasty dish!</p>
                    </div>
                )}
                {recipes.map(recipe => (
                    <RecipeCard 
                        key={recipe.id} 
                        recipe={recipe} 
                        onEdit={() => { setSelectedRecipe(recipe); setView('edit'); }}
                        onPrep={() => { setSelectedRecipe(recipe); setView('prep'); }}
                    />
                ))}
            </div>
        )}

        {view === 'edit' && (
             <RecipeEditor 
                recipe={selectedRecipe || {}} 
                onSave={handleSaveRecipe} 
                onCancel={() => setView('list')}
                onDelete={handleDeleteRecipe}
             />
        )}

        {view === 'grocery' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-display text-2xl font-bold">Grocery List</h2>
                    <button onClick={() => setView('list')} className="text-sm font-bold underline">Close</button>
                </div>
                {isGenerating ? (
                    <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-300 rounded-xl">
                        <Loader2 className="w-8 h-8 animate-spin text-teal mb-2" />
                        <p className="font-bold animate-pulse">Consulting the AI Chef...</p>
                    </div>
                ) : (
                    <div className="prose prose-sm max-w-none bg-white p-6 rounded-xl border-2 border-ink shadow-hard font-body">
                         <div dangerouslySetInnerHTML={{ __html: groceryList.replace(/\n/g, '<br/>') }} />
                         {/* Note: In a real app we'd markdown render this properly */}
                    </div>
                )}
            </div>
        )}
      </main>
    </div>
  );
};

// --- SUB-COMPONENTS ---

const RecipeCard = ({ recipe, onEdit, onPrep }) => {
    return (
        <div className="bg-white border-2 border-ink rounded-xl p-4 shadow-hard transition-all hover:-translate-y-0.5 group">
            <div className="flex justify-between items-start mb-3">
                <h3 className="font-display text-lg font-bold leading-tight">{recipe.title}</h3>
                <div className="flex gap-1">
                   <button onClick={onEdit} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-ink transition"><MoreHorizontal className="w-4 h-4" /></button>
                </div>
            </div>
            
            <div className="flex gap-4 text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
                <span>{recipe.prepTime}m Prep</span>
                <span>{recipe.cookTime}m Cook</span>
                <span>{recipe.servings} Serves</span>
            </div>

            <button 
                onClick={onPrep}
                className="w-full py-2.5 rounded-lg bg-paper border-2 border-ink font-bold text-ink flex items-center justify-center gap-2 group-hover:bg-teal group-hover:border-ink transition-colors"
            >
                <ChefHat className="w-4 h-4" /> Start Cooking
            </button>
        </div>
    )
}

const RecipeEditor = ({ recipe, onSave, onCancel, onDelete }) => {
    const [formData, setFormData] = useState(() => {
        if (recipe.id) return recipe;
        return {
            id: Date.now().toString(),
            title: '',
            servings: 2,
            prepTime: 15,
            cookTime: 15,
            ingredients: [], 
            steps: [],
            notes: ''
        };
    });
    const [rawText, setRawText] = useState('');
    const [showImport, setShowImport] = useState(false);

    // Initial load helpers
    const [ingText, setIngText] = useState(() => {
        if (!recipe.ingredients) return '';
        return recipe.ingredients.map(i => {
            const prepStr = i.prep ? ` (${i.prep})` : '';
            return `${i.amount} ${i.name}${prepStr}`;
        }).join('\n');
    });
    const [stepText, setStepText] = useState(recipe.steps?.join('\n') || '');

    const parseRawText = () => {
        // Very basic parser: First line title, typical ingredient lines
        const lines = rawText.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length > 0) {
            const newData = { ...formData };
            if (!newData.title) newData.title = lines[0]; // Guess title is first line
            // This is a naive heuristic-based parser. Ideally use AI here too!
            // For now, let's just dump it into notes or try to be smart?
            // Let's just set notes for now to be safe
            newData.notes = rawText;
            setFormData(newData);
        }
        setShowImport(false);
    };

    const handleInternalSave = () => {
        // Parse the text areas back into arrays
        const ingredients = ingText.split('\n').filter(l => l.trim()).map(line => {
             // Simple split logic: First word is amount, rest is name. 
             // Improvements: Regex for fractions, units.
             const parts = line.split(' ');
             const amount = parts[0]; 
             const name = parts.slice(1).join(' ');
             return { name, amount, prep: '' };
        });

        const steps = stepText.split('\n').filter(l => l.trim());

        onSave({ ...formData, ingredients, steps });
    };

    return (
        <div className="bg-white rounded-xl shadow-hard border-2 border-ink p-4 space-y-4 animate-in slide-in-from-bottom-4">
             <div className="flex justify-between items-center mb-2">
                <h2 className="font-display text-xl font-bold">{recipe.id ? 'Edit Recipe' : 'New Recipe'}</h2>
                <button onClick={onCancel} className="p-1 px-3 text-sm font-bold bg-gray-100 rounded-lg">Cancel</button>
            </div>

            {/* Quick Import */}
            {!recipe.id && (
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <button 
                        onClick={() => setShowImport(!showImport)}
                        className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-500"
                    >
                        <span>Paste Raw Text</span>
                        {showImport ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                    </button>
                    {showImport && (
                        <div className="mt-2 space-y-2">
                            <textarea 
                                value={rawText}
                                onChange={e => setRawText(e.target.value)}
                                className="w-full h-24 p-2 text-xs border rounded bg-white font-mono"
                                placeholder="Paste recipe text here..."
                            />
                            <button onClick={parseRawText} className="w-full py-1 bg-ink text-white text-xs font-bold rounded">Auto-fill</button>
                        </div>
                    )}
                </div>
            )}

            {/* Basic Info */}
            <div>
                <label htmlFor="title" className="block text-xs font-bold uppercase text-gray-400 mb-1">Title</label>
                <input 
                    id="title" 
                    type="text" 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    placeholder="Grandma's Pancakes"
                    className="w-full text-xl font-display font-bold border-b-2 border-gray-200 focus:border-ink outline-none py-1 placeholder-gray-300"
                />
            </div>

            <div className="grid grid-cols-3 gap-2">
                {['servings', 'prepTime', 'cookTime'].map(k => (
                    <div key={k} className="bg-paper p-2 rounded border border-ink/10">
                         <label htmlFor={k} className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
                            {k.replace('Time', '')}
                         </label>
                         <input 
                            id={k} 
                            type="number" 
                            value={formData[k]}
                            onChange={e => setFormData({...formData, [k]: parseInt(e.target.value)||0})}
                            className="w-full bg-transparent font-bold text-ink outline-none"
                         />
                    </div>
                ))}
            </div>

            {/* Ingredients */}
            <div>
                <label htmlFor="ingredients" className="block text-xs font-bold uppercase text-gray-400 mb-1">Ingredients (One per line)</label>
                <textarea 
                    id="ingredients" 
                    value={ingText}
                    onChange={e => setIngText(e.target.value)}
                    placeholder="2 cups Flour&#10;1 tsp Salt"
                    className="w-full h-32 p-3 font-mono text-sm bg-gray-50 rounded-lg border border-gray-200 focus:border-ink outline-none resize-y"
                />
            </div>

             {/* Steps */}
             <div>
                <label htmlFor="steps" className="block text-xs font-bold uppercase text-gray-400 mb-1">Instructions (One per line)</label>
                <textarea 
                    id="steps" 
                    value={stepText}
                    onChange={e => setStepText(e.target.value)}
                    placeholder="Mix dry ingredients.&#10;Add wet ingredients."
                    className="w-full h-32 p-3 font-mono text-sm bg-gray-50 rounded-lg border border-gray-200 focus:border-ink outline-none resize-y"
                />
            </div>

            <div className="pt-4 flex gap-2">
                {recipe.id && (
                     <button 
                        onClick={() => onDelete(recipe.id)}
                        className="p-3 text-red-500 bg-red-50 rounded-xl font-bold border border-red-100"
                    >
                        <Trash2 className="w-5 h-5"/>
                    </button>
                )}
                <button 
                    onClick={handleInternalSave}
                    className="flex-1 py-3 bg-ink text-white rounded-xl font-bold shadow-hard active:translate-y-1 active:shadow-none transition flex items-center justify-center gap-2"
                >
                    <Save className="w-4 h-4" /> Save Recipe
                </button>
            </div>
        </div>
    )
}

export default RecipeManager;
