/**
 * Spring Utilities
 * Uses custom spring physics calculations for visualization and animation
 */

/**
 * Calculate spring values for visualization using physics equations
 * @param {Object} config - Spring configuration
 * @param {number} config.stiffness - Spring stiffness
 * @param {number} config.damping - Spring damping
 * @param {number} config.mass - Spring mass
 * @param {number} numSamples - Number of samples to generate
 * @returns {Array} Array of {t, value} samples
 */
export function sampleSpring(config, numSamples = 100) {
  const { stiffness, damping, mass } = config;
  
  const samples = [];
  const duration = estimateDuration(config);
  
  // Spring physics parameters
  const omega0 = Math.sqrt(stiffness / mass); // Natural frequency
  const zeta = damping / (2 * Math.sqrt(stiffness * mass)); // Damping ratio
  
  for (let i = 0; i <= numSamples; i++) {
    const t = (i / numSamples) * duration;
    let value;
    
    if (zeta < 1) {
      // Underdamped - oscillates
      const omegaD = omega0 * Math.sqrt(1 - zeta * zeta);
      const envelope = Math.exp(-zeta * omega0 * t);
      value = 1 - envelope * (Math.cos(omegaD * t) + (zeta * omega0 / omegaD) * Math.sin(omegaD * t));
    } else if (zeta === 1) {
      // Critically damped
      const envelope = Math.exp(-omega0 * t);
      value = 1 - envelope * (1 + omega0 * t);
    } else {
      // Overdamped
      const s1 = -omega0 * (zeta - Math.sqrt(zeta * zeta - 1));
      const s2 = -omega0 * (zeta + Math.sqrt(zeta * zeta - 1));
      const c1 = s2 / (s2 - s1);
      const c2 = -s1 / (s2 - s1);
      value = 1 - c1 * Math.exp(s1 * t) - c2 * Math.exp(s2 * t);
    }
    
    samples.push({ t, value });
  }
  
  return samples;
}

/**
 * Estimate spring duration (time to settle)
 * Based on the spring parameters
 * @param {Object} config - Spring configuration
 * @returns {number} Estimated duration in seconds
 */
export function estimateDuration(config) {
  const { stiffness, damping, mass } = config;
  
  // Calculate damping ratio
  const criticalDamping = 2 * Math.sqrt(stiffness * mass);
  const dampingRatio = damping / criticalDamping;
  
  // Natural frequency
  const omega = Math.sqrt(stiffness / mass);
  
  // Estimate settling time (to within ~2% of target)
  // For underdamped: ~4 / (damping ratio * omega)
  // For overdamped: longer decay
  
  if (dampingRatio >= 1) {
    // Critically damped or overdamped
    return Math.max(0.3, 4 / omega);
  } else {
    // Underdamped - oscillates
    const dampedFreq = omega * Math.sqrt(1 - dampingRatio * dampingRatio);
    return Math.max(0.3, 4 / (dampingRatio * omega));
  }
}

/**
 * Calculate duration in milliseconds
 * @param {Object} config - Spring configuration
 * @returns {number} Duration in milliseconds
 */
export function calculateDurationMs(config) {
  return Math.round(estimateDuration(config) * 1000);
}

/**
 * Apply spring animation to an element
 * @param {HTMLElement} element - Target element
 * @param {Object} config - Spring configuration
 * @param {string} property - CSS property to animate
 * @param {number} from - Start value
 * @param {number} to - End value
 * @param {string} unit - CSS unit (px, deg, etc.)
 * @returns {Object} Animation controller
 */
export function animateSpring(element, config, property, from, to, unit = '') {
  const { stiffness, damping, mass } = config;
  
  let startTime = null;
  let animationId = null;
  let isRunning = true;
  
  const duration = estimateDuration(config);
  const durationMs = duration * 1000;
  
  // Spring physics parameters
  const omega0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  
  function calculateSpringValue(t) {
    if (zeta < 1) {
      // Underdamped
      const omegaD = omega0 * Math.sqrt(1 - zeta * zeta);
      const envelope = Math.exp(-zeta * omega0 * t);
      return 1 - envelope * (Math.cos(omegaD * t) + (zeta * omega0 / omegaD) * Math.sin(omegaD * t));
    } else if (zeta === 1) {
      // Critically damped
      const envelope = Math.exp(-omega0 * t);
      return 1 - envelope * (1 + omega0 * t);
    } else {
      // Overdamped
      const s1 = -omega0 * (zeta - Math.sqrt(zeta * zeta - 1));
      const s2 = -omega0 * (zeta + Math.sqrt(zeta * zeta - 1));
      const c1 = s2 / (s2 - s1);
      const c2 = -s1 / (s2 - s1);
      return 1 - c1 * Math.exp(s1 * t) - c2 * Math.exp(s2 * t);
    }
  }
  
  function animate(currentTime) {
    if (!isRunning) return;
    
    if (startTime === null) {
      startTime = currentTime;
    }
    
    const elapsed = (currentTime - startTime) / 1000; // Convert to seconds
    
    if (elapsed >= duration) {
      // Animation complete
      element.style[property] = `${to}${unit}`;
      isRunning = false;
      return;
    }
    
    const progress = calculateSpringValue(elapsed);
    const value = from + (to - from) * progress;
    
    element.style[property] = `${value}${unit}`;
    
    animationId = requestAnimationFrame(animate);
  }
  
  animationId = requestAnimationFrame(animate);
  
  return {
    stop: () => {
      isRunning = false;
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    },
    isRunning: () => isRunning
  };
}

/**
 * Generate CSS keyframes for a spring animation
 * Useful for exporting animations
 * @param {Object} config - Spring configuration
 * @param {number} from - Start value
 * @param {number} to - End value
 * @param {number} numKeyframes - Number of keyframes
 * @returns {string} CSS keyframes string
 */
export function generateKeyframes(config, from, to, numKeyframes = 20) {
  const samples = sampleSpring(config, numKeyframes);
  const duration = estimateDuration(config);
  
  const keyframes = samples.map(({ t, value }, i) => {
    const percent = Math.round((t / duration) * 100);
    const interpolated = from + (to - from) * value;
    return `  ${percent}% { transform: translateX(${interpolated}px); }`;
  });
  
  return `@keyframes springAnimation {\n${keyframes.join('\n')}\n}`;
}

/**
 * Map 2D position to spring parameters
 * Used by the draggable circle
 * @param {number} x - X position (0-1)
 * @param {number} y - Y position (0-1)
 * @returns {Object} { stiffness, damping }
 */
export function positionToParams(x, y) {
  // X controls stiffness (50-500)
  // Y controls damping (5-50)
  const stiffness = Math.round(50 + x * 450);
  const damping = Math.round(5 + (1 - y) * 45);
  
  return { stiffness, damping };
}

/**
 * Map spring parameters to 2D position
 * Inverse of positionToParams
 * @param {number} stiffness
 * @param {number} damping
 * @returns {Object} { x, y }
 */
export function paramsToPosition(stiffness, damping) {
  const x = Math.max(0, Math.min(1, (stiffness - 50) / 450));
  const y = Math.max(0, Math.min(1, 1 - (damping - 5) / 45));
  
  return { x, y };
}

/**
 * Map slider position to duration modifier
 * Used by the 1D slider
 * @param {number} x - X position (0-1)
 * @returns {number} Duration modifier (0.5-2.0)
 */
export function sliderToDurationMod(x) {
  return 0.5 + x * 1.5;
}

/**
 * Map duration modifier to slider position
 * @param {number} mod - Duration modifier
 * @returns {number} X position (0-1)
 */
export function durationModToSlider(mod) {
  return Math.max(0, Math.min(1, (mod - 0.5) / 1.5));
}

