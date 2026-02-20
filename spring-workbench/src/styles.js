/**
 * Spring Workbench Styles
 * Dark theme matching reference design
 */

export const STYLES = `
/* Spring Workbench Container */
.spring-workbench {
  --sw-bg-primary: #1a1a1a;
  --sw-bg-secondary: #2d2d2d;
  --sw-bg-tertiary: #3d3d3d;
  --sw-text-primary: #f5f5f5;
  --sw-text-secondary: #b0b0b0;
  --sw-accent: #4a9eff;
  --sw-accent-hover: #6bb3ff;
  --sw-border: #404040;
  --sw-border-light: #505050;
  --sw-success: #4caf50;
  --sw-warning: #ff9800;
  --sw-error: #f44336;
  --sw-radius: 8px;
  --sw-radius-lg: 12px;
  --sw-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  --sw-transition: 0.2s ease;
  
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: var(--sw-text-primary);
  z-index: 99999;
}

/* Sticky Trigger Button */
.sw-trigger {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--sw-bg-secondary);
  border: 1px solid var(--sw-border);
  color: var(--sw-text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--sw-shadow);
  transition: all var(--sw-transition);
  z-index: 99999;
}

.sw-trigger:hover {
  background: var(--sw-bg-tertiary);
  border-color: var(--sw-accent);
  transform: scale(1.05);
}

.sw-trigger.active {
  background: var(--sw-accent);
  border-color: var(--sw-accent);
}

/* Popover Panel */
.sw-popover {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 320px;
  max-height: 500px;
  background: var(--sw-bg-primary);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-lg);
  box-shadow: var(--sw-shadow);
  overflow: hidden;
  display: none;
  flex-direction: column;
  z-index: 99998;
}

.sw-popover.open {
  display: flex;
}

/* List View Container */
.sw-list-view {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

/* Editor View Container */
.sw-editor-view {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.sw-rig-content {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.sw-popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--sw-bg-secondary);
  border-bottom: 1px solid var(--sw-border);
}

.sw-popover-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.sw-popover-close {
  background: none;
  border: none;
  color: var(--sw-text-secondary);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all var(--sw-transition);
}

.sw-popover-close:hover {
  background: var(--sw-bg-tertiary);
  color: var(--sw-text-primary);
}

/* Preset/Animation List */
.sw-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.sw-list-section {
  margin-bottom: 16px;
}

.sw-list-section-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--sw-text-secondary);
  padding: 8px 8px 4px;
  margin: 0;
}

.sw-list-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  margin: 2px 0;
  background: var(--sw-bg-secondary);
  border: 1px solid transparent;
  border-radius: var(--sw-radius);
  cursor: pointer;
  transition: all var(--sw-transition);
}

.sw-list-item:hover {
  background: var(--sw-bg-tertiary);
  border-color: var(--sw-border-light);
}

.sw-list-item.selected {
  border-color: var(--sw-accent);
  background: rgba(74, 158, 255, 0.1);
}

.sw-list-item-info {
  flex: 1;
  min-width: 0;
}

.sw-list-item-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sw-list-item-desc {
  font-size: 12px;
  color: var(--sw-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sw-list-item-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity var(--sw-transition);
}

.sw-list-item:hover .sw-list-item-actions {
  opacity: 1;
}

.sw-list-item-btn {
  background: none;
  border: none;
  color: var(--sw-text-secondary);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all var(--sw-transition);
}

.sw-list-item-btn:hover {
  background: var(--sw-bg-primary);
  color: var(--sw-text-primary);
}

.sw-list-item-btn.delete:hover {
  color: var(--sw-error);
}

/* Rename Input */
.sw-rename-input {
  flex: 1;
  background: var(--sw-bg-primary);
  border: 1px solid var(--sw-accent);
  border-radius: 4px;
  color: var(--sw-text-primary);
  padding: 4px 8px;
  font-size: 14px;
  outline: none;
}

/* Spring Rig Panel */
.sw-rig {
  position: fixed;
  bottom: 80px;
  right: 350px;
  width: 340px;
  background: var(--sw-bg-primary);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-lg);
  box-shadow: var(--sw-shadow);
  overflow: hidden;
  display: none;
  flex-direction: column;
  z-index: 99997;
}

.sw-rig.open {
  display: flex;
}

.sw-rig-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--sw-bg-secondary);
  border-bottom: 1px solid var(--sw-border);
  cursor: move;
}

.sw-rig-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.sw-rig-header-actions {
  display: flex;
  gap: 8px;
}

/* Duration Display */
.sw-duration {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--sw-bg-secondary);
  border-bottom: 1px solid var(--sw-border);
}

.sw-duration-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--sw-text-secondary);
}

.sw-duration-value {
  width: 100px;
  background: var(--sw-bg-secondary);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius);
  color: var(--sw-text-primary);
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  text-align: right;
  outline: none;
  transition: border-color var(--sw-transition);
  cursor: ew-resize;
}

.sw-duration-value:hover {
  border-color: var(--sw-border-light);
}

.sw-duration-value:focus {
  border-color: var(--sw-accent);
  cursor: text;
}

/* Visualization Canvas Area */
.sw-visualization {
  position: relative;
  height: 200px;
  background: var(--sw-bg-secondary);
  border-bottom: 1px solid var(--sw-border);
  overflow: hidden;
}

.sw-canvas {
  width: 100%;
  height: 100%;
}

/* 2D Draggable Circle */
.sw-drag-circle {
  position: absolute;
  width: 20px;
  height: 20px;
  background: var(--sw-text-primary);
  border-radius: 50%;
  cursor: grab;
  transform: translate(-50%, -50%);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: box-shadow var(--sw-transition);
  z-index: 10;
}

.sw-drag-circle:hover,
.sw-drag-circle.dragging {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.sw-drag-circle.dragging {
  cursor: grabbing;
}

/* 1D Draggable Slider */
.sw-slider-track {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80%;
  height: 4px;
  background: var(--sw-bg-tertiary);
  border-radius: 2px;
}

.sw-slider-thumb {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 24px;
  background: var(--sw-text-primary);
  border-radius: 4px;
  cursor: ew-resize;
  transform: translate(-50%, -50%);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  z-index: 10;
}

.sw-slider-thumb:hover,
.sw-slider-thumb.dragging {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

/* Parameter Controls */
.sw-controls {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sw-control-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sw-control-label {
  color: var(--sw-text-secondary);
  font-size: 14px;
}

.sw-control-input {
  width: 100px;
  background: var(--sw-bg-secondary);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius);
  color: var(--sw-text-primary);
  padding: 8px 12px;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  text-align: right;
  outline: none;
  transition: border-color var(--sw-transition);
  cursor: ew-resize;
}

.sw-control-input:hover {
  border-color: var(--sw-border-light);
}

.sw-control-input:focus {
  border-color: var(--sw-accent);
  cursor: text;
}

.sw-control-input.readonly {
  cursor: default;
  color: var(--sw-text-secondary);
  background: var(--sw-bg-tertiary);
}

/* Save Preset Button */
.sw-save-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px 16px;
  margin-top: 8px;
  background: var(--sw-accent);
  border: none;
  border-radius: var(--sw-radius);
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--sw-transition);
}

.sw-save-btn:hover {
  background: var(--sw-accent-hover);
}

/* Save Dialog */
.sw-save-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 100000;
}

.sw-save-dialog.open {
  display: flex;
}

.sw-save-dialog-content {
  background: var(--sw-bg-primary);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-lg);
  padding: 24px;
  width: 300px;
  box-shadow: var(--sw-shadow);
}

.sw-save-dialog-content h4 {
  margin: 0 0 16px;
  font-size: 16px;
}

.sw-save-dialog-input {
  width: 100%;
  background: var(--sw-bg-secondary);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius);
  color: var(--sw-text-primary);
  padding: 10px 12px;
  font-size: 14px;
  outline: none;
  margin-bottom: 16px;
  box-sizing: border-box;
}

.sw-save-dialog-input:focus {
  border-color: var(--sw-accent);
}

.sw-save-dialog-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.sw-dialog-btn {
  padding: 8px 16px;
  border-radius: var(--sw-radius);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--sw-transition);
}

.sw-dialog-btn.primary {
  background: var(--sw-accent);
  border: none;
  color: white;
}

.sw-dialog-btn.primary:hover {
  background: var(--sw-accent-hover);
}

.sw-dialog-btn.secondary {
  background: transparent;
  border: 1px solid var(--sw-border);
  color: var(--sw-text-primary);
}

.sw-dialog-btn.secondary:hover {
  background: var(--sw-bg-secondary);
}

/* Animation Preview Button */
.sw-preview-btn {
  background: none;
  border: 1px solid var(--sw-border);
  color: var(--sw-text-primary);
  padding: 6px 12px;
  border-radius: var(--sw-radius);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  transition: all var(--sw-transition);
}

.sw-preview-btn:hover {
  background: var(--sw-bg-tertiary);
  border-color: var(--sw-border-light);
}

/* Scrollbar Styles */
.sw-list::-webkit-scrollbar {
  width: 8px;
}

.sw-list::-webkit-scrollbar-track {
  background: var(--sw-bg-primary);
}

.sw-list::-webkit-scrollbar-thumb {
  background: var(--sw-border);
  border-radius: 4px;
}

.sw-list::-webkit-scrollbar-thumb:hover {
  background: var(--sw-border-light);
}

/* Empty State */
.sw-empty {
  padding: 32px;
  text-align: center;
  color: var(--sw-text-secondary);
}

.sw-empty p {
  margin: 8px 0 0;
  font-size: 12px;
}
`;

/**
 * Inject styles into the document
 */
export function injectStyles() {
  if (document.getElementById('spring-workbench-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'spring-workbench-styles';
  style.textContent = STYLES;
  document.head.appendChild(style);
}

