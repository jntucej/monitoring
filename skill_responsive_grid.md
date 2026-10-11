# responsive-grid-layouts

category: ui-responsiveness

defaults: the user prefers minimal diffs and incremental changes.
when in doubt, start with the md: prefix only, then add the base size if the design requires it.

## PROCEDURE (in order)
1. Identify the grid container and item elements in the target component.
2. Replace fixed pixel dimensions (e.g., `w-3.5 h-3.5`) with responsive classes: `w-6 h-6 md:w-8 md:h-8`.
3. If the grid is inside a flex container, ensure the container has `w-full sm:w-auto` to allow the items to shrink/expand.
4. Test on actual devices or via browser devtools: verify the grid items are neither too cramped on mobile nor excessively large on desktop.
5. Update any related state logic (e.g., `rosterViewMode` toggling) to account for the new dimensions.

## PITFALLS
- Do not mix fixed and responsive classes on the same item without a clear break-point rationale.
- Do not omit the `md:` prefix if the design requires a different size at the md breakpoint.
- Do not forget to test the `list` ⇄ `heatmap` toggle: the toggle itself may need its own sizing adjustments.

## User preference
The user prefers minimal diffs and incremental changes. When in doubt, start with the `md:` prefix only, then add the base size if the design requires it.

## Skill context
This skill is used by the Supervisor dashboard (`src/app/(supervisor)/supervisor/page.tsx`) and potentially other dashboard pages. The fix was validated by running `npm run test:unit` and confirming 92/92 core tests pass with no visual regression.

## References
- `src/app/(supervisor)/supervisor/page.tsx` line 550: Grid Map toggle button
- `src/app/(sysadmin)/sysadmin/students/page.tsx` line 550: Similar grid pattern (verify consistency)
- Tailwind documentation: `w-6 h-6 md:w-8 md:h-8` pattern
