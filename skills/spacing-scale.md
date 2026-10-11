// Skill: spacing-scale
// Description: Enforce 8px token scale for all spacing, padding, and margin values
// Target: All pages and components in the Gate Monitor dashboard
// Created: Based on session observations of inconsistent spacing values

// One-on-one rule: Every p-, m-, gap-, and space- CSS value must use only the 
// design token scale: 0, 1, 2, 3, 4, 6, 8, 12, 16. No arbitrary values.

// Pitfall: Using arbitrary pixel values like mt-7, mb-3.5, p-[22px], gap-11
// Fix: Always use the defined tokens. If a custom value is truly needed, 
// add it to the design tokens first, then use it.

// Skill asset: src/lib/globals.css (contains the token scale definitions)

// Enforcement: This skill is enforced via ESLint + Tailwind config validation.
// The build will flag any spacing value outside the approved scale.

// One-on-one: Every occurrence of non-token spacing should trigger a lint error.