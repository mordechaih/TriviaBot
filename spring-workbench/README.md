# Spring Workbench

An interactive spring animation configuration tool with real-time curve visualization and parameter tuning.

## Features

- **Interactive Rig UI**: Draggable 2D circle for stiffness/damping control, 1D slider for fine-tuning
- **Real-time Curve Visualization**: See your spring curve update instantly
- **Scrubbable Inputs**: Drag on number inputs to adjust values
- **Preset Management**: Save, rename, and delete custom presets
- **Animation Registry**: Track all animations in your project
- **localStorage Persistence**: Custom presets persist across sessions
- **Portable**: Self-contained component that works in any project

## Installation

### Option 1: Use the bundled file

Copy `dist/spring-workbench.bundle.js` to your project and include it:

```html
<script src="spring-workbench.bundle.js"></script>
<script>
  SpringWorkbench.init({
    devMode: true,
    animations: [
      { id: 'card-hover', name: 'Card Hover', stiffness: 200, damping: 20 }
    ]
  });
</script>
```

### Option 2: Build from source

```bash
cd spring-workbench
npm install
npm run build
```

## Usage

### Initialize the Workbench

```javascript
SpringWorkbench.init({
  devMode: true,  // Set to false to disable in production
  animations: [
    {
      id: 'my-animation',
      name: 'My Animation',
      stiffness: 170,
      damping: 26,
      mass: 1
    }
  ]
});
```

### Register Animations

```javascript
SpringWorkbench.registerAnimation('slide-in', {
  name: 'Slide In',
  stiffness: 300,
  damping: 25,
  mass: 1
});
```

### Apply Spring Animation

```javascript
const element = document.querySelector('.my-element');
SpringWorkbench.animate(element, 'slide-in', 'transform', 0, 100, 'px');
```

### Use Presets

```javascript
const config = SpringWorkbench.getPreset('bouncy');
// { stiffness: 200, damping: 10, mass: 1, ... }
```

## Default Presets

| Name | Stiffness | Damping | Use Case |
|------|-----------|---------|----------|
| `snappy` | 400 | 30 | Quick UI feedback |
| `bouncy` | 200 | 10 | Playful interactions |
| `smooth` | 100 | 20 | Gentle transitions |
| `stiff` | 500 | 35 | Instant response |
| `slow` | 80 | 25 | Deliberate motion |

## API Reference

### `SpringWorkbench.init(options)`

Initialize the workbench.

- `options.devMode` (boolean): Enable/disable the workbench UI
- `options.animations` (array): Initial animations to register

### `SpringWorkbench.registerAnimation(id, config)`

Register a new animation.

- `id` (string): Unique animation identifier
- `config.name` (string): Display name
- `config.stiffness` (number): Spring stiffness (default: 170)
- `config.damping` (number): Spring damping (default: 26)
- `config.mass` (number): Spring mass (default: 1)

### `SpringWorkbench.animate(element, configOrPreset, property, from, to, unit)`

Apply a spring animation to an element.

- `element` (HTMLElement): Target element
- `configOrPreset` (string|object): Preset ID or config object
- `property` (string): CSS property to animate
- `from` (number): Start value
- `to` (number): End value
- `unit` (string): CSS unit (e.g., 'px', 'deg')

### `SpringWorkbench.getPreset(id)`

Get a preset configuration by ID.

### `SpringWorkbench.getAnimation(id)`

Get a registered animation configuration by ID.

### `SpringWorkbench.destroy()`

Destroy the workbench and clean up.

## Exporting Configurations

Use the registry to export/import configurations:

```javascript
// Export
const config = SpringWorkbench.registry.exportConfig();
console.log(config); // JSON string

// Import
SpringWorkbench.registry.importConfig(jsonString);
```

## License

MIT

