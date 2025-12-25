import React from 'react'
import { X, ArrowDownAZ, Clock, Calendar, Search } from 'lucide-react'

const FilterSection = ({ title, children }) => (
  <div className="mb-6">
    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">{title}</h3>
    <div className="flex flex-wrap gap-2">{children}</div>
  </div>
)

const FilterChip = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`rounded-full border-2 px-3 py-1 text-sm font-bold transition-all ${
      active
        ? 'border-ink bg-ink text-white'
        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
    }`}
  >
    {label}
  </button>
)

export const RecipeFilters = ({
  isOpen,
  onClose,
  filters,
  setFilters,
  sort,
  setSort,
  searchQuery,
  setSearchQuery,
}) => {
  if (!isOpen) return null

  const handleFilterToggle = (key, value) => {
    setFilters((prev) => {
      const current = prev[key] || []
      if (current.includes(value)) {
        return { ...prev, [key]: current.filter((item) => item !== value) }
      } else {
        return { ...prev, [key]: [...current, value] }
      }
    })
  }

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm transition-opacity">
      <div className="animate-in slide-in-from-right h-full w-full max-w-xs overflow-y-auto bg-paper shadow-2xl duration-300">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-ink bg-white px-6 py-4">
          <h2 className="font-display text-xl font-bold">Sort & Filter</h2>
          <button onClick={onClose} className="rounded-full bg-gray-100 p-2 hover:bg-gray-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search recipes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border-2 border-gray-200 bg-white py-2 pl-9 pr-3 text-sm font-bold outline-none focus:border-ink"
            />
          </div>

          {/* Sort */}
          <FilterSection title="Sort By">
            <div className="grid grid-cols-1 gap-2">
              {[
                { id: 'alpha', label: 'Alphabetical', icon: ArrowDownAZ },
                { id: 'recent', label: 'Most Recent', icon: Calendar },
                { id: 'time', label: 'Shortest Time', icon: Clock },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSort(opt.id)}
                  className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm font-bold transition-all ${
                    sort === opt.id
                      ? 'text-teal-800 border-teal bg-teal/10'
                      : 'border-transparent bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <opt.icon className="h-4 w-4" />
                  {opt.label}
                </button>
              ))}
            </div>
          </FilterSection>

          {/* Difficulty */}
          <FilterSection title="Difficulty">
            {['Easy', 'Medium', 'Hard'].map((diff) => (
              <FilterChip
                key={diff}
                label={diff}
                active={filters.difficulty?.includes(diff)}
                onClick={() => handleFilterToggle('difficulty', diff)}
              />
            ))}
          </FilterSection>

          {/* Cuisine - Hardcoded common ones for now, could be dynamic */}
          <FilterSection title="Cuisine">
            {['Italian', 'Mexican', 'Asian', 'American', 'Mediterranean', 'Vegetarian'].map((c) => (
              <FilterChip
                key={c}
                label={c}
                active={filters.cuisine?.includes(c)}
                onClick={() => handleFilterToggle('cuisine', c)}
              />
            ))}
          </FilterSection>

          <div className="pt-8 text-center text-xs text-gray-400">
            <button
              onClick={() => {
                setFilters({})
                setSort('alpha')
                setSearchQuery('')
              }}
              className="underline hover:text-ink"
            >
              Reset all filters
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
