# Omni Ops — Photoshop UXP Panel

> A fully-customizable, production-quality Photoshop UXP plugin for streamlining creative workflows through user-defined layouts, a massive action library, and custom button configurations.

---

## 📦 Version History

| Version | Status | Description |
|---|---|---|
| `v0.1.0` | ✅ Released | Foundation — core architecture, port from DMP, bug fixes, GitHub setup |
| `v0.2.0` | ⏳ Planned | Action Engine expansion — blend modes, masks, merge, group ops |
| `v0.3.0` | ⏳ Planned | Button config UX redesign — icon picker, real PS actions, shortcuts |
| `v0.4.0` | ⏳ Planned | Widgets — opacity/fill sliders, blend-if |
| `v0.5.0` | ⏳ Planned | Data & persistence — config export/import |
| `v1.0.0` | ⏳ Planned | UI polish — selection indicator, animations, empty state |

---

## ✨ Features

### ✅ In v0.1.0 (Current)
- **Multi-tab panel** — Create and manage multiple spaces (tabs) with rename, add, and delete
- **Free-form grid layout** — Drag buttons to any position, resize with handles (E, S, SE)
- **Fully configurable buttons** — Assign any tool, menu command, or PS Action per button
- **Action categories:**
  - 🔧 **Tools** — 75+ Photoshop tools (Brush, Lasso, Dodge, Clone, etc.)
  - 📋 **Menu Items** — 290+ Photoshop menu commands
  - ▶ **PS Actions** — Reads your real Photoshop Actions from `app.actionTree`
  - 🎭 **Blend Modes** — All 27 PS blend modes
  - 🎚 **Adjustment Layers** — 16 types, direct creation (no dialog!)
  - 📄 **Layer Operations** — Masks, merge, collapse/expand groups
  - ⚙ **Custom Functions** — Built-in workflow helpers (CC Match, Color Grade Stack, etc.)
- **Button appearance** — Custom label, color, icon (emoji), size, text color, shortcut badge
- **Keyboard shortcut labels** — Display shortcut reminders on buttons
- **Right-click context menu** — Edit, Duplicate, Delete on any button
- **Config persistence** — Auto-saves layout to UXP data folder
- **Export / Import config** — Via Plugins menu commands
- **Responsive** — Mini mode, compact mode, adapts to any panel size
- **Photoshop theme-aware** — Matches dark/medium/light PS themes

### 🗓 Coming in v0.4.0
- **Opacity Slider widget** — Live-synced to active layer opacity
- **Fill Slider widget** — Live-synced to active layer fill
- **Blend-If Sliders widget** — Full dual-handle blend-if control
- **Divider / Spacer widgets**

---

## 🚀 Installation

### Prerequisites
- **Photoshop 25.2.0** or later (2024+)
- **UXP Developer Tool** (for loading during development)
- **Node.js 18+**

### Development Setup

```bash
# 1. Clone the repo
git clone https://github.com/johnsankeyjob/omni-ops-panel.git
cd omni-ops-panel

# 2. Install dependencies
npm install

# 3. Build the plugin
npm run build

# 4. Load in Photoshop
#    Open UXP Developer Tool
#    Click "Add Plugin" → select this folder
#    Click "Load"
```

### Build Commands

| Command | Description |
|---|---|
| `npm run build` | Production build (minified) |
| `npm run watch` | Development watch mode (auto-rebuild on save) |
| `npm run dev` | Development build (unminified) |

---

## 🏗️ Architecture

```
src/
├── index.jsx                    # Entry point — entrypoints.setup()
├── styles/
│   └── index.css                # Full design system with CSS variables
├── context/
│   └── PanelContext.jsx         # Global state (config, edit mode, modals)
├── services/
│   ├── ActionService.js         # ⭐ Unified action dispatcher
│   ├── LayerService.js          # Layer ops (blend, mask, merge, groups)
│   ├── ActionSetService.js      # Real PS Actions from app.actionTree
│   └── StorageService.js        # Config persistence (UXP filesystem)
├── data/
│   ├── toolsData.js             # 75 tools + 290 menu commands
│   ├── blendModesData.js        # 27 blend modes
│   ├── adjustmentsData.js       # 16 adjustment layer types
│   └── layerActionsData.js      # Mask/merge/group action defs
└── components/
    ├── Panel.jsx                # Main panel container
    ├── TabBar.jsx               # Space switcher with edit controls
    ├── Space.jsx                # Space renderer (passes dynamic path)
    ├── GridLayout.jsx           # ⭐ Grid engine (drag/resize/delete)
    ├── items/
    │   └── ActionButton.jsx     # Configurable action button
    └── modals/
        ├── ModalManager.jsx     # Modal router
        └── ButtonEditModal.jsx  # Tabbed button configuration form
```

### Key Design Decisions

#### Separation of Concerns
UI components **never** call `require('photoshop')` directly. All Photoshop operations are routed through the `services/` layer. This follows the [UXP Engineering best practices](https://developer.adobe.com/photoshop/uxp/).

#### Dynamic Grid Path (Critical Bug Fix)
The original DMP Tools Panel had a critical bug: `GridLayout` used a hardcoded path `['panels', 0, 'spaces', 0, 'layout']`, meaning drag/resize only saved correctly for the first tab. `Space.jsx` now computes the correct dynamic `spacePath` based on the actual space index and passes it down.

#### Real Photoshop Actions
`ActionSetService.js` reads actions using `app.actionTree` from the Photoshop DOM, replacing the mock hardcoded array from the original panel.

---

## 📖 Usage Guide

### Adding Your First Button

1. Open the panel in Photoshop (Plugins → Omni Ops)
2. Click the **✏ pencil icon** (top right) to enter Edit Mode
3. Click the **+ Add Item** ghost button at the bottom of the grid
4. In the **Action tab**: Select a category and search for your action
5. In the **Appearance tab**: Set a label, color, icon, and optional shortcut
6. Click **Add Button**
7. Drag the button to your desired position
8. Click **✓** to exit Edit Mode

### Tab Management (Edit Mode)
- **Add Tab** — Click the `+` at the end of the tab bar
- **Rename Tab** — Double-click a tab
- **Delete Tab** — Click the `×` on a tab (requires 2+ tabs)

### Action Categories

| Category | What it does | Example |
|---|---|---|
| 🔧 Tools | Selects a PS tool | Brush, Lasso, Clone Stamp |
| 📋 Menu | Runs a menu item | Image → Adjustments → Curves |
| ▶ PS Action | Plays a recorded PS Action | Your Sets > Export Action |
| 🎭 Blend Mode | Sets the layer blend mode | Multiply, Screen, Overlay |
| 🎚 Adjustment | Creates an adjustment layer (no dialog) | Levels, Curves, Hue/Sat |
| 📄 Layer Ops | Layer-level operations | Reveal All Mask, Merge Visible |
| ⚙ Custom | Built-in workflow functions | CC Match Layers, Color Grade Stack |

### Keyboard Shortcuts
UXP does not support native shortcut registration. To assign real keyboard shortcuts:
1. Set a **Shortcut Label** in the button Appearance tab (e.g., `F5`) — this is a visual badge only
2. In Photoshop, go to **Edit → Keyboard Shortcuts**
3. Under **Application Menus → Plugins → Omni Ops** — your button's action may appear there if you record it as a PS Action first

### Export / Import Config
Go to **Plugins → Omni Ops** in the menu bar:
- **Export Layout Config...** — Saves your entire layout to a `.json` file
- **Import Layout Config...** — Loads a saved layout from a `.json` file
- **Reset to Defaults** — Resets to the default layout
- **About Omni Ops** — Version info

### Alt-Click for Clipping Mask
On any Custom Function button: hold **Alt** while clicking to automatically apply a **Clipping Mask** after the operation.

---

## 🛠️ Development Guide

### Adding a New Action Type

1. **Add data** to the appropriate data file (e.g., `layerActionsData.js`)
2. **Add service logic** in `LayerService.js` or create a new service file
3. **Register the type** in `ActionService.js` `switch` statement
4. **Data automatically appears** in `ButtonEditModal.jsx` search results

### Adding a New batchPlay Operation

Always use Alchemist (UXP Developer Tool) to record descriptors. Never hand-write them.

```javascript
// ✅ Correct: wrapped in a service function
// services/LayerService.js
export async function myNewOperation() {
    await batchPlay([{
        // Descriptor recorded with Alchemist
    }], {});
}

// ✅ Correct: called from ActionService
case 'myType':
    await core.executeAsModal(async () => {
        await LayerService.myNewOperation();
    }, { commandName: 'My Operation' });
    break;

// ❌ Wrong: raw batchPlay in a component
<button onClick={() => batchPlay([...])} />
```

### State Management
All state lives in `PanelContext`. To update config:
```javascript
const { config, updateConfig } = usePanel();

// Always deep-clone before modifying
const newConfig = JSON.parse(JSON.stringify(config));
newConfig.panels[0].spaces[spaceIndex].layout.items = [...];
updateConfig(newConfig); // auto-saves to disk
```

---

## 📐 Config Schema

```json
{
  "panels": [{
    "id": "main_panel",
    "activeSpaceId": "space_id",
    "spaces": [{
      "id": "space_id",
      "name": "Tab Name",
      "layout": {
        "type": "grid",
        "columns": 8,
        "items": [{
          "id": "btn_unique_id",
          "x": 0, "y": 0, "w": 4, "h": 2,
          "type": "button",
          "label": "My Button",
          "actionType": "tool",
          "actionValue": "paintbrushTool",
          "icon": "🎨",
          "buttonColor": "#d13438",
          "textColor": "",
          "showLabel": true,
          "buttonSize": "standard",
          "shortcut": "F5"
        }]
      }
    }]
  }]
}
```

---

## 🐛 Known Issues & Limitations

| Issue | Status | Workaround |
|---|---|---|
| Keyboard shortcuts can't be natively registered in UXP | By Design | Use PS Keyboard Shortcuts dialog + shortcut label badge |
| Brush preset listing requires Alchemist-recorded descriptors | Planned for v0.3.0 | Use PS Actions to apply presets |
| `app.actionTree` empty if PS Actions panel never opened | Edge Case | Open Actions panel in PS before configuring |
| Blend-if sliders complex descriptor testing | Planned for v0.4.0 | Use batchPlay Alchemist recording |
| `executeAsModal` timeout for Curves/Levels dialogs | Expected | Treated as success — interactive dialog opened |

---

## 📋 Roadmap

### v0.2.0 — Action Engine Expansion
- All blend modes in button config ✅ (data ready, Phase 2 wires UI)
- All 16 adjustment layer types ✅ (service ready)
- Full mask operations ✅ (service ready)
- Merge / flatten operations ✅ (service ready)
- Collapse / expand groups ✅ (service ready)

### v0.3.0 — Config UX
- Redesigned tabbed ButtonEditModal ✅ (done in v0.1.0 as foundation)
- Full Spectrum icon picker (~900 icons)
- Real PS Actions from `app.actionTree` ✅ (service ready)
- Keyboard shortcut label field ✅ (done in v0.1.0)
- Right-click context menu ✅ (done in v0.1.0)

### v0.4.0 — Widgets
- Opacity slider
- Fill slider
- Blend-If sliders
- Divider / spacer widgets
- `PSStateContext` for reactive PS state

### v0.5.0 — Persistence
- Export config command ✅ (wired in v0.1.0)
- Import config command ✅ (wired in v0.1.0)
- Per-panel backup

### v1.0.0 — Polish
- Selection indicator (dashed panel border)
- Panel hide on click
- Smooth edit mode transitions
- Onboarding empty state

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.

---

## 🤝 Contributing

This is a private project. For issues or feature requests, please open a GitHub issue.

---

*Built with React, Webpack, and the Adobe UXP API.*
