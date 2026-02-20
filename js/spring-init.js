/**
 * Spring Workbench Integration for TriviaBot
 * Initializes the spring workbench and registers project animations
 */

// Dev mode toggle - set to false for production
const SPRING_DEV_MODE = true;

/**
 * Initialize Spring Workbench when the script loads
 */
function initSpringWorkbench() {
  // Wait for SpringWorkbench to be available
  if (typeof SpringWorkbench === 'undefined') {
    console.warn('SpringWorkbench not loaded');
    return;
  }

  // Initialize with dev mode and project animations
  SpringWorkbench.init({
    devMode: SPRING_DEV_MODE,
    animations: [
      // Card hover effect
      {
        id: 'card-hover',
        name: 'Card Hover',
        stiffness: 200,
        damping: 25,
        mass: 1,
        property: 'background',
        description: 'Game card hover transition'
      },
      // Generate status slide-in
      {
        id: 'status-slide',
        name: 'Status Slide In',
        stiffness: 300,
        damping: 28,
        mass: 1,
        property: 'transform',
        description: 'Generate status notification slide'
      },
      // Round toggle rotation
      {
        id: 'toggle-rotate',
        name: 'Toggle Rotation',
        stiffness: 400,
        damping: 30,
        mass: 1,
        property: 'transform',
        description: 'Round header collapse/expand toggle'
      },
      // Button hover
      {
        id: 'button-hover',
        name: 'Button Hover',
        stiffness: 250,
        damping: 22,
        mass: 1,
        property: 'background',
        description: 'Navigation and filter button hover'
      },
      // Modal fade
      {
        id: 'modal-fade',
        name: 'Modal Fade',
        stiffness: 180,
        damping: 20,
        mass: 1,
        property: 'opacity',
        description: 'Modal backdrop and content fade'
      },
      // Popover appear
      {
        id: 'popover-appear',
        name: 'Popover Appear',
        stiffness: 350,
        damping: 28,
        mass: 1,
        property: 'transform',
        description: 'Popover scale and fade in'
      }
    ]
  });

  console.log('Spring Workbench initialized for TriviaBot');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSpringWorkbench);
} else {
  initSpringWorkbench();
}

/**
 * Apply spring animation to an element
 * Wrapper for SpringWorkbench.animate with project defaults
 */
function springAnimate(element, animationId, from, to, unit = '') {
  if (typeof SpringWorkbench === 'undefined') {
    console.warn('SpringWorkbench not available');
    return null;
  }
  
  const config = SpringWorkbench.getAnimation(animationId);
  if (!config) {
    console.warn(`Animation not found: ${animationId}`);
    return null;
  }
  
  return SpringWorkbench.animate(
    element, 
    config, 
    config.property || 'transform', 
    from, 
    to, 
    unit
  );
}

/**
 * Toggle Spring Workbench visibility at runtime
 */
function toggleSpringWorkbench() {
  const instance = SpringWorkbench.getInstance();
  if (instance) {
    instance.toggle();
  } else {
    console.warn('Spring Workbench not initialized');
  }
}

/**
 * Enable/disable Spring Workbench at runtime
 * @param {boolean} enabled 
 */
function setSpringDevMode(enabled) {
  if (enabled) {
    if (!SpringWorkbench.getInstance()) {
      initSpringWorkbench();
    }
    console.log('Spring Workbench enabled');
  } else {
    SpringWorkbench.destroy();
    console.log('Spring Workbench disabled');
  }
}

// Export for use in other scripts and console
window.springAnimate = springAnimate;
window.initSpringWorkbench = initSpringWorkbench;
window.toggleSpringWorkbench = toggleSpringWorkbench;
window.setSpringDevMode = setSpringDevMode;

// Add console helpers
console.log('%c🔧 Spring Workbench loaded', 'color: #4a9eff; font-weight: bold');
console.log('%cCommands:', 'color: #888');
console.log('  toggleSpringWorkbench() - Toggle workbench visibility');
console.log('  setSpringDevMode(true/false) - Enable/disable workbench');
console.log('  SpringWorkbench.registry.exportConfig() - Export all configs');
console.log('  SpringWorkbench.registry.importConfig(json) - Import configs');

