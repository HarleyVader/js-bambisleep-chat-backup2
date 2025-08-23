# Bambi Sleep Chat - CSS Color Variables

## Root Variables

```css
:root {
    --primary-color: #0c2a2ac9;
    --primary-alt: #15aab5ec;
    --secondary-color: #40002f;
    --secondary-alt: #cc0174;
    --tertiary-color: #cc0174;
    --tertiary-alt: #01c69eae;
    --button-color: #df0471;
    --button-alt: #110000;
    --nav-color: #0a2626;
    --nav-alt: #17dbd8;
    --transparent: #124141ce;
    --transparent-alt: #ffffff00;
    --error: #ff3333;
    --error-bg: rgba(255, 51, 51, 0.1);

    --accent-color: var(--button-color);
    --border-color: var(--tertiary-color);
    --secondary-text-color: var(--primary-alt);
    --text-color: var(--primary-alt);
    --bg-color-secondary: var(--nav-color);

    --primary-color-rgb: 12, 42, 42;
    --secondary-color-rgb: 64, 0, 47;
    --tertiary-color-rgb: 204, 1, 116;
    --nav-color-rgb: 10, 38, 38;
    --button-color-rgb: 223, 4, 113;

    --transparent-alt: rgba(var(--primary-color-rgb), 0.2);
}
```

## Font Configuration

```css
@import url("https://fonts.googleapis.com/css2?family=Audiowide&display=swap");

html,
body {
    font-family: "Audiowide", sans-serif;
    font-weight: 400;
    font-style: normal;
}
```
