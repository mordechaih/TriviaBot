/**
 * Spring Registry
 * Manages animation presets and custom configurations
 */

// Default spring presets
export const DEFAULT_PRESETS = {
  snappy: {
    name: 'Snappy',
    stiffness: 400,
    damping: 30,
    mass: 1,
    description: 'Quick UI feedback'
  },
  bouncy: {
    name: 'Bouncy',
    stiffness: 200,
    damping: 10,
    mass: 1,
    description: 'Playful interactions'
  },
  smooth: {
    name: 'Smooth',
    stiffness: 100,
    damping: 20,
    mass: 1,
    description: 'Gentle transitions'
  },
  stiff: {
    name: 'Stiff',
    stiffness: 500,
    damping: 35,
    mass: 1,
    description: 'Instant response'
  },
  slow: {
    name: 'Slow',
    stiffness: 80,
    damping: 25,
    mass: 1,
    description: 'Deliberate motion'
  }
};

const STORAGE_KEY = 'spring-workbench-presets';
const ANIMATIONS_STORAGE_KEY = 'spring-workbench-animations';

/**
 * Spring Registry Class
 * Manages all spring animations and presets
 */
export class SpringRegistry {
  constructor() {
    this.presets = { ...DEFAULT_PRESETS };
    this.customPresets = {};
    this.animations = new Map();
    this.listeners = new Set();
    this.loadFromStorage();
  }

  /**
   * Load custom presets from localStorage
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.customPresets = JSON.parse(stored);
      }
      const storedAnimations = localStorage.getItem(ANIMATIONS_STORAGE_KEY);
      if (storedAnimations) {
        const parsed = JSON.parse(storedAnimations);
        Object.entries(parsed).forEach(([id, config]) => {
          this.animations.set(id, config);
        });
      }
    } catch (e) {
      console.warn('Failed to load spring presets from storage:', e);
    }
  }

  /**
   * Save custom presets to localStorage
   */
  saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.customPresets));
      const animationsObj = {};
      this.animations.forEach((config, id) => {
        animationsObj[id] = config;
      });
      localStorage.setItem(ANIMATIONS_STORAGE_KEY, JSON.stringify(animationsObj));
    } catch (e) {
      console.warn('Failed to save spring presets to storage:', e);
    }
  }

  /**
   * Get all presets (default + custom)
   */
  getAllPresets() {
    return {
      ...this.presets,
      ...this.customPresets
    };
  }

  /**
   * Get a specific preset by ID
   */
  getPreset(id) {
    return this.presets[id] || this.customPresets[id] || null;
  }

  /**
   * Save current configuration as a new preset
   */
  saveAsPreset(name, config) {
    const id = this.generatePresetId(name);
    this.customPresets[id] = {
      name,
      stiffness: config.stiffness,
      damping: config.damping,
      mass: config.mass,
      description: 'Custom preset',
      isCustom: true
    };
    this.saveToStorage();
    this.notifyListeners();
    return id;
  }

  /**
   * Rename a preset
   */
  renamePreset(id, newName) {
    // If it's a default preset, copy it to custom
    if (this.presets[id]) {
      const preset = { ...this.presets[id], name: newName, isCustom: true };
      const newId = this.generatePresetId(newName);
      this.customPresets[newId] = preset;
      this.saveToStorage();
      this.notifyListeners();
      return newId;
    }
    // If it's already custom, just rename
    if (this.customPresets[id]) {
      this.customPresets[id].name = newName;
      this.saveToStorage();
      this.notifyListeners();
      return id;
    }
    return null;
  }

  /**
   * Delete a custom preset
   */
  deletePreset(id) {
    if (this.customPresets[id]) {
      delete this.customPresets[id];
      this.saveToStorage();
      this.notifyListeners();
      return true;
    }
    return false;
  }

  /**
   * Generate a unique preset ID from name
   */
  generatePresetId(name) {
    const base = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    let id = base;
    let counter = 1;
    while (this.presets[id] || this.customPresets[id]) {
      id = `${base}-${counter}`;
      counter++;
    }
    return id;
  }

  /**
   * Register an animation
   */
  registerAnimation(id, config) {
    this.animations.set(id, {
      id,
      name: config.name || id,
      stiffness: config.stiffness || 170,
      damping: config.damping || 26,
      mass: config.mass || 1,
      element: config.element || null,
      property: config.property || 'transform',
      ...config
    });
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Update an animation's configuration
   */
  updateAnimation(id, config) {
    const existing = this.animations.get(id);
    if (existing) {
      this.animations.set(id, { ...existing, ...config });
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  /**
   * Get all registered animations
   */
  getAnimations() {
    return Array.from(this.animations.values());
  }

  /**
   * Get a specific animation
   */
  getAnimation(id) {
    return this.animations.get(id);
  }

  /**
   * Subscribe to changes
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of changes
   */
  notifyListeners() {
    this.listeners.forEach(callback => callback());
  }

  /**
   * Export all configurations as JSON
   */
  exportConfig() {
    return JSON.stringify({
      presets: this.customPresets,
      animations: Object.fromEntries(this.animations)
    }, null, 2);
  }

  /**
   * Import configurations from JSON
   */
  importConfig(json) {
    try {
      const data = JSON.parse(json);
      if (data.presets) {
        this.customPresets = { ...this.customPresets, ...data.presets };
      }
      if (data.animations) {
        Object.entries(data.animations).forEach(([id, config]) => {
          this.animations.set(id, config);
        });
      }
      this.saveToStorage();
      this.notifyListeners();
      return true;
    } catch (e) {
      console.error('Failed to import config:', e);
      return false;
    }
  }
}

// Singleton instance
export const registry = new SpringRegistry();

