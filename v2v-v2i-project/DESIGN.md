---
name: Neon Citadel
colors:
  surface: '#0d1518'
  surface-dim: '#0d1518'
  surface-bright: '#323a3e'
  surface-container-lowest: '#070f12'
  surface-container-low: '#151d20'
  surface-container: '#192124'
  surface-container-high: '#232b2e'
  surface-container-highest: '#2e3639'
  on-surface: '#dbe4e8'
  on-surface-variant: '#b9cbbb'
  inverse-surface: '#dbe4e8'
  inverse-on-surface: '#2a3235'
  outline: '#849586'
  outline-variant: '#3b4b3e'
  surface-tint: '#00e383'
  primary: '#f2fff1'
  on-primary: '#00391d'
  primary-container: '#00ff94'
  on-primary-container: '#00713f'
  inverse-primary: '#006d3c'
  secondary: '#b9f1ff'
  on-secondary: '#00363f'
  secondary-container: '#00e0ff'
  on-secondary-container: '#005f6d'
  tertiary: '#fffaf9'
  on-tertiary: '#680008'
  tertiary-container: '#ffd5d1'
  on-tertiary-container: '#c6031a'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#5bffa1'
  primary-fixed-dim: '#00e383'
  on-primary-fixed: '#00210e'
  on-primary-fixed-variant: '#00522c'
  secondary-fixed: '#a5eeff'
  secondary-fixed-dim: '#00daf8'
  on-secondary-fixed: '#001f25'
  on-secondary-fixed-variant: '#004e5a'
  tertiary-fixed: '#ffdad6'
  tertiary-fixed-dim: '#ffb3ac'
  on-tertiary-fixed: '#410003'
  on-tertiary-fixed-variant: '#930010'
  background: '#0d1518'
  on-background: '#dbe4e8'
  surface-variant: '#2e3639'
typography:
  display-xl:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.08em
  data-numeric:
    fontFamily: JetBrains Mono
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-desktop: 40px
  margin-mobile: 16px
  panel-padding: 24px
---

## Brand & Style

This design system is engineered for the high-stakes environment of urban management. It targets city administrators, emergency responders, and infrastructure engineers who require split-second data visualization and immersive monitoring capabilities. The brand personality is **Technical, Authoritative, and Prescient**, evoking a sense of total situational awareness.

The visual style is a sophisticated blend of **Glassmorphism** and **High-Contrast Dark Mode**. It utilizes deep obsidian surfaces layered with translucent panels to create depth, simulating a physical command console. The aesthetic is punctuated by luminous accents that signify data vitality and system health, creating a "cyber-industrial" atmosphere that is both functional and futuristic.

## Colors

The palette is anchored in a multi-layered dark spectrum to reduce eye strain during long monitoring shifts. 

- **Primary (Neon Green):** Reserved for "Active," "Optimal," and "Operational" states. High luminosity for maximum visibility against dark backgrounds.
- **Secondary (Cyan):** Used for data streams, neutral information, and connectivity indicators. It provides a cool, technical contrast to the primary green.
- **Tertiary (Alert Red):** High-saturation red for critical failures, traffic accidents, and emergency triggers.
- **Neutral (Obsidian & Slate):** The foundational shades are desaturated deep blues and blacks, preventing the interface from feeling "flat" while maintaining professional sobriety.

Interactive elements should leverage subtle glows (10-20% opacity) of the primary and secondary colors to indicate focus and system engagement.

## Typography

The typography system prioritizes legibility in low-light environments. **Inter** serves as the primary typeface for its exceptional clarity and modern profile. To enhance the technical "dashboard" feel, **JetBrains Mono** is introduced for labels, metadata, and numeric readouts, ensuring that data points are distinct and easily scannable.

Use high contrast (White or Off-white) for primary content, and decreased opacity (60-70%) for secondary descriptions. For critical alerts, typography may adopt the primary or tertiary accent colors with a slight text-shadow to simulate a glowing display.

## Layout & Spacing

This design system utilizes a **Fluid Grid** model with a modular 12-column structure for desktop. The layout is designed to maximize "Information Density" without sacrificing clarity. 

- **Desktop (1440px+):** 12 columns, 24px gutters, 40px external margins. Use a dashboard "bento box" style where widgets span 3, 4, or 6 columns.
- **Tablet (768px - 1439px):** 8 columns, 16px gutters, 24px margins. Content reflows vertically; sidebar collapses into a compact icon-only rail.
- **Mobile (Under 768px):** 4 columns, 12px gutters, 16px margins. Dashboard widgets stack vertically into a single column.

Spacing follows a strict 4px base unit to ensure alignment of complex data visualizations and technical readouts.

## Elevation & Depth

Depth is established through **Backdrop Blurs** and **Tonal Layering** rather than traditional drop shadows.

1.  **Base Layer:** Solid Obsidian (#050708). The foundation of the city map or primary data visualization.
2.  **Surface Layer:** Semi-transparent Slate (rgba(30, 41, 46, 0.6)) with a 12px-20px backdrop blur. This creates the glassmorphism effect.
3.  **Stroke Elevation:** Instead of shadows, use a 1px inner border (top and left side) at 20% white opacity to define panel edges.
4.  **Glow States:** Active panels or critical alerts emit a soft, diffused outer glow (30px-50px blur) using the accent color (Green or Red) to indicate status importance.

## Shapes

The design system employs a **Rounded** shape language to soften the industrial technicality of the data. 

- Standard components (Buttons, Inputs) use a **0.5rem (8px)** radius.
- Dashboard cards and main navigation containers use **1rem (16px)** to create a distinct containment feel.
- Critical status indicators (pills) use a full **pill-shape** for immediate recognition.

## Components

### Buttons
- **Primary:** Solid Cyan or Neon Green background with black text. No shadow, but a subtle outer glow on hover.
- **Ghost:** 1px Cyan border with transparent background. Fills with 10% Cyan on hover.

### Dashboard Cards
- Glassmorphic panels with `backdrop-filter: blur(12px)`. 
- Header includes a `label-caps` category and a secondary icon.
- Borders are 1px solid `rgba(255, 255, 255, 0.1)`.

### Data Visualizations
- **Charts:** Lines should use gradients (Cyan to Transparent). Area charts use 10% opacity fills.
- **Gauges:** Circular indicators should use "segmented" progress bars rather than solid lines to maintain a high-tech aesthetic.

### Input Fields
- Dark, inset backgrounds with a subtle bottom border in Cyan. 
- Focus state triggers a full Cyan outline with a soft glow.

### Alerts & Indicators
- **Critical Alert:** Pulsing Tertiary Red border and text.
- **Active Pulse:** A 4px glowing dot placed next to live data streams to indicate real-time connectivity.