# Simple & Scientific Calculator

A clean, minimalist, and high-precision web calculator built with vanilla HTML, CSS, and JavaScript. Designed with a focus on simplicity, distraction-free aesthetics, and comprehensive functionality.

---

## Features

- **Minimalist Aesthetic**:
  - High-contrast, clean neutral color palette (no vibrant colors or distracting glassmorphism).
  - Modern typography powered by the Inter font family with tabular figures.
  - Fully responsive layout optimized for mobile, tablet, and desktop screens.
  - Smooth Light and Dark theme switching with saved user preference.

- **Dual Modes**:
  - **Standard Mode**: Basic arithmetic (`+`, `−`, `×`, `÷`, `%`, `+/-`, decimal points, backspace, and clear).
  - **Scientific Mode**:
    - Trigonometric functions (`sin`, `cos`, `tan`)
    - Angle mode switcher (`DEG` and `RAD`) with active display indicator
    - Powers and roots (`x²`, `x³`, `xʸ`, `√x`, `1/x`)
    - Logarithms (`ln`, `log₁₀`)
    - Mathematical constants (`π` and `e`)
    - Factorials (`x!`) and absolute values (`|x|`)

- **Calculation History**:
  - Records previous calculations and saves them to local storage.
  - Quick-access drawer allowing you to review and click any previous result to reuse it in your current calculation.
  - Clear history option.

- **Memory Storage**:
  - Classic memory functions: `MC` (Clear), `MR` (Recall), `M+` (Add), `M−` (Subtract), and `MS` (Store).
  - Status indicator badge in the display when memory contains stored values.

- **Tactile Audio Feedback**:
  - Lightweight, synthetic mechanical click feedback using the native Web Audio API (no external sound files required).
  - Dedicated sound toggle to mute or unmute anytime.

- **Clipboard & Interaction**:
  - Click the display to copy the active number directly to your clipboard.
  - Paste numbers into the calculator using `Ctrl + V` or `Cmd + V`.

---

## Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `0` - `9` | Input Digits |
| `.` | Decimal Point |
| `+`, `-`, `*`, `/` | Basic Operations |
| `^` | Power (`xʸ`) |
| `!` | Factorial (`x!`) |
| `%` | Percentage |
| `Enter` or `=` | Calculate Result |
| `Backspace` | Delete last digit |
| `Escape` | All Clear (`AC`) / Close modals |
| `Ctrl + V` / `Cmd + V` | Paste number from clipboard |

---

## File Structure

```text
.
├── index.html       # Semantic layout and accessible keypad structure
├── style.css        # Clean CSS styling, themes, and responsive design
├── script.js        # Core calculator logic, scientific calculations, and state
└── README.md        # Documentation
```

---

## Getting Started

No build tools or external dependencies are required.

1. Clone the repository:
   ```bash
   git clone git@github.com:AwaisCh360/Simple-Calculator.git
   cd Simple-Calculator
   ```
2. Open `index.html` in your web browser.

---

## License

This project is open source and available under the [MIT License](LICENSE).
