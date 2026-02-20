/**
 * Spring Workbench
 * Interactive spring animation configuration tool
 */

import { registry, DEFAULT_PRESETS } from './spring-registry.js';
import { icons } from './icons.js';
import { injectStyles } from './styles.js';
import { animate, stagger } from 'motion';
import { 
  sampleSpring, 
  calculateDurationMs,
  estimateDuration,
  paramsToPosition, 
  positionToParams,
  animateSpring
} from './spring-utils.js';

/**
 * Main Spring Workbench class
 */
export class Workbench {
  constructor(options = {}) {
    this.options = {
      devMode: true,
      position: 'bottom-right',
      ...options
    };
    
    this.isOpen = false;
    this.selectedAnimation = null;
    this.currentConfig = {
      stiffness: 170,
      damping: 26,
      mass: 1
    };
    
    this.elements = {};
    this.isDragging = false;
    this.dragTarget = null;
    
    // Bind methods
    this.handleTriggerClick = this.handleTriggerClick.bind(this);
    this.handleDocumentClick = this.handleDocumentClick.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
  }

  /**
   * Initialize the workbench
   */
  init() {
    if (!this.options.devMode) return;
    
    injectStyles();
    this.createDOM();
    this.attachEventListeners();
    this.render();
    
    // Subscribe to registry changes
    registry.subscribe(() => this.render());
  }

  /**
   * Create all DOM elements
   */
  createDOM() {
    // Container
    this.elements.container = document.createElement('div');
    this.elements.container.className = 'spring-workbench';
    
    // Trigger button
    this.elements.trigger = document.createElement('button');
    this.elements.trigger.className = 'sw-trigger';
    this.elements.trigger.setAttribute('aria-label', 'Open Spring Workbench');
    this.elements.trigger.appendChild(icons.settings({ size: 22 }));
    
    // Popover (contains both list and editor views)
    this.elements.popover = this.createPopover();
    
    // Save dialog
    this.elements.saveDialog = this.createSaveDialog();
    
    // Append to container
    this.elements.container.appendChild(this.elements.trigger);
    this.elements.container.appendChild(this.elements.popover);
    this.elements.container.appendChild(this.elements.saveDialog);
    
    // Append to body
    document.body.appendChild(this.elements.container);
  }

  /**
   * Create popover panel (contains both list and editor views)
   */
  createPopover() {
    const popover = document.createElement('div');
    popover.className = 'sw-popover';
    
    // List view container
    const listView = document.createElement('div');
    listView.className = 'sw-list-view';
    
    // Header for list view
    const header = document.createElement('div');
    header.className = 'sw-popover-header';
    
    const title = document.createElement('h3');
    title.textContent = 'Spring Animations';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'sw-popover-close';
    closeBtn.appendChild(icons.close({ size: 16 }));
    closeBtn.onclick = () => this.close();
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    
    // List
    const list = document.createElement('div');
    list.className = 'sw-list';
    this.elements.list = list;
    
    listView.appendChild(header);
    listView.appendChild(list);
    this.elements.listView = listView;
    
    // Editor view container (rig content)
    const editorView = document.createElement('div');
    editorView.className = 'sw-editor-view';
    editorView.style.display = 'none';
    
    // Create rig content inside editor view
    const rigContent = this.createRigContent();
    editorView.appendChild(rigContent);
    this.elements.editorView = editorView;
    
    popover.appendChild(listView);
    popover.appendChild(editorView);
    
    return popover;
  }

  /**
   * Create rig content (for editor view)
   */
  createRigContent() {
    const rigContent = document.createElement('div');
    rigContent.className = 'sw-rig-content';
    
    // Header
    const header = document.createElement('div');
    header.className = 'sw-rig-header';
    
    const title = document.createElement('h3');
    title.textContent = 'Configure Spring';
    this.elements.rigTitle = title; // Store reference for updates
    
    const headerActions = document.createElement('div');
    headerActions.className = 'sw-rig-header-actions';
    
    const previewBtn = document.createElement('button');
    previewBtn.className = 'sw-preview-btn';
    previewBtn.appendChild(icons.play({ size: 14 }));
    previewBtn.appendChild(document.createTextNode('Preview'));
    previewBtn.onclick = () => this.playPreview();
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'sw-popover-close';
    closeBtn.appendChild(icons.close({ size: 16 }));
    closeBtn.onclick = () => this.closeRig();
    
    headerActions.appendChild(previewBtn);
    headerActions.appendChild(closeBtn);
    
    header.appendChild(title);
    header.appendChild(headerActions);
    
    // Duration display (scrubbable)
    const duration = document.createElement('div');
    duration.className = 'sw-duration';
    
    const durationLabel = document.createElement('div');
    durationLabel.className = 'sw-duration-label';
    durationLabel.appendChild(icons.clock({ size: 16 }));
    durationLabel.appendChild(document.createTextNode(' Duration'));
    
    const durationInput = document.createElement('input');
    durationInput.type = 'text';
    durationInput.className = 'sw-duration-value sw-control-input';
    durationInput.value = '667';
    durationInput.dataset.param = 'duration';
    this.elements.durationValue = durationInput;
    
    // Add scrub support for duration
    let scrubStartX = 0;
    let scrubStartValue = 0;
    let isScrubbing = false;
    
    durationInput.addEventListener('mousedown', (e) => {
      if (document.activeElement === durationInput) return;
      
      scrubStartX = e.clientX;
      scrubStartValue = parseFloat(durationInput.value) || 0;
      isScrubbing = true;
      durationInput.style.cursor = 'ew-resize';
      
      const onMouseMove = (e) => {
        if (!isScrubbing) return;
        const delta = e.clientX - scrubStartX;
        const newValue = Math.max(50, Math.round(scrubStartValue + delta * 0.5));
        durationInput.value = newValue;
        // Update duration by adjusting stiffness/damping to match
        this.updateDurationFromMs(newValue);
      };
      
      const onMouseUp = () => {
        isScrubbing = false;
        durationInput.style.cursor = '';
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
    
    durationInput.addEventListener('change', (e) => {
      const value = parseFloat(e.target.value) || 0;
      this.updateDurationFromMs(Math.max(50, value));
    });
    
    durationInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const value = parseFloat(durationInput.value) || 0;
        durationInput.value = value + 10;
        this.updateDurationFromMs(value + 10);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const value = parseFloat(durationInput.value) || 0;
        durationInput.value = Math.max(50, value - 10);
        this.updateDurationFromMs(Math.max(50, value - 10));
      }
    });
    
    // Wrap input with ms suffix
    const durationInputWrapper = document.createElement('div');
    durationInputWrapper.style.display = 'flex';
    durationInputWrapper.style.alignItems = 'center';
    durationInputWrapper.style.gap = '4px';
    
    const msLabel = document.createElement('span');
    msLabel.textContent = 'ms';
    msLabel.style.color = 'var(--sw-text-secondary)';
    msLabel.style.fontSize = '14px';
    
    durationInputWrapper.appendChild(durationInput);
    durationInputWrapper.appendChild(msLabel);
    
    duration.appendChild(durationLabel);
    duration.appendChild(durationInputWrapper);
    
    // Visualization area
    const visualization = document.createElement('div');
    visualization.className = 'sw-visualization';
    
    const canvas = document.createElement('canvas');
    canvas.className = 'sw-canvas';
    this.elements.canvas = canvas;
    
    const dragCircle = document.createElement('div');
    dragCircle.className = 'sw-drag-circle';
    dragCircle.dataset.dragType = 'circle';
    this.elements.dragCircle = dragCircle;
    
    const sliderTrack = document.createElement('div');
    sliderTrack.className = 'sw-slider-track';
    
    const sliderThumb = document.createElement('div');
    sliderThumb.className = 'sw-slider-thumb';
    sliderThumb.dataset.dragType = 'slider';
    this.elements.sliderThumb = sliderThumb;
    
    sliderTrack.appendChild(sliderThumb);
    
    visualization.appendChild(canvas);
    visualization.appendChild(dragCircle);
    visualization.appendChild(sliderTrack);
    this.elements.visualization = visualization;
    
    // Controls
    const controls = document.createElement('div');
    controls.className = 'sw-controls';
    
    // Stiffness
    const stiffnessRow = this.createControlRow('Stiffness', 'stiffness', 170);
    this.elements.stiffnessInput = stiffnessRow.querySelector('input');
    
    // Damping
    const dampingRow = this.createControlRow('Damping', 'damping', 26);
    this.elements.dampingInput = dampingRow.querySelector('input');
    
    // Mass (readonly)
    const massRow = this.createControlRow('Mass', 'mass', 1, true);
    this.elements.massInput = massRow.querySelector('input');
    
    // Save button
    const saveBtn = document.createElement('button');
    saveBtn.className = 'sw-save-btn';
    saveBtn.appendChild(icons.save({ size: 16 }));
    saveBtn.appendChild(document.createTextNode(' Save as Preset'));
    saveBtn.onclick = () => this.openSaveDialog();
    
    controls.appendChild(stiffnessRow);
    controls.appendChild(dampingRow);
    controls.appendChild(massRow);
    controls.appendChild(saveBtn);
    
    rigContent.appendChild(header);
    rigContent.appendChild(duration);
    rigContent.appendChild(visualization);
    rigContent.appendChild(controls);
    
    return rigContent;
  }

  /**
   * Create the rig panel (legacy - kept for compatibility)
   */
  createRig() {
    // This is now handled by createRigContent inside the popover
    // Return a dummy element for compatibility
    const rig = document.createElement('div');
    rig.className = 'sw-rig';
    rig.style.display = 'none';
    return rig;
  }

  /**
   * Create a control row
   */
  createControlRow(label, name, defaultValue, readonly = false) {
    const row = document.createElement('div');
    row.className = 'sw-control-row';
    
    const labelEl = document.createElement('label');
    labelEl.className = 'sw-control-label';
    labelEl.textContent = label;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'sw-control-input' + (readonly ? ' readonly' : '');
    input.value = defaultValue;
    input.readOnly = readonly;
    input.dataset.param = name;
    
    if (!readonly) {
      // Scrub support
      let scrubStartX = 0;
      let scrubStartValue = 0;
      let isScrubbing = false;
      
      input.addEventListener('mousedown', (e) => {
        if (document.activeElement === input) return; // Already focused, allow text selection
        
        scrubStartX = e.clientX;
        scrubStartValue = parseFloat(input.value) || 0;
        isScrubbing = true;
        input.style.cursor = 'ew-resize';
        
        const onMouseMove = (e) => {
          if (!isScrubbing) return;
          const delta = e.clientX - scrubStartX;
          const sensitivity = name === 'stiffness' ? 2 : 0.5;
          const newValue = Math.max(1, Math.round(scrubStartValue + delta * sensitivity));
          input.value = newValue;
          this.updateConfig(name, newValue);
        };
        
        const onMouseUp = () => {
          isScrubbing = false;
          input.style.cursor = '';
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });
      
      input.addEventListener('change', (e) => {
        const value = parseFloat(e.target.value) || 0;
        this.updateConfig(name, Math.max(1, value));
      });
      
      input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          const value = parseFloat(input.value) || 0;
          const step = name === 'stiffness' ? 10 : 1;
          input.value = value + step;
          this.updateConfig(name, value + step);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          const value = parseFloat(input.value) || 0;
          const step = name === 'stiffness' ? 10 : 1;
          input.value = Math.max(1, value - step);
          this.updateConfig(name, Math.max(1, value - step));
        }
      });
    }
    
    row.appendChild(labelEl);
    row.appendChild(input);
    
    return row;
  }

  /**
   * Create save dialog
   */
  createSaveDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'sw-save-dialog';
    
    const content = document.createElement('div');
    content.className = 'sw-save-dialog-content';
    
    const title = document.createElement('h4');
    title.textContent = 'Save as Preset';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'sw-save-dialog-input';
    input.placeholder = 'Enter preset name...';
    this.elements.saveInput = input;
    
    const actions = document.createElement('div');
    actions.className = 'sw-save-dialog-actions';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'sw-dialog-btn secondary';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = () => this.closeSaveDialog();
    
    const saveBtn = document.createElement('button');
    saveBtn.className = 'sw-dialog-btn primary';
    saveBtn.textContent = 'Save';
    saveBtn.onclick = () => this.savePreset();
    
    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);
    
    content.appendChild(title);
    content.appendChild(input);
    content.appendChild(actions);
    
    dialog.appendChild(content);
    
    // Close on backdrop click
    dialog.onclick = (e) => {
      if (e.target === dialog) this.closeSaveDialog();
    };
    
    // Save on Enter
    input.onkeydown = (e) => {
      if (e.key === 'Enter') this.savePreset();
      if (e.key === 'Escape') this.closeSaveDialog();
    };
    
    return dialog;
  }

  /**
   * Make rig panel draggable
   */
  makeRigDraggable(handle, panel) {
    let isDragging = false;
    let startX, startY;
    let startRight, startBottom;
    
    handle.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      
      const rect = panel.getBoundingClientRect();
      startRight = window.innerWidth - rect.right;
      startBottom = window.innerHeight - rect.bottom;
      
      document.body.style.userSelect = 'none';
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      panel.style.right = Math.max(20, startRight - deltaX) + 'px';
      panel.style.bottom = Math.max(80, startBottom - deltaY) + 'px';
    });
    
    document.addEventListener('mouseup', () => {
      isDragging = false;
      document.body.style.userSelect = '';
    });
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    this.elements.trigger.addEventListener('click', this.handleTriggerClick);
    document.addEventListener('click', this.handleDocumentClick);
    
    // Drag handlers for circle and slider
    this.elements.visualization.addEventListener('pointerdown', this.handlePointerDown);
    document.addEventListener('pointermove', this.handlePointerMove);
    document.addEventListener('pointerup', this.handlePointerUp);
  }

  /**
   * Handle trigger button click
   */
  handleTriggerClick(e) {
    e.stopPropagation();
    this.toggle();
  }

  /**
   * Handle document click (close on outside click)
   */
  handleDocumentClick(e) {
    if (!this.isOpen) return;
    
    // Check if click is inside the container (popover, rig, or trigger)
    const container = this.elements.container;
    if (!container) return;
    
    // Check if the click target is within the container or its children
    if (container.contains(e.target)) {
      return;
    }
    
    // Also check if clicking on the trigger button (it's part of container but might be separate)
    if (this.elements.trigger && this.elements.trigger.contains(e.target)) {
      return;
    }
    
    // Click is outside, close the workbench
    this.close();
  }

  /**
   * Handle pointer down on visualization
   */
  handlePointerDown(e) {
    const target = e.target;
    
    if (target.dataset.dragType === 'circle') {
      this.isDragging = true;
      this.dragTarget = 'circle';
      target.classList.add('dragging');
      target.setPointerCapture(e.pointerId);
    } else if (target.dataset.dragType === 'slider') {
      this.isDragging = true;
      this.dragTarget = 'slider';
      target.classList.add('dragging');
      target.setPointerCapture(e.pointerId);
    }
  }

  /**
   * Handle pointer move
   */
  handlePointerMove(e) {
    if (!this.isDragging) return;
    
    const rect = this.elements.visualization.getBoundingClientRect();
    
    if (this.dragTarget === 'circle') {
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / (rect.height - 60))); // Account for slider area
      
      const params = positionToParams(x, y);
      this.updateConfig('stiffness', params.stiffness);
      this.updateConfig('damping', params.damping);
    } else if (this.dragTarget === 'slider') {
      const sliderTrack = this.elements.visualization.querySelector('.sw-slider-track');
      const trackRect = sliderTrack.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - trackRect.left) / trackRect.width));
      
      this.elements.sliderThumb.style.left = (x * 100) + '%';
      // Slider affects stiffness for fine-tuning
      const stiffnessAdjust = Math.round(50 + x * 450);
      this.updateConfig('stiffness', stiffnessAdjust);
    }
  }

  /**
   * Handle pointer up
   */
  handlePointerUp(e) {
    if (this.isDragging) {
      this.isDragging = false;
      
      if (this.dragTarget === 'circle') {
        this.elements.dragCircle.classList.remove('dragging');
      } else if (this.dragTarget === 'slider') {
        this.elements.sliderThumb.classList.remove('dragging');
      }
      
      this.dragTarget = null;
    }
  }

  /**
   * Toggle popover
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Open popover with morphing transition (button morphs into popover)
   */
  open() {
    this.isOpen = true;
    
    // Get trigger button position and size
    const triggerRect = this.elements.trigger.getBoundingClientRect();
    const popover = this.elements.popover;
    const listView = this.elements.listView;
    
    // Hide trigger button with visibility to prevent flickering
    this.elements.trigger.style.visibility = 'hidden';
    this.elements.trigger.style.opacity = '0';
    this.elements.trigger.style.pointerEvents = 'none';
    
    // Set initial position and size to match trigger button (same bottom/right)
    const buttonBottom = 20; // Same as CSS
    const buttonRight = 20; // Same as CSS
    
    popover.style.position = 'fixed';
    popover.style.width = triggerRect.width + 'px';
    popover.style.height = triggerRect.height + 'px';
    popover.style.bottom = buttonBottom + 'px';
    popover.style.right = buttonRight + 'px';
    popover.style.borderRadius = '50%';
    popover.style.opacity = '1';
    popover.style.display = 'flex';
    popover.style.overflow = 'hidden';
    
    // Hide list content initially
    if (listView) {
      listView.style.opacity = '0';
      listView.style.transform = 'translateY(20px)';
    }
    
    // Force reflow
    popover.offsetHeight;
    
    // Animate to final size and position (same bottom/right, just expanded)
    requestAnimationFrame(() => {
      const finalWidth = 320;
      const finalHeight = 500;
      const finalBottom = buttonBottom; // Same vertical position
      const finalRight = buttonRight; // Same horizontal position
      
      popover.style.transition = 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1), height 0.4s cubic-bezier(0.4, 0, 0.2, 1), border-radius 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
      popover.style.width = finalWidth + 'px';
      popover.style.height = finalHeight + 'px';
      popover.style.borderRadius = 'var(--sw-radius-lg)';
      // bottom and right stay the same, no transition needed
      
      // Fade in and slide up list content after 100ms delay
      setTimeout(() => {
        if (listView) {
          listView.style.transition = 'opacity 0.1s ease-out, transform 0.1s ease-out';
          listView.style.opacity = '1';
          listView.style.transform = 'translateY(0)';
          
          // Animate list items with stagger
          this.animateListItems();
        }
      }, 100);
    });
    
    this.elements.trigger.classList.add('active');
    this.render();
    
    // Add open class after transition starts
    setTimeout(() => {
      popover.classList.add('open');
    }, 0);
  }

  /**
   * Close popover with reverse morphing transition (popover morphs back to button)
   */
  close() {
    this.isOpen = false;
    
    const popover = this.elements.popover;
    const triggerRect = this.elements.trigger.getBoundingClientRect();
    const listView = this.elements.listView;
    const editorView = this.elements.editorView;
    
    // If editor is open, close it first
    if (editorView && editorView.style.display !== 'none') {
      this.closeRig();
      // Wait for editor to close before closing popover
      setTimeout(() => this.close(), 400);
      return;
    }
    
    // Fade out list content first
    if (listView) {
      listView.style.transition = 'opacity 0.1s ease-out, transform 0.1s ease-out';
      listView.style.opacity = '0';
      listView.style.transform = 'translateY(20px)';
    }
    
    // Then morph back to button size (same position) with cross-fade
    const buttonBottom = 20;
    const buttonRight = 20;
    const morphDuration = 400; // ms
    
    // Start cross-fading button in as popover morphs out
    setTimeout(() => {
      // Make button visible and set up scale-down from upper-left with delayed fade-in
      this.elements.trigger.style.visibility = 'visible';
      this.elements.trigger.style.transformOrigin = 'top left';
      this.elements.trigger.style.transform = 'scale(1.4)';
      // Separate transitions: opacity first, then transform with significant delay
      this.elements.trigger.style.transition = 'opacity 0.3s ease-out, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.35s';
      this.elements.trigger.style.opacity = '0';
      this.elements.trigger.style.pointerEvents = 'auto';
      
      // Start morphing popover back to button size with fade-out
      popover.style.transition = 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1), height 0.4s cubic-bezier(0.4, 0, 0.2, 1), border-radius 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease-out';
      popover.style.width = triggerRect.width + 'px';
      popover.style.height = triggerRect.height + 'px';
      popover.style.borderRadius = '50%';
      popover.style.opacity = '0'; // Fade out popover
      
      // Fade in button first, then scale down after delay
      requestAnimationFrame(() => {
        this.elements.trigger.style.opacity = '1';
        // Transform will animate after delay (handled by CSS transition delay)
        this.elements.trigger.style.transform = 'scale(1)';
      });
      
      setTimeout(() => {
        // Clean up after transition completes
        popover.classList.remove('open');
        popover.style.display = 'none';
        popover.style.transition = '';
        popover.style.width = '';
        popover.style.height = '';
        popover.style.borderRadius = '';
        popover.style.opacity = '';
        this.elements.trigger.style.transition = '';
        this.elements.trigger.style.transform = '';
        this.elements.trigger.style.transformOrigin = '';
        if (listView) {
          listView.style.transition = '';
          listView.style.opacity = '';
          listView.style.transform = '';
        }
      }, morphDuration);
    }, 100);
    
    this.elements.trigger.classList.remove('active');
  }

  /**
   * Close rig panel - morphs editor view back into list view
   */
  closeRig() {
    const popover = this.elements.popover;
    const listView = this.elements.listView;
    const editorView = this.elements.editorView;
    
    // Fade out editor view
    if (editorView) {
      editorView.style.transition = 'opacity 0.2s ease-out, transform 0.2s ease-out';
      editorView.style.opacity = '0';
      editorView.style.transform = 'translateX(20px)';
    }
    
    // Shrink popover back to list view size
    setTimeout(() => {
      popover.style.transition = 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
      popover.style.width = '320px';
      
      // Hide editor and show list
      if (editorView) {
        editorView.style.display = 'none';
        editorView.style.transition = '';
        editorView.style.opacity = '';
        editorView.style.transform = '';
      }
      
      if (listView) {
        listView.style.display = 'flex';
        listView.style.opacity = '0';
        listView.style.transform = 'translateX(-20px)';
        listView.style.transition = 'opacity 0.3s ease-out 0.2s, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.2s';
        
        requestAnimationFrame(() => {
          listView.style.opacity = '1';
          listView.style.transform = 'translateX(0)';
        });
      }
      
      popover.style.transition = '';
    }, 200);
    
    this.selectedAnimation = null;
  }

  /**
   * Open rig for an animation or preset - morphs list view into editor view
   */
  openRig(config, title = 'Configure Spring') {
    this.currentConfig = { ...config };
    if (this.elements.rigTitle) {
      this.elements.rigTitle.textContent = title;
    }
    
    const popover = this.elements.popover;
    const listView = this.elements.listView;
    const editorView = this.elements.editorView;
    
    // Get current popover dimensions
    const popoverRect = popover.getBoundingClientRect();
    const editorWidth = 340;
    
    // Hide list view with fade out
    if (listView) {
      listView.style.transition = 'opacity 0.2s ease-out, transform 0.2s ease-out';
      listView.style.opacity = '0';
      listView.style.transform = 'translateX(-20px)';
    }
    
    // Expand popover to editor width and show editor
    setTimeout(() => {
      popover.style.transition = 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
      popover.style.width = editorWidth + 'px';
      
      // Hide list view and show editor view
      if (listView) {
        listView.style.display = 'none';
      }
      
      editorView.style.display = 'flex';
      editorView.style.opacity = '0';
      editorView.style.transform = 'translateX(20px)';
      editorView.style.transition = 'opacity 0.3s ease-out 0.2s, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.2s';
      
      requestAnimationFrame(() => {
        editorView.style.opacity = '1';
        editorView.style.transform = 'translateX(0)';
      });
      
      this.updateRigUI();
      this.drawCurve();
    }, 200);
  }

  /**
   * Update config value
   */
  updateConfig(key, value) {
    this.currentConfig[key] = value;
    this.updateRigUI();
    this.drawCurve();
    
    // Update the animation if one is selected
    if (this.selectedAnimation) {
      registry.updateAnimation(this.selectedAnimation, this.currentConfig);
    }
  }

  /**
   * Update rig UI to match current config
   */
  updateRigUI() {
    const { stiffness, damping, mass } = this.currentConfig;
    
    // Update inputs
    this.elements.stiffnessInput.value = stiffness;
    this.elements.dampingInput.value = damping;
    this.elements.massInput.value = mass;
    
    // Update duration
    const duration = calculateDurationMs(this.currentConfig);
    this.elements.durationValue.value = duration;
    
    // Update circle position
    const { x, y } = paramsToPosition(stiffness, damping);
    const vizRect = this.elements.visualization.getBoundingClientRect();
    this.elements.dragCircle.style.left = (x * 100) + '%';
    this.elements.dragCircle.style.top = (y * 100) + '%'; // Full height now
    
    // Update slider position - slider rides on center line
    const sliderX = (stiffness - 50) / 450;
    this.elements.sliderThumb.style.left = (sliderX * 100) + '%';
  }

  /**
   * Update spring config to match target duration
   */
  updateDurationFromMs(targetMs) {
    const targetSeconds = targetMs / 1000;
    const { stiffness, damping, mass } = this.currentConfig;
    
    // Estimate what stiffness/damping would give us this duration
    // We'll adjust damping primarily as it has the most effect on duration
    const omega = Math.sqrt(stiffness / mass);
    const currentDuration = estimateDuration(this.currentConfig);
    
    // Adjust damping to achieve target duration
    // Higher damping = shorter duration (for underdamped)
    // Lower damping = longer duration (more oscillation)
    
    let newDamping = damping;
    const ratio = targetSeconds / currentDuration;
    
    if (ratio < 1) {
      // Need shorter duration - increase damping
      newDamping = Math.min(50, damping * (1 + (1 - ratio) * 0.5));
    } else {
      // Need longer duration - decrease damping
      newDamping = Math.max(5, damping * (1 - (ratio - 1) * 0.3));
    }
    
    this.updateConfig('damping', Math.round(newDamping));
  }

  /**
   * Draw spring curve on canvas - centered with slider on center line
   */
  drawCurve() {
    const canvas = this.elements.canvas;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size - full height now (slider is on center line)
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    // Clear
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    // Draw grid lines
    ctx.strokeStyle = '#3d3d3d';
    ctx.lineWidth = 1;
    
    // Horizontal center line (rest position) - at exact center
    const centerY = rect.height / 2;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(rect.width, centerY);
    ctx.stroke();
    
    // Sample spring
    const samples = sampleSpring(this.currentConfig, 100);
    
    // Draw curve
    ctx.strokeStyle = '#f5f5f5';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    
    const padding = 20;
    const drawWidth = rect.width - padding * 2;
    const drawHeight = rect.height - padding * 2;
    
    samples.forEach((sample, i) => {
      const x = padding + (i / samples.length) * drawWidth;
      // Curve starts at 0 (bottom), goes to 1 (top), centered around centerY
      // Map sample.value (0-1) to vertical position centered around centerY
      const amplitude = drawHeight * 0.4; // Use 40% of height for amplitude
      const y = centerY - (sample.value - 0.5) * amplitude * 2;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
  }

  /**
   * Play animation preview
   */
  playPreview() {
    // Create a preview element
    let preview = document.querySelector('.sw-preview-element');
    if (!preview) {
      preview = document.createElement('div');
      preview.className = 'sw-preview-element';
      preview.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        width: 60px;
        height: 60px;
        background: #4a9eff;
        border-radius: 8px;
        transform: translate(-50%, -50%) scale(0);
        z-index: 100001;
        pointer-events: none;
      `;
      document.body.appendChild(preview);
    }
    
    // Animate with spring
    preview.style.transform = 'translate(-50%, -50%) scale(0)';
    
    requestAnimationFrame(() => {
      animateSpring(
        preview, 
        this.currentConfig, 
        'transform', 
        0, 
        1, 
        ''
      );
      
      // Override transform with scale animation
      const { stiffness, damping, mass } = this.currentConfig;
      preview.style.transition = 'none';
      
      let startTime = null;
      const duration = calculateDurationMs(this.currentConfig);
      
      const animate = (currentTime) => {
        if (!startTime) startTime = currentTime;
        const elapsed = currentTime - startTime;
        const progress = Math.min(1, elapsed / duration);
        
        // Simple spring approximation for preview
        const dampingRatio = damping / (2 * Math.sqrt(stiffness * mass));
        const omega = Math.sqrt(stiffness / mass);
        let value;
        
        if (dampingRatio < 1) {
          // Underdamped
          const dampedOmega = omega * Math.sqrt(1 - dampingRatio * dampingRatio);
          value = 1 - Math.exp(-dampingRatio * omega * (elapsed / 1000)) * 
                  Math.cos(dampedOmega * (elapsed / 1000));
        } else {
          // Critically or over-damped
          value = 1 - Math.exp(-omega * (elapsed / 1000));
        }
        
        preview.style.transform = `translate(-50%, -50%) scale(${value})`;
        
        if (elapsed < duration) {
          requestAnimationFrame(animate);
        } else {
          // Fade out
          setTimeout(() => {
            preview.style.transition = 'opacity 0.3s';
            preview.style.opacity = '0';
            setTimeout(() => {
              preview.style.opacity = '1';
              preview.style.transform = 'translate(-50%, -50%) scale(0)';
              preview.style.transition = 'none';
            }, 300);
          }, 200);
        }
      };
      
      requestAnimationFrame(animate);
    });
  }

  /**
   * Open save dialog
   */
  openSaveDialog() {
    this.elements.saveDialog.classList.add('open');
    this.elements.saveInput.value = '';
    this.elements.saveInput.focus();
  }

  /**
   * Close save dialog
   */
  closeSaveDialog() {
    this.elements.saveDialog.classList.remove('open');
  }

  /**
   * Save current config as preset
   */
  savePreset() {
    const name = this.elements.saveInput.value.trim();
    if (!name) {
      this.elements.saveInput.focus();
      return;
    }
    
    registry.saveAsPreset(name, this.currentConfig);
    this.closeSaveDialog();
    this.render();
  }

  /**
   * Render the list
   */
  render() {
    if (!this.elements.list) return;
    
    this.elements.list.innerHTML = '';
    
    // Presets section
    const presetsSection = document.createElement('div');
    presetsSection.className = 'sw-list-section';
    
    const presetsTitle = document.createElement('h4');
    presetsTitle.className = 'sw-list-section-title';
    presetsTitle.textContent = 'Presets';
    presetsSection.appendChild(presetsTitle);
    
    const allPresets = registry.getAllPresets();
    Object.entries(allPresets).forEach(([id, preset]) => {
      const item = this.createListItem(id, preset, 'preset');
      presetsSection.appendChild(item);
    });
    
    this.elements.list.appendChild(presetsSection);
    
    // Animations section
    const animations = registry.getAnimations();
    if (animations.length > 0) {
      const animSection = document.createElement('div');
      animSection.className = 'sw-list-section';
      
      const animTitle = document.createElement('h4');
      animTitle.className = 'sw-list-section-title';
      animTitle.textContent = 'Animations';
      animSection.appendChild(animTitle);
      
      animations.forEach(anim => {
        const item = this.createListItem(anim.id, anim, 'animation');
        animSection.appendChild(item);
      });
      
      this.elements.list.appendChild(animSection);
    }
  }

  /**
   * Animate list items with stagger using Motion
   * Fade-in overlaps with slide-up: fade starts first and ends at 80% of slide duration
   */
  animateListItems() {
    const listItems = this.elements.list.querySelectorAll('.sw-list-item');
    if (listItems.length === 0) return;
    
    // Set initial state
    listItems.forEach(item => {
      item.style.opacity = '0';
      item.style.transform = 'translateY(10px)';
    });
    
    const slideDuration = 0.3;
    const fadeDuration = slideDuration * 0.8; // Fade ends at 80% of slide
    
    // Animate opacity and y separately with different durations
    listItems.forEach((item, index) => {
      const delay = index * 0.05;
      
      // Fade in (starts immediately, ends at 80% of slide)
      animate(
        item,
        { opacity: [0, 1] },
        {
          duration: fadeDuration,
          delay: delay,
          easing: [0.4, 0, 0.2, 1]
        }
      );
      
      // Slide up (full duration, starts at same time)
      animate(
        item,
        { y: [10, 0] },
        {
          duration: slideDuration,
          delay: delay,
          easing: [0.4, 0, 0.2, 1]
        }
      );
    });
  }

  /**
   * Create a list item
   */
  createListItem(id, data, type) {
    const item = document.createElement('div');
    item.className = 'sw-list-item';
    item.style.cursor = 'pointer';
    if (this.selectedAnimation === id) {
      item.classList.add('selected');
    }
    
    const info = document.createElement('div');
    info.className = 'sw-list-item-info';
    info.style.cursor = 'pointer';
    info.style.flex = '1';
    
    const name = document.createElement('div');
    name.className = 'sw-list-item-name';
    name.textContent = data.name;
    
    const desc = document.createElement('div');
    desc.className = 'sw-list-item-desc';
    desc.textContent = `S: ${data.stiffness} D: ${data.damping}`;
    
    info.appendChild(name);
    info.appendChild(desc);
    
    const actions = document.createElement('div');
    actions.className = 'sw-list-item-actions';
    
    // Rename button
    const renameBtn = document.createElement('button');
    renameBtn.className = 'sw-list-item-btn';
    renameBtn.appendChild(icons.pencil({ size: 14 }));
    renameBtn.onclick = (e) => {
      e.stopPropagation();
      this.startRename(item, id, data, type);
    };
    actions.appendChild(renameBtn);
    
    // Delete button (only for custom presets)
    if (data.isCustom) {
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'sw-list-item-btn delete';
      deleteBtn.appendChild(icons.trash({ size: 14 }));
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        registry.deletePreset(id);
      };
      actions.appendChild(deleteBtn);
    }
    
    item.appendChild(info);
    item.appendChild(actions);
    
    // Make actions not block clicks on the item
    actions.style.pointerEvents = 'auto';
    
    // Click handler for the item
    const handleItemClick = (e) => {
      // Don't open if clicking on action buttons
      if (e.target.closest('.sw-list-item-btn')) {
        return;
      }
      
      // Stop propagation to prevent document click handler from closing the popover
      e.stopPropagation();
      
      this.selectedAnimation = type === 'animation' ? id : null;
      this.openRig({
        stiffness: data.stiffness,
        damping: data.damping,
        mass: data.mass || 1
      }, data.name);
      this.render();
    };
    
    item.addEventListener('click', handleItemClick);
    
    return item;
  }

  /**
   * Start renaming an item
   */
  startRename(item, id, data, type) {
    const info = item.querySelector('.sw-list-item-info');
    const currentName = data.name;
    
    info.innerHTML = '';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'sw-rename-input';
    input.value = currentName;
    
    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        const newName = input.value.trim();
        if (newName && newName !== currentName) {
          if (type === 'preset') {
            registry.renamePreset(id, newName);
          } else {
            registry.updateAnimation(id, { name: newName });
          }
        }
        this.render();
      } else if (e.key === 'Escape') {
        this.render();
      }
    };
    
    input.onblur = () => {
      const newName = input.value.trim();
      if (newName && newName !== currentName) {
        if (type === 'preset') {
          registry.renamePreset(id, newName);
        } else {
          registry.updateAnimation(id, { name: newName });
        }
      }
      this.render();
    };
    
    info.appendChild(input);
    input.focus();
    input.select();
  }

  /**
   * Destroy the workbench
   */
  destroy() {
    this.elements.trigger.removeEventListener('click', this.handleTriggerClick);
    document.removeEventListener('click', this.handleDocumentClick);
    document.removeEventListener('pointermove', this.handlePointerMove);
    document.removeEventListener('pointerup', this.handlePointerUp);
    
    this.elements.container.remove();
    
    const styles = document.getElementById('spring-workbench-styles');
    if (styles) styles.remove();
  }
}

