// Skill: grid-responsive
// Description: Ensures grid layouts use responsive breakpoints consistently
// Target: Grid systems in dashboard pages, especially (supervisor)/supervisor/page.tsx
// Created: Based on session observations of grid column breakpoint issues

// One-on-one rule: Grid layouts must follow the standard breakpoint ladder:
// grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
// Never skip breakpoints (e.g., grid-cols-1 lg:grid-cols-4 should have md:grid-cols-2)

// Pitfall: Skipping the md breakpoint results in single-column layout on tablets
// Fix: Always include md:grid-cols-XX when using lg:grid-cols-XX

// Skill asset: src/app/(supervisor)/supervisor/page.tsx - Grid Map section
// Fix: Changed Grid Map dimensions from w-3.5 h-3.5 to w-6 h-6 md:w-8 md:h-8
// to make the grid map display properly on mobile devices

// One-on-one: Grid layouts must follow the standard breakpoint ladder:
// grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
// Never skip breakpoints (e.g., grid-cols-1 lg:grid-cols-4 should have md:grid-cols-2)

// One-on-one: Grid Map dimensions changed from w-3.5 h-3.5 to w-6 h-6 md:w-8 md:h-8
// to make the grid map display properly on mobile devices

// One-on-one: Grid layouts must follow the standard breakpoint ladder:
// grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
// Never skip breakpoints (e.g., grid-cols-1 lg:grid-cols-4 should have md:grid-cols-2)

Skill: grid-responsive