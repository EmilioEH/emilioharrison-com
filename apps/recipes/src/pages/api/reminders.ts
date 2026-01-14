import type { APIRoute } from 'astro'
import { getAuthUser, unauthorizedResponse } from '../../lib/api-helpers'
import { db } from '../../lib/firebase-server'
import type { User, FamilyRecipeData } from '../../lib/types'
import { startOfWeek, addWeeks, format, parseISO, startOfDay, addDays } from 'date-fns'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export const GET: APIRoute = async ({ cookies }) => {
  const userId = getAuthUser(cookies)
  if (!userId) return unauthorizedResponse()

  try {
    // 1. Get User preferences
    const userDoc = (await db.getDocument('users', userId)) as User
    if (!userDoc || !userDoc.notificationPreferences?.reminders) {
      return new Response(JSON.stringify({ reminders: [] }), { status: 200 })
    }

    const prefs = userDoc.notificationPreferences.reminders
    const familyId = userDoc.familyId

    if (!familyId) {
      return new Response(JSON.stringify({ reminders: [] }), { status: 200 })
    }

    // 2. Get Planned Recipes for Family
    // We need to check plan for "Next Week" (for planning reminder) and "This Week" (for grocery/daily)
    // Firestore REST API filtering is limited, but we can fetch all recipeData for the family
    // Optimization: In a real large app, we would use a collection group query or specific index
    // For now, fetching family recipeData is okay as it only contains metadata (notes, plans) not full recipes

    // Actually, `recipeData` might be large if many notes.
    // Let's rely on client side or just fetch all for now, assuming < 1000 items.
    const familyDataPath = `families/${familyId}/recipeData`
    const recipeDataDocs = await db.getCollection(familyDataPath)

    // getCollection returns the array of documents directly
    const plannedRecipes = (recipeDataDocs || [])
      .map((doc: FamilyRecipeData) => {
        // Firestore REST returns fields in a specific way, but our helper `listCollection`
        // might return raw Firestore REST format OR processed.
        // Looking at firebase-rest.ts would confirm.
        // Usually db.listCollection returns array of objects if using a good helper.
        // Let's assume our `db` helper normalizes it, or check `firebase-rest.ts`.
        // Wait, I should check `firebase-rest.ts` to be safe.
        return doc
      })
      .filter((d: FamilyRecipeData) => d.weekPlan?.isPlanned && d.weekPlan?.assignedDate)

    const reminders = []
    const now = new Date()
    const todayStr = format(now, 'yyyy-MM-dd')
    const nextWeekStart = startOfWeek(addWeeks(now, 1), { weekStartsOn: 1 }) // Monday

    // --- 3. Calculate Reminders ---

    // A. Weekly Meal Planning Reminder
    // "Remind me to plan NEXT week's meals"
    if (prefs.weeklyPlan?.enabled && prefs.weeklyPlan.day && prefs.weeklyPlan.time) {
      const { day, time } = prefs.weeklyPlan

      // Calculate next occurrence of this day/time
      const [hour, minute] = time.split(':').map(Number)
      const dayIndex = DAYS.indexOf(day)

      // Find the next date that matches this day
      // If today is the day, and time hasn't passed, use today.
      // If today is the day and time PASSED, use next week.
      const currentDayIndex = now.getDay()
      const daysUntil = (dayIndex - currentDayIndex + 7) % 7

      let targetDate = addDays(startOfDay(now), daysUntil)
      targetDate.setHours(hour, minute, 0, 0)

      if (daysUntil === 0 && targetDate < now) {
        targetDate = addDays(targetDate, 7)
      }

      // Check how many meals planned for NEXT week
      const nextWeekStartStr = format(nextWeekStart, 'yyyy-MM-dd')
      const plannedForNextWeek = plannedRecipes.filter((r: FamilyRecipeData) => {
        const date = parseISO(r.weekPlan!.assignedDate!)
        const weekStart = startOfWeek(date, { weekStartsOn: 1 })
        return format(weekStart, 'yyyy-MM-dd') === nextWeekStartStr
      })

      reminders.push({
        type: 'weekly_plan',
        title: "Plan Next Week's Meals",
        body: `You have ${plannedForNextWeek.length} meals planned for next week.`,
        scheduledFor: targetDate.toISOString(),
      })
    }

    // B. Grocery List Reminder
    // "Remind me to generate list for THIS week (or upcoming)"
    if (prefs.groceryList?.enabled && prefs.groceryList.day && prefs.groceryList.time) {
      const { day, time } = prefs.groceryList
      const [hour, minute] = time.split(':').map(Number)
      const dayIndex = DAYS.indexOf(day)

      let targetDate = addDays(startOfDay(now), (dayIndex - now.getDay() + 7) % 7)
      targetDate.setHours(hour, minute, 0, 0)

      if (targetDate < now) {
        targetDate = addDays(targetDate, 7)
      }

      // Count meals for the relevant week (usually next week if reminding on Sunday, or this week if Monday)
      // Let's check "Upcoming" meals (today onwards)
      const upcomingMeals = plannedRecipes.filter(
        (r: FamilyRecipeData) => r.weekPlan!.assignedDate! >= todayStr,
      ).length

      reminders.push({
        type: 'grocery_list',
        title: 'Grocery List',
        body: `You have ${upcomingMeals} upcoming meals. Don't forget your shopping list!`,
        scheduledFor: targetDate.toISOString(),
      })
    }

    // C. Daily Cooking Reminder
    // "Remind me what to cook TODAY"
    if (prefs.dailyCooking?.enabled) {
      // Find today's cleaning
      const todaysMeals = plannedRecipes.filter(
        (r: FamilyRecipeData) => r.weekPlan?.assignedDate === todayStr,
      )

      todaysMeals.forEach((_meal: FamilyRecipeData) => {
        // When to remind? (e.g. 5 PM minus offset)
        // Default dinner time 6 PM?
        // Or just remind at "Offset before Dinner"?
        // Since we don't know meal TYPE time (Lunch/Dinner), let's assume 6 PM for now
        // OR use the `mealType` if available mapped to time.
        // Simply: Remind at 4 PM (16:00) by default if offset is 2 hours.

        // Let's assume Dinner = 18:00
        const bannerTime = 18
        const offset = prefs.dailyCooking.offsetHours || 2
        const remindHour = bannerTime - offset

        const targetDate = new Date(now)
        targetDate.setHours(remindHour, 0, 0, 0)

        // Only schedule if it hasn't passed (or maybe just show "It's time")
        // If passed, maybe don't schedule via SW, but client might show immediate notif?
        // For SW schedule, needs to be future.
        if (targetDate > now) {
          // Fetch recipe title? detailed data might not be in recipeData.
          // recipeData has `id`. We might need to fetch title.
          // BUT fetching individual recipe titles is expensive.
          // Check if recipeData has title denormalized? `familyStore` says `weekPlan` has `addedByName`.
          // The `PlannedRecipe` type has `recipeId`.
          // We might need to genericize: "You have a meal planned!"
          // Or fetch the title from a cache/store if possible.
          // For now, generic: "Time to cook!"

          reminders.push({
            type: 'daily_cooking',
            title: 'Time to Cook!',
            body: "Check your meal plan for today's recipe.",
            scheduledFor: targetDate.toISOString(),
          })
        }
      })
    }

    return new Response(JSON.stringify({ reminders }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('Reminders API Error:', e)
    return new Response(JSON.stringify({ error: 'Internal Error' }), { status: 500 })
  }
}
