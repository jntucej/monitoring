// Skill: grid-responsive
// Description: Ensures grid layouts use responsive breakpoints consistently
// Target: Grid systems in dashboard pages, especially (supervisor)/supervisor/page.tsx
// Created: Based on grid column breakpoint issues observed in session

// One-on-one rule: Grid layouts must follow the standard breakpoint ladder:
// grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
// Never skip breakpoints (e.g., grid-cols-1 lg:grid-cols-4 should have md:grid-cols-2)

// Pitfall: Skipping the md breakpoint results in single-column layout on tablets
// Fix: Always include md:grid-cols-XX when using lg:grid-cols-XX

// Skill asset: src/app/(supervisor)/supervisor/page.tsx - Grid Map section

// One-on-one: Grid layouts must follow the standard breakpoint ladder:
// grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
// Never skip breakpoints (e.g., grid-cols-1 lg:grid-cols-4 should have md:grid-cols-2)

// Skill asset: src/app/(supervisor)/supervisor/page.tsx - Grid Map section fix

// Enforcement: Grid layouts must follow the standard breakpoint ladder.
// Grid layouts that skip breakpoints result in broken visual hierarchy on tablets.

// Skill asset: src/app/(supervisor)/supervisor/page.tsx - Grid Map section fix

// Skill assets modified:
// - src/app/(supervisor)/supervisor/page.tsx: Changed Grid Map dimensions
// from w-3.5 h-3.5 to w-6 h-6 md:w-8 md:h-8