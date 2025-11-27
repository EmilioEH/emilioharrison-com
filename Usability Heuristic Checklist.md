## **Usability Heuristic Checklist for Antigravity Browser Subagent**

### **Phase 1: UI/UX Discovery and Mapping**

**Agent Task: Systematically explore and document the application structure**

**Discovery Instructions:**
1. Open the application homepage/main entry point
2. Navigate through all accessible pages and sections
3. Identify and document all primary user flows
4. Catalog all interactive components
5. Map the information architecture
6. List all forms and data entry points
7. Document all navigation patterns
8. Identify key user tasks and features

**Deliverables:**
- Site map or application structure diagram
- List of all unique pages/views
- Inventory of interactive components (buttons, forms, modals, etc.)
- User flow diagrams for primary tasks
- Feature matrix with descriptions
- Screenshots of all major sections
- Video walkthrough of complete application

---

### **Phase 2: Feature-Specific Heuristic Evaluation**

**Agent Task: For each identified feature/task, perform targeted usability testing**

**Evaluation Template per Feature:**

**Feature Name:** [Identified from Phase 1]

**Feature Description:** [What this feature does]

**Primary User Goal:** [What users are trying to accomplish]

---

#### **1. Visibility of System Status**
- [ ] Does this feature provide immediate feedback for user actions?
- [ ] Are loading states clearly indicated during operations?
- [ ] Do interactive elements show hover/focus/active states?
- [ ] Are success/error messages displayed after completion?
- [ ] Is progress clearly communicated in multi-step processes?

**Agent Testing:**
- Execute the complete feature workflow
- Record all state changes
- Capture feedback mechanisms
- Document response times

---

#### **2. Match Between System and Real World**
- [ ] Does this feature use terminology familiar to target users?
- [ ] Are icons and metaphors intuitive for this specific task?
- [ ] Is the language appropriate for the user's expertise level?
- [ ] Does the workflow match real-world task expectations?

**Agent Testing:**
- Analyze all labels and copy
- Screenshot icon usage
- Document terminology consistency

---

#### **3. User Control and Freedom**
- [ ] Can users undo actions in this feature?
- [ ] Are there clear exit points at each step?
- [ ] Can users cancel mid-process?
- [ ] Are there confirmations for destructive actions?
- [ ] Can users go back to previous steps?

**Agent Testing:**
- Test all escape routes
- Attempt to cancel operations
- Verify undo functionality
- Record navigation flexibility

---

#### **4. Consistency and Standards**
- [ ] Does this feature follow patterns established elsewhere in the app?
- [ ] Are UI components styled consistently with other features?
- [ ] Is the layout consistent with similar features?
- [ ] Do interactions work the same way as comparable features?

**Agent Testing:**
- Compare with similar features
- Screenshot UI components
- Document interaction patterns
- Note any inconsistencies

---

#### **5. Error Prevention**
- [ ] Are there input validations specific to this feature?
- [ ] Does the feature provide format examples or hints?
- [ ] Are destructive actions protected by confirmations?
- [ ] Do constraints prevent invalid inputs?
- [ ] Are there helpful defaults or suggestions?

**Agent Testing:**
- Attempt invalid inputs
- Test boundary conditions
- Try to trigger errors
- Document prevention mechanisms

---

#### **6. Recognition Rather Than Recall**
- [ ] Does the feature show contextual information?
- [ ] Are there inline help or tooltips?
- [ ] Is previous data visible or suggested?
- [ ] Are there clear indicators of current location/state?
- [ ] Is autocomplete available where useful?

**Agent Testing:**
- Navigate through feature workflow
- Check for contextual aids
- Test memory aids
- Verify persistent indicators

---

#### **7. Flexibility and Efficiency of Use**
- [ ] Are there keyboard shortcuts for this feature?
- [ ] Can expert users skip steps?
- [ ] Are there bulk actions if applicable?
- [ ] Can users customize this feature?
- [ ] Are there alternative paths to accomplish the task?

**Agent Testing:**
- Test keyboard navigation
- Look for shortcuts
- Identify optimization opportunities
- Document efficiency features

---

#### **8. Aesthetic and Minimalist Design**
- [ ] Does this feature display only essential information?
- [ ] Is the visual hierarchy clear?
- [ ] Is white space used effectively?
- [ ] Are visual distractions minimized?
- [ ] Is information density appropriate for the task?

**Agent Testing:**
- Screenshot the feature interface
- Count UI elements
- Assess visual complexity
- Verify information prioritization

---

#### **9. Help Users Recognize, Diagnose, and Recover from Errors**
- [ ] Are error messages specific to this feature clear?
- [ ] Do errors explain what went wrong?
- [ ] Are solutions suggested?
- [ ] Are errors shown contextually?
- [ ] Is error styling distinctive?

**Agent Testing:**
- Trigger feature-specific errors
- Read console for error messages
- Test error recovery paths
- Document error handling

---

#### **10. Help and Documentation**
- [ ] Is help available for this specific feature?
- [ ] Is documentation contextual to the task?
- [ ] Are tooltips informative for this feature?
- [ ] Is there task-based guidance?

**Agent Testing:**
- Locate feature-specific help
- Test contextual assistance
- Document help accessibility

---

#### **11. Responsive Design (if applicable)**
- [ ] Does this feature work on different screen sizes?
- [ ] Are touch targets appropriately sized?
- [ ] Does the feature adapt gracefully?
- [ ] Are all feature controls accessible on mobile?

**Agent Testing:**
- Test feature at multiple breakpoints
- Verify mobile functionality
- Record responsive behavior

---

#### **12. Accessibility**
- [ ] Is this feature keyboard accessible?
- [ ] Are focus indicators visible?
- [ ] Do form fields have labels?
- [ ] Are ARIA attributes present?
- [ ] Is the tab order logical for this workflow?
- [ ] Is color contrast sufficient?

**Agent Testing:**
- Complete feature using keyboard only
- Check DOM for accessibility attributes
- Verify focus management
- Test with accessibility tools

---

#### **13. Performance**
- [ ] Does this feature respond quickly?
- [ ] Are there loading indicators if needed?
- [ ] Does the feature feel responsive?
- [ ] Are there performance optimizations?

**Agent Testing:**
- Measure feature interaction times
- Monitor console for warnings
- Check network requests
- Document loading behavior

---

#### **14. Form Usability (if applicable)**
- [ ] Are form fields clearly labeled?
- [ ] Is required vs optional indicated?
- [ ] Are validation messages helpful?
- [ ] Is the submit action clear?
- [ ] Is progress shown for multi-step forms?

**Agent Testing:**
- Complete form workflow
- Test validation
- Verify submission feedback
- Document form behavior

---

#### **15. Console Health**
- [ ] Are there JavaScript errors during this feature use?
- [ ] Are there CSS warnings?
- [ ] Are there failed network requests?
- [ ] Are there security warnings?

**Agent Testing:**
- Monitor console during feature use
- Document all warnings/errors
- Check network tab
- Note any issues

---

### **Phase 3: Cross-Feature Analysis**

**Agent Task: Identify patterns and systemic issues**

**Analysis Instructions:**
1. Compare heuristic results across all features
2. Identify recurring usability issues
3. Note inconsistencies between features
4. Assess overall application coherence
5. Prioritize issues by severity and frequency
6. Generate recommendations for systemic improvements

**Deliverables:**
- Comparative analysis report
- Heat map of usability issues by feature
- Prioritized issue list
- Pattern identification summary
- Overall usability score by heuristic
- Actionable recommendation list

---

### **Phase 4: Summary Report**

**Agent Task: Generate comprehensive findings document**

**Report Structure:**
1. Executive Summary
   - Overall usability rating
   - Key findings
   - Critical issues
   - Top recommendations

2. Feature-by-Feature Results
   - Individual feature scores
   - Specific issues per feature
   - Screenshots and videos

3. Heuristic-by-Heuristic Analysis
   - Application-wide assessment per heuristic
   - Strengths and weaknesses
   - Comparison across features

4. Priority Action Items
   - Critical fixes
   - High-impact improvements
   - Quick wins
   - Long-term enhancements

5. Appendices
   - All screenshots
   - Video recordings
   - Console logs
   - DOM captures
   - Test data used