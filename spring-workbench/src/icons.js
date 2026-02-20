/**
 * Lucide Icons Bundle
 * Only includes icons needed by Spring Workbench
 * Uses lucide static icon definitions
 */

import { 
  Settings, 
  Clock, 
  X, 
  Play, 
  Pause, 
  Save, 
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  createElement
} from 'lucide';

/**
 * Create an SVG icon element from Lucide icon definition
 */
export function createIcon(iconNode, options = {}) {
  const { size = 18, color = 'currentColor', strokeWidth = 2 } = options;
  
  // Create the SVG element using Lucide's createElement
  const svgElement = createElement(iconNode);
  svgElement.setAttribute('width', size);
  svgElement.setAttribute('height', size);
  svgElement.setAttribute('stroke', color);
  svgElement.setAttribute('stroke-width', strokeWidth);
  
  const container = document.createElement('span');
  container.appendChild(svgElement);
  container.className = 'sw-icon';
  container.style.display = 'inline-flex';
  container.style.alignItems = 'center';
  container.style.justifyContent = 'center';
  
  return container;
}

// Export icon definitions for use
export const Icons = {
  Settings,
  Clock,
  X,
  Play,
  Pause,
  Save,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  RotateCcw
};

// Convenience functions for common icons
export const icons = {
  settings: (opts) => createIcon(Settings, opts),
  clock: (opts) => createIcon(Clock, opts),
  close: (opts) => createIcon(X, opts),
  play: (opts) => createIcon(Play, opts),
  pause: (opts) => createIcon(Pause, opts),
  save: (opts) => createIcon(Save, opts),
  pencil: (opts) => createIcon(Pencil, opts),
  trash: (opts) => createIcon(Trash2, opts),
  chevronDown: (opts) => createIcon(ChevronDown, opts),
  chevronRight: (opts) => createIcon(ChevronRight, opts),
  reset: (opts) => createIcon(RotateCcw, opts)
};

