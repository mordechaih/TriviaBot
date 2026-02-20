/**
 * Spring Workbench
 * Entry point for the bundled library
 */

import { Workbench } from './spring-workbench.js';
import { registry, DEFAULT_PRESETS, SpringRegistry } from './spring-registry.js';
import { 
  sampleSpring, 
  calculateDurationMs, 
  estimateDuration,
  animateSpring,
  generateKeyframes,
  positionToParams,
  paramsToPosition
} from './spring-utils.js';
import { icons, Icons, createIcon } from './icons.js';
import { injectStyles, STYLES } from './styles.js';

// Singleton workbench instance
let workbenchInstance = null;

/**
 * Initialize the Spring Workbench
 * @param {Object} options - Configuration options
 * @param {boolean} options.devMode - Whether to enable dev mode (default: true)
 * @param {Array} options.animations - Initial animations to register
 * @returns {Workbench} The workbench instance
 */
function init(options = {}) {
  if (workbenchInstance) {
    console.warn('Spring Workbench already initialized');
    return workbenchInstance;
  }
  
  workbenchInstance = new Workbench(options);
  workbenchInstance.init();
  
  // Register initial animations if provided
  if (options.animations && Array.isArray(options.animations)) {
    options.animations.forEach(anim => {
      registry.registerAnimation(anim.id, anim);
    });
  }
  
  return workbenchInstance;
}

/**
 * Get the workbench instance
 * @returns {Workbench|null}
 */
function getInstance() {
  return workbenchInstance;
}

/**
 * Destroy the workbench
 */
function destroy() {
  if (workbenchInstance) {
    workbenchInstance.destroy();
    workbenchInstance = null;
  }
}

/**
 * Register an animation
 * @param {string} id - Unique animation ID
 * @param {Object} config - Animation configuration
 */
function registerAnimation(id, config) {
  registry.registerAnimation(id, config);
}

/**
 * Get animation config
 * @param {string} id - Animation ID
 * @returns {Object|null}
 */
function getAnimation(id) {
  return registry.getAnimation(id);
}

/**
 * Get a preset config
 * @param {string} id - Preset ID
 * @returns {Object|null}
 */
function getPreset(id) {
  return registry.getPreset(id);
}

/**
 * Apply spring animation to an element
 * @param {HTMLElement} element - Target element
 * @param {string|Object} configOrPreset - Preset ID or config object
 * @param {string} property - CSS property
 * @param {number} from - Start value
 * @param {number} to - End value
 * @param {string} unit - CSS unit
 * @returns {Object} Animation controller
 */
function animate(element, configOrPreset, property, from, to, unit = '') {
  let config = configOrPreset;
  
  if (typeof configOrPreset === 'string') {
    config = registry.getPreset(configOrPreset) || registry.getAnimation(configOrPreset);
    if (!config) {
      console.error(`Spring config not found: ${configOrPreset}`);
      return null;
    }
  }
  
  return animateSpring(element, config, property, from, to, unit);
}

// Export everything
export {
  // Main API
  init,
  getInstance,
  destroy,
  registerAnimation,
  getAnimation,
  getPreset,
  animate,
  
  // Registry
  registry,
  DEFAULT_PRESETS,
  SpringRegistry,
  
  // Spring utilities
  sampleSpring,
  calculateDurationMs,
  estimateDuration,
  animateSpring,
  generateKeyframes,
  positionToParams,
  paramsToPosition,
  
  // Icons
  icons,
  Icons,
  createIcon,
  
  // Styles
  injectStyles,
  STYLES,
  
  // Workbench class
  Workbench
};

// Default export for convenience
export default {
  init,
  getInstance,
  destroy,
  registerAnimation,
  getAnimation,
  getPreset,
  animate,
  registry,
  DEFAULT_PRESETS
};

