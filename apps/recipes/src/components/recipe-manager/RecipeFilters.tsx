import React from 'react'
import { ArrowDownAZ, Clock, Calendar, Search, ChefHat, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import type { Filters } from './hooks/useFilteredRecipes'

interface FilterSectionProps {
  title: string
  children: React.ReactNode
}

const FilterSection: React.FC<FilterSectionProps> = ({ title, children }) => (
  <div className="mb-6">
    <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-foreground-variant">
      {title}
    </h3>
    <div className="flex flex-wrap gap-2">{children}</div>
  </div>
)

interface FilterChipProps {
  label: string
  active?: boolean
  onClick: () => void
}

const FilterChip: React.FC<FilterChipProps> = ({ label, active, onClick }) => (
  <Badge
    variant={active ? 'default' : 'outline'}
    className={`hover:bg-secondary h-8 cursor-pointer rounded-full px-3 text-sm font-medium transition-all ${
      !active ? 'text-muted-foreground hover:text-foreground' : ''
    }`}
    onClick={onClick}
  >
    {label}
  </Badge>
)

interface RecipeFiltersProps {
  isOpen: boolean
  onClose: () => void
  filters: Filters
  setFilters: React.Dispatch<React.SetStateAction<Filters>>
  sort: string
  setSort: (sort: string) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
}

export const RecipeFilters: React.FC<RecipeFiltersProps> = ({
  isOpen,
  onClose,
  filters,
  setFilters,
  sort,
  setSort,
  searchQuery,
  setSearchQuery,
}) => {
  const handleFilterToggle = (key: keyof Filters, value: string) => {
    setFilters((prev) => {
      // Handle boolean toggle for onlyFavorites
      if (key === 'onlyFavorites') {
        return { ...prev, onlyFavorites: !prev.onlyFavorites }
      }

      const current = (prev[key] as string[]) || []
      if (current.includes(value)) {
        return { ...prev, [key]: current.filter((item) => item !== value) }
      } else {
        return { ...prev, [key]: [...current, value] }
      }
    })
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex w-full max-w-sm flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle className="text-left font-display text-xl font-bold">
            Sort & Filter
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Search */}
            <div className="relative">
              <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Search recipes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
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
                  <Button
                    key={opt.id}
                    variant={sort === opt.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSort(opt.id)}
                    className="justify-start"
                  >
                    <opt.icon className="mr-2 h-4 w-4" />
                    {opt.label}
                  </Button>
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
              {[
                'Vegan',
                'Vegetarian',
                'Gluten-Free',
                'Keto',
                'Paleo',
                'Dairy-Free',
                'Low-Carb',
              ].map((d) => (
                <FilterChip
                  key={d}
                  label={d}
                  active={filters.dietary?.includes(d)}
                  onClick={() => handleFilterToggle('dietary', d)}
                />
              ))}
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

            {/* Cuisine */}
            <FilterSection title="Cuisine">
              {['Italian', 'Mexican', 'Asian', 'American', 'Mediterranean', 'Vegetarian'].map(
                (c) => (
                  <FilterChip
                    key={c}
                    label={c}
                    active={filters.cuisine?.includes(c)}
                    onClick={() => handleFilterToggle('cuisine', c)}
                  />
                ),
              )}
            </FilterSection>

            <div className="text-muted-foreground pt-8 text-center text-xs">
              <button
                onClick={() => {
                  setFilters({})
                  setSort('protein')
                  setSearchQuery('')
                }}
                className="hover:text-primary underline"
              >
                Reset all filters
              </button>
            </div>
          </div>
        </div>

        <SheetFooter className="border-t p-4 sm:justify-center">
          <Button onClick={onClose} className="w-full rounded-full" size="lg">
            Show Recipes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
