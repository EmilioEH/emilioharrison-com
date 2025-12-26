import React, { useState, useEffect, useMemo } from 'react'
import {
  Check,
  Trash2,
  Share,
  Copy,
  ArrowLeft,
  ShoppingBasket
} from 'lucide-react'
import { mergeIngredients, categorizeIngredients } from '../../lib/grocery-logic'
import type { StructuredIngredient } from '../../lib/types'

interface GroceryListProps {
  ingredients: StructuredIngredient[]
  onClose: () => void
}

export const GroceryList: React.FC<GroceryListProps> = ({ ingredients, onClose }) => {
  // 1. Merge & Categorize (Memoized)
  const categorizedList = useMemo(() => {
    const merged = mergeIngredients(ingredients)
    return categorizeIngredients(merged)
  }, [ingredients])

  // 2. Checked State (Persisted)
  const [checkedItems, setCheckedItems] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('grocery-checked')
      if (saved) {
        return new Set(JSON.parse(saved))
      }
    }
    return new Set()
  })

  // Persist effect
  useEffect(() => {
    localStorage.setItem('grocery-checked', JSON.stringify(Array.from(checkedItems)))
  }, [checkedItems])

  const toggleItem = (name: string) => {
    const next = new Set(checkedItems)
    if (next.has(name)) {
      next.delete(name)
    } else {
      next.add(name)
    }
    setCheckedItems(next)
  }

  const clearChecked = () => {
    if (confirm('Remove all checked items?')) {
      // User confirmed
      setCheckedItems(new Set())
    }
  }

  // 3. Sharing
  const copyToClipboard = async () => {
    const text = categorizedList
      .map(cat => {
        const items = cat.items
          .filter(i => !checkedItems.has(i.name)) // Only copy unchecked? Or all? Usually all.
          .map(i => `- ${i.amount > 0 ? i.amount + ' ' : ''}${i.unit !== 'unit' ? i.unit + ' ' : ''}${i.name}`)
          .join('\n')
        return `## ${cat.name}\n${items}`
      })
      .join('\n\n')

    try {
      await navigator.clipboard.writeText(text)
      alert('Copied to clipboard!')
    } catch (err) {
      console.error('Failed to copy', err)
    }
  }

  const shareList = async () => {
    const text = categorizedList
      .map(cat => cat.items.map(i => `- ${i.amount} ${i.unit} ${i.name}`).join('\n'))
      .join('\n\n')
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Grocery List',
          text: text,
        })
      } catch {
         // ignore abort
      }
    } else {
      copyToClipboard()
    }
  }
  
  const totalCount = ingredients.length
  const checkedCount = Array.from(checkedItems).filter(name => 
    categorizedList.some(cat => cat.items.some(i => i.name === name))
  ).length

  return (
    <div className="flex bg-md-sys-color-surface flex-col h-full animate-in slide-in-from-right-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-md-sys-color-outline bg-md-sys-color-surface sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button 
             onClick={onClose}
             className="p-2 -ml-2 rounded-full hover:bg-md-sys-color-surface-variant text-md-sys-color-on-surface"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
             <h2 className="text-xl font-bold font-display text-md-sys-color-on-surface">Grocery List</h2>
             <p className="text-xs text-md-sys-color-on-surface-variant font-medium">
               {totalCount} items &bull; {Math.round((checkedCount / (categorizedList.reduce((acc, c) => acc + c.items.length, 0) || 1)) * 100)}% done
             </p>
          </div>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={shareList}
             className="p-2 rounded-full hover:bg-md-sys-color-surface-variant text-md-sys-color-primary"
             title="Share"
           >
             <Share className="w-5 h-5" />
           </button>
           <button 
             onClick={copyToClipboard}
             className="p-2 rounded-full hover:bg-md-sys-color-surface-variant text-md-sys-color-primary"
             title="Copy"
           >
             <Copy className="w-5 h-5" />
           </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
        {categorizedList.map((category) => (
          <div key={category.name} className="animate-in fade-in duration-500">
            <h3 className="text-sm font-bold uppercase tracking-wider text-md-sys-color-primary mb-3 px-2">
              {category.name}
            </h3>
            <div className="bg-md-sys-color-surface-container-low rounded-xl overflow-hidden shadow-sm border border-md-sys-color-outline-variant">
              {category.items.map((item) => {
                const isChecked = checkedItems.has(item.name)
                return (
                  <button 
                    key={`${item.name}-${item.unit}`}
                    type="button"
                    onClick={() => toggleItem(item.name)}
                    aria-pressed={isChecked}
                    className={`
                      flex w-full items-center justify-between p-4 border-b border-md-sys-color-outline-variant last:border-0 cursor-pointer transition-colors text-left
                      ${isChecked ? 'bg-md-sys-color-surface-container-high opacity-50' : 'hover:bg-md-sys-color-surface-container'}
                    `}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`
                        w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                        ${isChecked 
                            ? 'bg-md-sys-color-primary border-md-sys-color-primary' 
                            : 'border-md-sys-color-outline hover:border-md-sys-color-primary'}
                      `}>
                        {isChecked && <Check className="w-3.5 h-3.5 text-md-sys-color-on-primary" />}
                      </div>
                      <div className={isChecked ? 'line-through text-md-sys-color-on-surface-variant' : 'text-md-sys-color-on-surface'}>
                        <span className="font-bold font-display mr-1 text-lg">
                           {item.amount > 0 ? Math.round(item.amount * 100) / 100 : ''}
                        </span>
                        <span className="text-sm font-medium opacity-80 mr-2">{item.unit !== 'unit' ? item.unit : ''}</span>
                        <span className="font-medium capitalize">{item.name}</span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        
        {categorizedList.length === 0 && (
           <div className="text-center py-20 opacity-50">
             <ShoppingBasket className="w-16 h-16 mx-auto mb-4 text-gray-300" />
             <p>No ingredients found.</p>
           </div>
        )}
      </div>
      
      {/* Floating Action / Footer */}
      {checkedItems.size > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
           <button
             onClick={clearChecked}
             className="flex items-center gap-2 bg-md-sys-color-inverse-surface text-md-sys-color-inverse-on-surface px-6 py-3 rounded-full shadow-lg font-medium hover:scale-105 transition-transform"
           >
             <Trash2 className="w-4 h-4" /> Uncheck All
           </button>
        </div>
      )}
    </div>
  )
}
