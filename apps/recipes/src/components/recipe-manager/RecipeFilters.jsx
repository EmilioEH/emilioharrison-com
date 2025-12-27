import React from 'react'
import { X, ArrowDownAZ, Clock, Calendar, Search, ChefHat, Star, Heart } from 'lucide-react'

const FilterSection = ({ title, children }) => (
  <div className="mb-6">
    <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-md-sys-color-on-surface-variant">
      {title}
    </h3>
    <div className="flex flex-wrap gap-2">{children}</div>
  </div>
)

const FilterChip = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`rounded-md-s border px-3 py-1 text-sm font-medium transition-all ${
      active
        ? 'border-md-sys-color-primary bg-md-sys-color-primary-container text-md-sys-color-on-primary-container'
        : 'hover:bg-md-sys-color-on-surface/[0.04] border-md-sys-color-outline bg-md-sys-color-surface text-md-sys-color-on-surface'
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
    <div className="animate-in fade-in bg-md-sys-color-on-surface/20 fixed inset-0 z-50 flex justify-end backdrop-blur-sm transition-opacity">
      <div className="animate-in slide-in-from-right h-full w-full max-w-xs overflow-y-auto bg-md-sys-color-surface shadow-md-3 duration-300">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-md-sys-color-outline bg-md-sys-color-surface px-6 py-4">
          <h2 className="font-display text-xl font-bold text-md-sys-color-on-surface">
            Sort & Filter
          </h2>
          <button
            onClick={onClose}
            className="hover:bg-md-sys-color-on-surface/[0.08] rounded-full p-2"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-md-sys-color-on-surface" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-md-sys-color-on-surface-variant" />
            <input
              type="text"
              placeholder="Search recipes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md-s border border-md-sys-color-outline bg-md-sys-color-surface-variant p-2 pl-9 pr-3 text-sm font-medium outline-none focus:ring-2 focus:ring-md-sys-color-primary"
            />
          </div>

          {/* Sort */}
          <FilterSection title="Sort By">
            <div className="grid grid-cols-1 gap-2">
              {[
                { id: 'protein', label: 'Protein', icon: ChefHat },
                { id: 'mealType', label: 'Meal Type', icon: Star },
                { id: 'dishType', label: 'Dish Type', icon: Star },
                { id: 'alpha', label: 'Alphabetical', icon: ArrowDownAZ },
                { id: 'recent', label: 'Most Recent', icon: Calendar },
                { id: 'time', label: 'Shortest Time', icon: Clock },
                { id: 'rating', label: 'Highest Rated', icon: Star },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSort(opt.id)}
                  className={`flex items-center gap-2 rounded-md-s border px-3 py-2 text-sm font-medium transition-all ${
                    sort === opt.id
                      ? 'border-md-sys-color-primary bg-md-sys-color-primary-container text-md-sys-color-on-primary-container'
                      : 'bg-md-sys-color-surface-variant/40 hover:bg-md-sys-color-surface-variant/60 border-transparent text-md-sys-color-on-surface-variant'
                  }`}
                >
                  <opt.icon className="h-4 w-4" />
                  {opt.label}
                </button>
              ))}
            </div>
          </FilterSection>

          {/* Special Filters */}
          <FilterSection title="Show">
            <FilterChip
              label="Favorites Only"
              active={filters.onlyFavorites}
              onClick={() =>
                setFilters((prev) => ({ ...prev, onlyFavorites: !prev.onlyFavorites }))
              }
            />
          </FilterSection>

          {/* Meal Type */}
          <FilterSection title="Meal Type">
            {['Breakfast', 'Brunch', 'Lunch', 'Dinner', 'Snack', 'Dessert'].map((t) => (
              <FilterChip
                key={t}
                label={t}
                active={filters.mealType?.includes(t)}
                onClick={() => handleFilterToggle('mealType', t)}
              />
            ))}
          </FilterSection>

          {/* Dish Type */}
          <FilterSection title="Dish Type">
            {['Main', 'Side', 'Appetizer', 'Salad', 'Soup', 'Drink', 'Sauce'].map((t) => (
              <FilterChip
                key={t}
                label={t}
                active={filters.dishType?.includes(t)}
                onClick={() => handleFilterToggle('dishType', t)}
              />
            ))}
          </FilterSection>

          {/* Protein */}
          <FilterSection title="Protein">
            {['Chicken', 'Beef', 'Pork', 'Fish', 'Seafood', 'Vegetarian', 'Vegan', 'Other'].map(
              (p) => (
                <FilterChip
                  key={p}
                  label={p}
                  active={filters.protein?.includes(p)}
                  onClick={() => handleFilterToggle('protein', p)}
                />
              ),
            )}
          </FilterSection>

          {/* Dietary */}
          <FilterSection title="Dietary">
            {['Vegan', 'Vegetarian', 'Gluten-Free', 'Keto', 'Paleo', 'Dairy-Free', 'Low-Carb'].map(
              (d) => (
                <FilterChip
                  key={d}
                  label={d}
                  active={filters.dietary?.includes(d)}
                  onClick={() => handleFilterToggle('dietary', d)}
                />
              ),
            )}
          </FilterSection>

          {/* Equipment */}
          <FilterSection title="Equipment">
            {['Air Fryer', 'Slow Cooker', 'Instant Pot', 'Blender', 'Sheet Pan', 'Grill'].map(
              (e) => (
                <FilterChip
                  key={e}
                  label={e}
                  active={filters.equipment?.includes(e)}
                  onClick={() => handleFilterToggle('equipment', e)}
                />
              ),
            )}
          </FilterSection>

          {/* Occasion */}
          <FilterSection title="Occasion">
            {['Weeknight', 'Party', 'Holiday', 'Date Night', 'Kid-Friendly', 'Quick'].map((o) => (
              <FilterChip
                key={o}
                label={o}
                active={filters.occasion?.includes(o)}
                onClick={() => handleFilterToggle('occasion', o)}
              />
            ))}
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

          <div className="pt-8 text-center text-xs text-md-sys-color-on-surface-variant">
            <button
              onClick={() => {
                setFilters({})
                setSort('protein')
                setSearchQuery('')
              }}
              className="underline hover:text-md-sys-color-primary"
            >
              Reset all filters
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
