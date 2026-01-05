import React from 'react'
import { ArrowDownAZ, Clock, Calendar, ChefHat, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Stack } from '@/components/ui/layout'
import type { Filters } from './hooks/useFilteredRecipes'

interface FilterSectionProps {
  title: string
  children: React.ReactNode
}

const FilterSection: React.FC<FilterSectionProps> = ({ title, children }) => (
  <div className="mb-4">
    <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
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
  <button onClick={onClick} className="focus:outline-none" aria-pressed={active}>
    <Badge
      variant={active ? 'active' : 'inactive'}
      size="lg"
      className="cursor-pointer transition-all"
    >
      {label}
    </Badge>
  </button>
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
          <Stack spacing="lg">
            {/* Sort */}
            <FilterSection title="Sort By">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'protein', label: 'Protein', icon: ChefHat },
                  { id: 'mealType', label: 'Meal Type', icon: Star },
                  { id: 'dishType', label: 'Dish Type', icon: Star },
                  { id: 'alpha', label: 'A-Z', icon: ArrowDownAZ },
                  { id: 'recent', label: 'Recent', icon: Calendar },
                  { id: 'time', label: 'Time', icon: Clock },
                  { id: 'rating', label: 'Rating', icon: Star },
                ].map((opt) => (
                  <Button
                    key={opt.id}
                    variant={sort === opt.id ? 'default' : 'outline'}
                    size="default"
                    onClick={() => setSort(opt.id)}
                    className="justify-start text-sm"
                  >
                    <opt.icon className="mr-1.5" />
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

            {/* Protein - Priority 1 for variety */}
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

            {/* Meal Type - Priority 2 for planning */}
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

            {/* Cuisine - Priority 3 for variety */}
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

            {/* Difficulty - Priority 4 for balancing easy vs complex */}
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

            <div className="pt-8 text-center">
              <Button
                variant="link"
                size="sm"
                onClick={() => {
                  setFilters({})
                  setSort('protein')
                }}
              >
                Reset all filters
              </Button>
            </div>
          </Stack>
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
