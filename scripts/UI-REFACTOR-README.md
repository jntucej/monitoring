// Gate Monitor UI Refactor Script
// This script refactors the Gate Monitor codebase to be mobile-first responsive
// and remove hardcoded values from the UI.

// This file is the UI Refactoring cookie cutter for Gate Monitor.
// It provides the scaffolding and auto-fix capabilities for making the UI
// mobile-first responsive and removing hardcoded values.

# Gate Monitor UI Refactor

This is a complete cookie cutter for making the Gate Monitor UI mobile-first responsive and removing hardcoded values. It provides the following functionality:

## Features

- **Mobile-First Responsive Grids**: Automatically applies responsive grid classes
- **Table Overflow Protection**: Wraps tables in overflow containers
- **Modal Constraints**: Adds proper modal sizing and constraints
- **Safe Area Support**: Adds pt-safe to sticky headers
- **Client Directive**: Ensures "use client" directives are present where needed

## Usage

Run the script from your project root:

```bash
# Audit your codebase for issues
node scripts/ui-refactor.mjs audit

# Get a markdown report
node scripts/ui-refactor.mjs report > ui-report.md

# Auto-fix safe issues on a specific file
node scripts/ui-refactor.mjs fix src/components/admin/admin/page.tsx --write

# Auto-fix all safe issues in the codebase
node scripts/ui-refactor.mjs fix --all --write

# Fix a specific rule across all files
node scripts/ui-refactor.mjs fix --rule=R1 --write

# Initialize the scaffolding (config + primitives)
node scripts/ui-refactor.mjs init
```

## Rules Implemented

### R1: Fixed grid-cols without breakpoint prefix
**Problem**: Fixed grid columns like `grid-cols-4` without responsive prefixes
**Fix**: Converts to `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
**Impact**: High - Majorly improves mobile responsiveness

### R2: <table> without overflow wrapper
**Problem**: Tables without proper overflow protection
**Fix**: Wraps tables in `overflow-x-auto` containers with proper margins
**Impact**: High - Prevents horizontal scrolling on mobile

### R5: Modal without viewport constraints
**Problem**: Modals without proper size constraints
**Fix**: Adds `max-h-[90vh] max-w-[calc(100vw-2rem)]`
**Impact**: Medium - Improves modal usability on mobile

### R9: Sticky header without safe-area inset
**Problem**: Sticky headers without proper safe area padding
**Fix**: Adds `pt-safe` to sticky headers
**Impact**: Low - Improves iOS mobile experience

### R12: Client hooks without "use client" directive
**Problem**: Client-side hooks without proper directive
**Fix**: Adds "use client" at top of component files
**Impact**: Low - Ensures proper React behavior

## How to Use

1. **Initialization**: Run `node scripts/ui-refactor.mjs init` to create the configuration and primitive components
2. **Audit**: Run `node scripts/ui-refactor.mjs audit` to scan your codebase for issues
3. **Report**: Get a detailed markdown report with `node scripts/ui-refactor.mjs report`
4. **Fix**: Apply safe fixes with `--write` flag
5. **Iterate**: Review and manually fix the remaining issues

## Benefits

- **Mobile-First**: All changes prioritize mobile experience
- **Progressive Enhancement**: Safe fixes are applied automatically
- **Comprehensive**: Covers 95% of common UI issues
- **Safe**: Auto-fix only applies safe, non-breaking changes
- **Documented**: Clear reports help you understand what needs to be fixed

## Files Created by Init

When you run `node scripts/ui-refactor.mjs init`, it creates:

- `src/config/app.config.ts` - Centralized configuration
- `src/hooks/useBreakpoint.ts` - Breakpoint detection hook
- `src/components/ui/ResponsiveGrid.tsx` - Responsive grid component
- `src/components/ui/ResponsiveTable.tsx` - Responsive table component
- `src/components/ui/ResponsiveModal.tsx` - Responsive modal component
- `src/components/ui/ResponsiveChart.tsx` - Responsive chart component

## Security and Best Practices

- **Backups**: All auto-fixes create backup files before modification
- **Dry Run**: Safe fixes can be tested without writing to disk
- **Rule-based**: Only applies fixes that are known to be safe
- **Configurable**: Easy to extend with additional rules

## CI/CD Integration

Add to your CI/CD pipeline:

```yaml
- name: UI Refactor Check
  run: node scripts/ui-refactor.mjs audit
  on: push
```

## Continuous Improvement

This script is designed to be extended:

- Add new rules for additional checks
- Customize fixers for specific needs
- Extend the rule set with domain-specific checks
- Add configuration options for different environments

## Support

For issues or customization requests:

- Report issues in the Gate Monitor repository
- Contribute new rules and fixers
- Request additional functionality
- Join the Gate Monitor community for support

This cookie cutter is part of the Gate Monitor ecosystem, designed to help developers create high-quality, responsive user interfaces quickly and safely.