# BambiSleepChat CSS Architecture - Modular Design System

## Overview

The CSS architecture has been completely restructured from a monolithic `style.css` file into a modular design system. This improves maintainability, reduces CSS conflicts, and enables better page-specific styling.

## Architecture Structure

```text
src/public/css/
├── style-modular.css          # Main entry point (imports all modules)
├── style.css                  # Legacy file (deprecated)
├── core/
│   ├── variables.css          # CSS custom properties & design tokens
│   ├── base.css              # Reset, typography, base styles
│   └── layout.css            # Grid system, containers, responsive utilities
├── components/
│   ├── forms.css             # Buttons, inputs, form controls
│   └── navigation.css        # Navigation bar, menus
└── pages/
    ├── index.css             # Homepage/AIGF chat interface
    ├── chat.css              # Chat page specific styles
    ├── docs.css              # Documentation pages
    ├── help.css              # Help system
    ├── error.css             # Error & service unavailable pages
    └── psychodelic.css       # Psychodelic trigger mania page
```

## Core Design System

### Variables (core/variables.css)

- **Color Palette**: Primary (deep teal), Secondary (dark magenta), Tertiary (bright pink)
- **Spacing System**: Consistent spacing scale from xs (0.125rem) to xxl (1.5rem)
- **Typography**: Audiowide font family with optimized sizes
- **Shadows & Effects**: Glow effects for the hypnotic aesthetic

### Base Styles (core/base.css)

- CSS reset and normalization
- Typography hierarchy (h1-h6, optimized for readability)
- Scroll behavior and custom scrollbars
- Selection styles and global animations

### Layout System (core/layout.css)

- Responsive grid system
- Container utilities
- Card components
- Modal components
- Breakpoint-based responsive design

## Component System

### Forms (components/forms.css)
- Button variations (.btn, .btn-primary, .btn-secondary, etc.)
- Form controls (.form-control, .form-group, .form-label)
- Input groups and validation styles
- Consistent focus states and transitions

### Navigation (components/navigation.css)
- Main navigation bar (.navbar)
- Mobile-responsive navigation
- Navigation links with hover effects
- Sticky positioning and backdrop blur

## Page-Specific Modules

Each page has its own dedicated CSS module that extends the core system:

### Index Page (pages/index.css)
- AIGF chat interface styling
- Message containers and audio controls
- Username modal
- Responsive chat layout

### Chat Page (pages/chat.css)
- Real-time chat interface
- Sidebar with profile and triggers
- Message bubbles (user/assistant)
- Chat input controls

### Documentation (pages/docs.css)
- Documentation layout and typography
- Code highlighting compatibility
- Table styles for API documentation
- Navigation breadcrumbs

### Help System (pages/help.css)
- Help category grid
- FAQ accordion styles
- Search functionality
- Topic navigation

### Error Pages (pages/error.css)
- Error state presentations
- Service status indicators
- Warning overlays
- Action buttons

### Psychodelic Trigger Mania (pages/psychodelic.css)
- Animated gradient backgrounds
- Hypnotic visual effects
- Trigger card animations
- Warning system styling

## Template Integration

### Enhanced Head Partial
The `head-enhanced.ejs` partial supports conditional CSS loading:

```html
<%- include('partials/head-enhanced', { pageStyle: 'chat' }) %>
```

This automatically loads:
1. Core CSS (style-modular.css)
2. Page-specific CSS (pages/chat.css)
3. Bootstrap and controls.css

### Template Updates
All EJS templates have been updated to use the enhanced head partial:

- `index.ejs` → loads `pages/index.css`
- `chat.ejs` → loads `pages/chat.css`
- `help.ejs` → loads `pages/help.css`
- `error.ejs` → loads `pages/error.css`
- `service-unavailable.ejs` → loads `pages/error.css`
- `psychodelic-trigger-mania.ejs` → loads `pages/psychodelic.css`
- `docs/*.ejs` → loads `pages/docs.css`

## Design Tokens

### Color System
```css
/* Primary Colors - Deep Teal */
--primary-color: #0c2a2ac9;
--primary-alt: #15aab5ec;

/* Secondary Colors - Dark Magenta */
--secondary-color: #40002f;
--secondary-alt: #cc0174;

/* Tertiary Colors - Bright Pink */
--tertiary-color: #cc0174;
--tertiary-alt: #01c69eae;
```

### Spacing Scale
```css
--spacing-xs: 0.125rem;   /* 2px */
--spacing-sm: 0.25rem;    /* 4px */
--spacing-md: 0.5rem;     /* 8px */
--spacing-lg: 0.75rem;    /* 12px */
--spacing-xl: 1rem;       /* 16px */
--spacing-xxl: 1.5rem;    /* 24px */
```

### Typography Scale
```css
h1 { font-size: 1.8rem; }  /* Reduced for better mobile experience */
h2 { font-size: 1.4rem; }
h3 { font-size: 1.2rem; }
h4 { font-size: 1rem; }
```

## Utility Classes

The modular system includes utility classes for rapid development:

```css
/* Text Utilities */
.text-center, .text-left, .text-right

/* Display Utilities */
.d-none, .d-block, .d-flex, .d-grid

/* Spacing Utilities */
.mt-1 through .mt-5 (margin-top)
.mb-1 through .mb-5 (margin-bottom)
.p-1 through .p-5 (padding)

/* Visual Utilities */
.border, .border-radius, .border-radius-lg
.shadow-sm, .shadow-md, .shadow-lg, .shadow-glow

/* Background Utilities */
.bg-primary, .bg-secondary, .bg-tertiary, .bg-nav

/* Text Color Utilities */
.text-primary, .text-secondary, .text-nav, .text-accent
.text-success, .text-warning, .text-error

/* Animation Utilities */
.fade-in, .slide-up, .glow-hover
```

## Migration Notes

### From Legacy CSS
1. Old `style.css` references should be replaced with `style-modular.css`
2. Page-specific styles moved from inline `<style>` blocks to dedicated CSS files
3. Template includes updated to use `head-enhanced.ejs`

### Performance Benefits
- **Reduced CSS Size**: Page-specific loading reduces unnecessary CSS
- **Better Caching**: Modular files enable better browser caching
- **Faster Development**: Isolated styles reduce conflicts and debugging time
- **Maintainability**: Clear separation of concerns and easier updates

### Development Workflow
1. **Core Changes**: Modify `core/*.css` files for system-wide changes
2. **Component Updates**: Update `components/*.css` for reusable components
3. **Page Styling**: Modify `pages/*.css` for page-specific styles
4. **New Pages**: Create new page CSS file and update template include

## Browser Support

The modular CSS system maintains compatibility with:
- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS Grid and Flexbox layouts
- CSS Custom Properties (CSS Variables)
- CSS backdrop-filter effects

## Future Enhancements

1. **CSS-in-JS Integration**: Potential React/Vue component integration
2. **Dark/Light Themes**: Theme switching using CSS custom properties
3. **Component Library**: Standalone component documentation
4. **Build Process**: CSS optimization and minification pipeline
5. **Design Tokens**: Expanded token system for advanced theming

This architecture provides a solid foundation for scaling the BambiSleepChat interface while maintaining the hypnotic design aesthetic and ensuring excellent performance across all pages.
