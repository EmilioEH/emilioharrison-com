# User Journey: The Integrated Food Cycle

This document outlines the user interaction models for the Recipe App, focusing on the four key actions: Adding a New Recipe, Planning the Week, Shopping, and Cooking.

## Overview of Frequencies

- **Bi-Weekly:** Adding new recipes (Discovery/Maintenance).
- **Weekly:** Planning the week (Decision Making).
- **Weekly:** Shopping (Execution - Batch).
- **Weekly (Frequent Access):** Cooking (Execution - Real-time).

---

## 1. Discovery & Expansion (Adding a New Recipe)

> frequency: **Bi-Weekly** | context: **Desktop or Relaxed Mobile**

**User Goal:** Expand their personal cookbook with a new find from the web or a family tradition.

**Interaction Model: "The Editor"**
Since this happens fast less frequently, the user is willing to spend more time here, but it should still be efficient.

- **Entry Point:** Floating Action Button (FAB) or "New Recipe" button in the library header.
- **The Flow:**
  1.  **Input:** User provides a source (URL import) or selects "Manual Entry".
  2.  **Processing (for changes):** If importing, the app parses the content.
  3.  **Review/Edit:** The user lands on a form view. They verify the ingredients and steps.
  4.  **Save:** Commits the recipe to the "Library".
- **Key UX Attributes:**
  - **Focus:** Clean input fields, auto-formatting.
  - **Validation:** Ensure essential data (title, ingredients) is present.

## 2. The Weekly Ritual (Add Recipe to Week)

> frequency: **Weekly** | context: **Sunday Planning, Couch/Commute**

**User Goal:** Curate the menu for the upcoming week to generate a shopping list.

**Interaction Model: "The Shopper"**
This is a high-volume, low-friction interaction. The user wants to scan their library and quickly toggle items.

- **Entry Point:** The "Recipe Library" view.
- **The Flow:**
  1.  **Browse:** User scrolls through their collection.
  2.  **Toggle:** User taps a specific "Add to Week" action (e.g., a calendar icon or a 'plus' button on the card).
  3.  **Feedback:** The icon changes state (active color), and a global counter might update ("3 recipes selected").
- **Key UX Attributes:**
  - **Speed:** Instant toggling without opening the full recipe details.
  - **Visibility:** Clear visual indicator of what is currently "in the week".

## 3. The Supply Run (See Grocery List)

> frequency: **Weekly** | context: **Grocery Store, Mobile, On-the-go**

**User Goal:** Efficiently acquire all necessary ingredients for the planned recipes.

**Interaction Model: "The Checklist"**

- **Entry Point:** A dedicated "Grocery List" tab or button, prominent after the planning phase.
- **The Flow:**
  1.  **View:** User sees an aggregated list of ingredients from all "This Week" recipes.
  2.  **Check-off:** As they pick up items, they tap to strike them through.
  3.  **Cleanup:** Verified items move to a "completed" section or fade out.
- **Key UX Attributes:**
  - **Organization:** Items should be grouped by category (Produce, Dairy, Spices) to match store layout.
  - **One-Handed Use:** Large touch targets for easy checking while pushing a cart.

## 4. The Cook (Open a Recipe)

> frequency: **Weekly (per recipe)** | Intensity: **High (Multiple checks per session)** | context: **Kitchen, messy hands**

**User Goal:** Successfully execute the recipe steps to create the meal.

**Interaction Model: "The Reference"**
This is the most critical/intense interaction. The user opens the recipe once for the event, but _references_ it constantly throughout the cooking process.

### Entry Points

- **Primary:** "This Week" view → tap recipe card
- **Secondary:** Recipe Library → tap recipe card
- **Tertiary:** Grocery List → tap recipe name/link

### The Complete Cooking Journey

#### **Stage 1: Pre-Cook (Preparation Phase)**

**Time:** 2-5 minutes before cooking begins  
**User State:** Standing at counter, phone propped or held, relatively clean hands

1. **Open Recipe**
   - User taps the recipe card from "This Week" view
   - Recipe detail page loads instantly
2. **Get the Overview**
   - User scans the recipe header for:
     - Total time (to validate timing)
     - Serving size (to verify portions)
     - Visual reference (hero image shows the end goal)
   - Mental note: "Can I finish this in time?"

3. **Gather Ingredients**
   - User scrolls to ingredients section
   - Physically collects items from:
     - Refrigerator
     - Pantry
     - Shopping bags (if just returned from store)
   - **Interaction Pattern:** Glance → collect → glance back → verify
   - Optional: User may check off ingredients as they gather them (if checkboxes available)

4. **Prep Work Assessment**
   - User scans the first 2-3 steps to identify prep needs:
     - "Dice 1 onion" → get cutting board
     - "Preheat oven to 375°F" → turn on oven now
   - Mental model: "What do I need to do before I start?"

#### **Stage 2: Active Cook (Execution Phase)**

**Time:** 15-45 minutes  
**User State:** Moving between stove/counter/sink, often with messy hands (flour, oil, sauce)

1. **Start Cooking**
   - User scrolls to instructions
   - Begins executing Step 1
   - Device is now in a semi-permanent position (propped against wall, on stand, etc.)

2. **The Reference Loop** (Repeats 5-15 times per recipe)
   - **Trigger:** User completes a step or needs to verify something
   - **Action:**
     - Glances at screen from 2-3 feet away
     - Reads current/next step
     - Checks quantities, temperatures, or timing
   - **Context Challenges:**
     - Hands may be wet, oily, or covered in food
     - User cannot touch screen easily
     - Time pressure (food is cooking/burning)
3. **Step Progression**
   - After completing each step, user needs to:
     - Know they finished it (mental checkbox)
     - See what comes next
   - **Interaction Patterns:**
     - **Passive:** Just scroll down to see next step
     - **Active:** Tap step to mark as "done" and highlight next one
   - **Critical:** User should never lose their place

4. **Mid-Cook Checks**
   - User frequently re-references:
     - Timer durations: "How long did it say to simmer?"
     - Quantities: "Was it 2 tablespoons or 2 teaspoons?"
     - Ingredient names: "Which one was the cumin?"
   - **Interaction:** Quick scroll up to ingredients or previous steps

#### **Stage 3: Post-Cook (Completion Phase)**

**Time:** 30 seconds  
**User State:** Food is plated, hands are clean, feeling accomplished

1. **Mark as Complete** (Optional)
   - User may want to:
     - Mark recipe as "cooked" for tracking
     - Remove it from "This Week" view
     - Add a note: "Needed more garlic" or "Kids loved it!"

2. **Clean Exit**
   - User navigates away from recipe detail
   - Returns to "This Week" view to see remaining meals
   - Or closes app entirely

### Key UX Attributes

#### **Readability (Critical)**

- **Typography:** Extra-large font sizes (18-20px for body, 24-28px for headings)
- **Contrast:** High contrast for legibility from 2-3 feet away
- **Hierarchy:** Clear visual separation between steps

#### **Hands-Free Operation**

- **Voice Commands (Future):** "Next step" / "Set timer for 10 minutes"
- **Gesture Control (Future):** Wave hand to advance
- **Current Solution:** Large scroll areas, auto-scrolling options

#### **Screen Management**

- **Keep Awake:** Prevent auto-lock while recipe is open
- **Brightness:** Maintain visibility even in bright kitchen lighting

#### **Progress Tracking**

- **Step Counter:** "Step 3 of 8" helps user gauge progress
- **Visual Feedback:** Completed steps are grayed out or checked
- **Current Step Highlight:** Active step is emphasized with color/border

#### **Quick Recovery**

- **Scroll Position:** If user accidentally scrolls, easy to return to current step
- **Breadcrumbs:** "You're on Step 5: Simmer sauce"

#### **Error Prevention**

- **Clear Instructions:** Unambiguous steps ("2 tablespoons" not "2T")
- **Visual Cues:** Use of bold for quantities and ingredients within step text
- **Grouping:** Related steps grouped together (all prep, then all cooking)

### Success Criteria

A successful cooking experience means:

- ✅ User never feels lost or confused about what to do next
- ✅ User can reference the recipe without touching the device
- ✅ User completes the recipe without errors or frustration
- ✅ User feels confident they can make this recipe again

---

## Summary of Optimization

- **Library:** Optimize for **Browsing & Selection**.
- **Recipe Detail:** Optimize for **Readability & Reference**.
- **Grocery List:** Optimize for **Checking & Sorting**.
- **Add Flow:** Optimize for **Data Entry & parsing**.
