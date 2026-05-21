```markdown
# Design System Document: The Financial Sanctuary

## 1. Overview & Creative North Star
This design system is built to transform the often-sterile environment of Enterprise Resource Planning (ERP) into a **"Financial Sanctuary."** Moving away from the cluttered, grid-heavy aesthetics of legacy fintech, our Creative North Star is **Editorial Precision.** 

We treat financial data as a narrative. The interface should feel like a high-end digital publication—spacious, authoritative, and calm. We achieve this by rejecting traditional structural constraints (like rigid borders) in favor of **Tonal Depth** and **Asymmetric Balance.** By utilizing generous white space and overlapping glass surfaces, we ensure that the user feels in control of the data, rather than overwhelmed by it.

---

## 2. Colors: The Emerald Horizon
Our palette is rooted in a "Modern African Luxury" aesthetic—combining the deep, verdant tones of the continent with the sterile, high-tech clarity of global finance.

### Palette Strategy
*   **Primary (`#006947`):** Use this for core actions. It represents growth and stability.
*   **Secondary (`#006a6a`):** Use for technical accents, data visualization, and secondary navigation.
*   **Tertiary (`#765700`):** Our "Warm Amber." Use this exclusively for alerts and warnings to provide a sophisticated alternative to "Standard Red."
*   **Neutral Surfaces:** A sophisticated range from `surface` (`#f9f9fb`) to `surface-container-highest` (`#e2e2e4`).

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to define sections. Boundaries must be established through:
1.  **Background Shifts:** Placing a `surface-container-low` card against a `surface` background.
2.  **Negative Space:** Using the Spacing Scale to create "invisible containers."

### The Glass & Gradient Rule
To ensure a premium feel, main CTAs and Hero elements should utilize a subtle linear gradient from `primary` (`#006947`) to `primary_container` (`#00855b`). For floating overlays (modals, dropdowns), use **Glassmorphism**:
*   **Fill:** `surface_container_lowest` at 80% opacity.
*   **Effect:** Backdrop Blur (20px - 40px).
*   **Result:** A "frosted glass" effect that allows the underlying data to bleed through softly, maintaining context.

---

## 3. Typography: The Editorial Voice
We use a dual-typeface system to balance character with utility.

### Typeface Roles
*   **Manrope (Display & Headline):** Used for large data points and page titles. Its geometric yet organic curves provide a "human" touch to financial figures.
*   **Inter (Title, Body, Label):** The workhorse for high-density ERP data. It provides maximum legibility at small sizes.

### Typography Hierarchy
*   **Display-LG (3.5rem / Manrope):** Use for "Hero Numbers" (e.g., Total Balance).
*   **Headline-SM (1.5rem / Manrope):** For section headers.
*   **Title-MD (1.125rem / Inter):** For card titles and navigation items.
*   **Label-MD (0.75rem / Inter):** For metadata. Increase letter-spacing by 0.05em for a premium, architectural feel.

---

## 4. Elevation & Depth: Tonal Layering
In this design system, height is expressed through tone, not just shadows.

### The Layering Principle
Think of the UI as layers of fine paper and glass.
*   **Level 0 (Base):** `surface` (`#f9f9fb`).
*   **Level 1 (Sub-sections):** `surface-container-low`.
*   **Level 2 (Active Cards):** `surface-container-lowest` (Pure White).
*   **Level 3 (Pop-overs):** Glassmorphic containers with **Ambient Shadows**.

### Ambient Shadows
Shadows should be "felt, not seen." 
*   **Color:** Use `on_surface` (`#1a1c1d`) at 4% to 6% opacity.
*   **Blur:** Use large values (30px to 60px) to mimic natural light dispersion. Avoid tight, dark shadows which look "cheap."

### The "Ghost Border" Fallback
If contrast is required for accessibility (e.g., in high-glare environments), use a **Ghost Border**: `outline-variant` (`#bdcac0`) at **15% opacity**. Never use a 100% opaque border.

---

## 5. Components: Precision Primitives

### Buttons
*   **Primary:** `primary` background, `on_primary` text. 24px (1.5rem) rounded corners.
*   **Secondary:** `surface-container-high` background. No border.
*   **Tertiary:** Ghost style. No background, `primary` text, subtle hover state using `primary_container` at 10% opacity.

### Input Fields
Avoid "box" thinking. Use a `surface-container-low` background with a `24px` radius. On focus, transition the background to `surface-container-lowest` and apply a subtle `primary` Ghost Border. 

### Cards & Lists
*   **Forbid Dividers:** Do not use horizontal lines between list items. Use 16px or 24px vertical padding and a subtle `surface-container-low` background on hover to separate items.
*   **The "Reconcile Ribbon":** For ERP-specific reconciliation status, use a vertical 4px "ribbon" on the far left of a card using `primary` (Matched) or `tertiary` (Pending) instead of a status icon.

### Selection Chips
Rounded `full` (9999px). Unselected chips should blend into the background (`surface-container-high`). Selected chips use `secondary_container` with `on_secondary_container` text.

---

## 6. Do's and Don'ts

### Do
*   **Embrace Asymmetry:** Align high-level summaries to the left and leave large open spaces on the right for a bespoke, "Apple-esque" layout.
*   **Use Soft Greys:** Use `surface-variant` for non-essential text to create a clear hierarchy against `on_surface` titles.
*   **Intentional Rounding:** Maintain the `24px` (1.5rem) radius consistently across all main containers to build a friendly, approachable brand identity.

### Don't
*   **Don't Use Pure Black:** It breaks the "luxury" softness. Always use `on_surface` (`#1a1c1d`).
*   **Don't Crowd the Data:** If a dashboard feels full, increase the page height rather than shrinking the components.
*   **Don't Use Default Icons:** Ensure all iconography is thin-stroke (1px or 1.5px) to match the Inter typography weight.
*   **Don't Use Hard Edges:** Avoid 0px or 4px corners; they conflict with the "Sanctuary" philosophy.

---

*Director's Final Note: Precision is the ultimate luxury. Every pixel must feel intentional. If an element doesn't have a clear functional or tonal purpose, remove it.*```