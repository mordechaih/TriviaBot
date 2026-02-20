/**
 * Spring Workbench v1.0.0
 * Interactive spring animation configuration tool
 * 
 * Bundled dependencies:
 * - Motion.dev (spring physics)
 * - Lucide (icons)
 * 
 * Usage: SpringWorkbench.init({ animations: [...] })
 */
var SpringWorkbench=(()=>{var hr=Object.defineProperty;var os=Object.getOwnPropertyDescriptor;var as=Object.getOwnPropertyNames;var ss=Object.prototype.hasOwnProperty;var is=(t,e)=>{for(var r in e)hr(t,r,{get:e[r],enumerable:!0})},ns=(t,e,r,o)=>{if(e&&typeof e=="object"||typeof e=="function")for(let a of as(e))!ss.call(t,a)&&a!==r&&hr(t,a,{get:()=>e[a],enumerable:!(o=os(e,a))||o.enumerable});return t};var ls=t=>ns(hr({},"__esModule",{value:!0}),t);var Vi={};is(Vi,{DEFAULT_PRESETS:()=>nt,Icons:()=>Qr,STYLES:()=>yr,SpringRegistry:()=>He,Workbench:()=>at,animate:()=>ts,animateSpring:()=>ot,calculateDurationMs:()=>rt,createIcon:()=>I,default:()=>Di,destroy:()=>Za,estimateDuration:()=>pe,generateKeyframes:()=>$a,getAnimation:()=>Qa,getInstance:()=>Ya,getPreset:()=>es,icons:()=>K,init:()=>_a,injectStyles:()=>wt,paramsToPosition:()=>cr,positionToParams:()=>mr,registerAnimation:()=>Ja,registry:()=>F,sampleSpring:()=>tt});var nt={snappy:{name:"Snappy",stiffness:400,damping:30,mass:1,description:"Quick UI feedback"},bouncy:{name:"Bouncy",stiffness:200,damping:10,mass:1,description:"Playful interactions"},smooth:{name:"Smooth",stiffness:100,damping:20,mass:1,description:"Gentle transitions"},stiff:{name:"Stiff",stiffness:500,damping:35,mass:1,description:"Instant response"},slow:{name:"Slow",stiffness:80,damping:25,mass:1,description:"Deliberate motion"}},Yr="spring-workbench-presets",Zr="spring-workbench-animations",He=class{constructor(){this.presets={...nt},this.customPresets={},this.animations=new Map,this.listeners=new Set,this.loadFromStorage()}loadFromStorage(){try{let e=localStorage.getItem(Yr);e&&(this.customPresets=JSON.parse(e));let r=localStorage.getItem(Zr);if(r){let o=JSON.parse(r);Object.entries(o).forEach(([a,s])=>{this.animations.set(a,s)})}}catch(e){console.warn("Failed to load spring presets from storage:",e)}}saveToStorage(){try{localStorage.setItem(Yr,JSON.stringify(this.customPresets));let e={};this.animations.forEach((r,o)=>{e[o]=r}),localStorage.setItem(Zr,JSON.stringify(e))}catch(e){console.warn("Failed to save spring presets to storage:",e)}}getAllPresets(){return{...this.presets,...this.customPresets}}getPreset(e){return this.presets[e]||this.customPresets[e]||null}saveAsPreset(e,r){let o=this.generatePresetId(e);return this.customPresets[o]={name:e,stiffness:r.stiffness,damping:r.damping,mass:r.mass,description:"Custom preset",isCustom:!0},this.saveToStorage(),this.notifyListeners(),o}renamePreset(e,r){if(this.presets[e]){let o={...this.presets[e],name:r,isCustom:!0},a=this.generatePresetId(r);return this.customPresets[a]=o,this.saveToStorage(),this.notifyListeners(),a}return this.customPresets[e]?(this.customPresets[e].name=r,this.saveToStorage(),this.notifyListeners(),e):null}deletePreset(e){return this.customPresets[e]?(delete this.customPresets[e],this.saveToStorage(),this.notifyListeners(),!0):!1}generatePresetId(e){let r=e.toLowerCase().replace(/[^a-z0-9]/g,"-"),o=r,a=1;for(;this.presets[o]||this.customPresets[o];)o=`${r}-${a}`,a++;return o}registerAnimation(e,r){this.animations.set(e,{id:e,name:r.name||e,stiffness:r.stiffness||170,damping:r.damping||26,mass:r.mass||1,element:r.element||null,property:r.property||"transform",...r}),this.saveToStorage(),this.notifyListeners()}updateAnimation(e,r){let o=this.animations.get(e);o&&(this.animations.set(e,{...o,...r}),this.saveToStorage(),this.notifyListeners())}getAnimations(){return Array.from(this.animations.values())}getAnimation(e){return this.animations.get(e)}subscribe(e){return this.listeners.add(e),()=>this.listeners.delete(e)}notifyListeners(){this.listeners.forEach(e=>e())}exportConfig(){return JSON.stringify({presets:this.customPresets,animations:Object.fromEntries(this.animations)},null,2)}importConfig(e){try{let r=JSON.parse(e);return r.presets&&(this.customPresets={...this.customPresets,...r.presets}),r.animations&&Object.entries(r.animations).forEach(([o,a])=>{this.animations.set(o,a)}),this.saveToStorage(),this.notifyListeners(),!0}catch(r){return console.error("Failed to import config:",r),!1}}},F=new He;var Jr=(t,e,r=[])=>{let o=document.createElementNS("http://www.w3.org/2000/svg",t);return Object.keys(e).forEach(a=>{o.setAttribute(a,String(e[a]))}),r.length&&r.forEach(a=>{let s=Jr(...a);o.appendChild(s)}),o},gr=([t,e,r])=>Jr(t,e,r);var V={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":2,"stroke-linecap":"round","stroke-linejoin":"round"};var lt=["svg",V,[["path",{d:"m6 9 6 6 6-6"}]]];var ft=["svg",V,[["path",{d:"m9 18 6-6-6-6"}]]];var ut=["svg",V,[["circle",{cx:"12",cy:"12",r:"10"}],["polyline",{points:"12 6 12 12 16 14"}]]];var pt=["svg",V,[["rect",{x:"14",y:"4",width:"4",height:"16",rx:"1"}],["rect",{x:"6",y:"4",width:"4",height:"16",rx:"1"}]]];var dt=["svg",V,[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"}],["path",{d:"m15 5 4 4"}]]];var mt=["svg",V,[["polygon",{points:"6 3 20 12 6 21 6 3"}]]];var ct=["svg",V,[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"}],["path",{d:"M3 3v5h5"}]]];var xt=["svg",V,[["path",{d:"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"}],["path",{d:"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"}],["path",{d:"M7 3v4a1 1 0 0 0 1 1h7"}]]];var ht=["svg",V,[["path",{d:"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"}],["circle",{cx:"12",cy:"12",r:"3"}]]];var gt=["svg",V,[["path",{d:"M3 6h18"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17"}]]];var yt=["svg",V,[["path",{d:"M18 6 6 18"}],["path",{d:"m6 6 12 12"}]]];function I(t,e={}){let{size:r=18,color:o="currentColor",strokeWidth:a=2}=e,s=gr(t);s.setAttribute("width",r),s.setAttribute("height",r),s.setAttribute("stroke",o),s.setAttribute("stroke-width",a);let i=document.createElement("span");return i.appendChild(s),i.className="sw-icon",i.style.display="inline-flex",i.style.alignItems="center",i.style.justifyContent="center",i}var Qr={Settings:ht,Clock:ut,X:yt,Play:mt,Pause:pt,Save:xt,Pencil:dt,Trash2:gt,ChevronDown:lt,ChevronRight:ft,RotateCcw:ct},K={settings:t=>I(ht,t),clock:t=>I(ut,t),close:t=>I(yt,t),play:t=>I(mt,t),pause:t=>I(pt,t),save:t=>I(xt,t),pencil:t=>I(dt,t),trash:t=>I(gt,t),chevronDown:t=>I(lt,t),chevronRight:t=>I(ft,t),reset:t=>I(ct,t)};var yr=`
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
`;function wt(){if(document.getElementById("spring-workbench-styles"))return;let t=document.createElement("style");t.id="spring-workbench-styles",t.textContent=yr,document.head.appendChild(t)}var L=t=>t;var re=L,W=L;var oe=(t,e,r)=>{let o=e-t;return o===0?1:(r-t)/o};function ge(t){let e;return()=>(e===void 0&&(e=t()),e)}var eo=ge(()=>window.ScrollTimeline!==void 0);var vt=class{constructor(e){this.stop=()=>this.runAll("stop"),this.animations=e.filter(Boolean)}get finished(){return Promise.all(this.animations.map(e=>"finished"in e?e.finished:e))}getAll(e){return this.animations[0][e]}setAll(e,r){for(let o=0;o<this.animations.length;o++)this.animations[o][e]=r}attachTimeline(e,r){let o=this.animations.map(a=>{if(eo()&&a.attachTimeline)return a.attachTimeline(e);if(typeof r=="function")return r(a)});return()=>{o.forEach((a,s)=>{a&&a(),this.animations[s].stop()})}}get time(){return this.getAll("time")}set time(e){this.setAll("time",e)}get speed(){return this.getAll("speed")}set speed(e){this.setAll("speed",e)}get startTime(){return this.getAll("startTime")}get duration(){let e=0;for(let r=0;r<this.animations.length;r++)e=Math.max(e,this.animations[r].duration);return e}runAll(e){this.animations.forEach(r=>r[e]())}flatten(){this.runAll("flatten")}play(){this.runAll("play")}pause(){this.runAll("pause")}cancel(){this.runAll("cancel")}complete(){this.runAll("complete")}};var ye=class extends vt{then(e,r){return Promise.all(this.animations).then(e).catch(r)}};var B=t=>t*1e3,O=t=>t/1e3;function we(t){let e=0,r=50,o=t.next(e);for(;!o.done&&e<2e4;)e+=r,o=t.next(e);return e>=2e4?1/0:e}var Ct=(t,e,r=10)=>{let o="",a=Math.max(Math.round(e/r),2);for(let s=0;s<a;s++)o+=t(oe(0,a-1,s))+", ";return`linear(${o.substring(0,o.length-2)})`};var N=(t,e,r)=>r>e?e:r<t?t:r;function bt(t,e){return e?t*(1e3/e):0}var fs=5;function St(t,e,r){let o=Math.max(e-fs,0);return bt(r-t(o),e-o)}var M={stiffness:100,damping:10,mass:1,velocity:0,duration:800,bounce:.3,visualDuration:.3,restSpeed:{granular:.01,default:2},restDelta:{granular:.005,default:.5},minDuration:.01,maxDuration:10,minDamping:.05,maxDamping:1};var wr=.001;function to({duration:t=M.duration,bounce:e=M.bounce,velocity:r=M.velocity,mass:o=M.mass}){let a,s;re(t<=B(M.maxDuration),"Spring duration must be 10 seconds or less");let i=1-e;i=N(M.minDamping,M.maxDamping,i),t=N(M.minDuration,M.maxDuration,O(t)),i<1?(a=f=>{let u=f*i,p=u*t,d=u-r,m=Tt(f,i),x=Math.exp(-p);return wr-d/m*x},s=f=>{let p=f*i*t,d=p*r+r,m=Math.pow(i,2)*Math.pow(f,2)*t,x=Math.exp(-p),c=Tt(Math.pow(f,2),i);return(-a(f)+wr>0?-1:1)*((d-m)*x)/c}):(a=f=>{let u=Math.exp(-f*t),p=(f-r)*t+1;return-wr+u*p},s=f=>{let u=Math.exp(-f*t),p=(r-f)*(t*t);return u*p});let n=5/t,l=ps(a,s,n);if(t=B(t),isNaN(l))return{stiffness:M.stiffness,damping:M.damping,duration:t};{let f=Math.pow(l,2)*o;return{stiffness:f,damping:i*2*Math.sqrt(o*f),duration:t}}}var us=12;function ps(t,e,r){let o=r;for(let a=1;a<us;a++)o=o-t(o)/e(o);return o}function Tt(t,e){return t*Math.sqrt(1-e*e)}var ds=["duration","bounce"],ms=["stiffness","damping","mass"];function ro(t,e){return e.some(r=>t[r]!==void 0)}function cs(t){let e={velocity:M.velocity,stiffness:M.stiffness,damping:M.damping,mass:M.mass,isResolvedFromDuration:!1,...t};if(!ro(t,ms)&&ro(t,ds))if(t.visualDuration){let r=t.visualDuration,o=2*Math.PI/(r*1.2),a=o*o,s=2*N(.05,1,1-(t.bounce||0))*Math.sqrt(a);e={...e,mass:M.mass,stiffness:a,damping:s}}else{let r=to(t);e={...e,...r,mass:M.mass},e.isResolvedFromDuration=!0}return e}function ve(t=M.visualDuration,e=M.bounce){let r=typeof t!="object"?{visualDuration:t,keyframes:[0,1],bounce:e}:t,{restSpeed:o,restDelta:a}=r,s=r.keyframes[0],i=r.keyframes[r.keyframes.length-1],n={done:!1,value:s},{stiffness:l,damping:f,mass:u,duration:p,velocity:d,isResolvedFromDuration:m}=cs({...r,velocity:-O(r.velocity||0)}),x=d||0,c=f/(2*Math.sqrt(l*u)),C=i-s,h=O(Math.sqrt(l/u)),w=Math.abs(C)<5;o||(o=w?M.restSpeed.granular:M.restSpeed.default),a||(a=w?M.restDelta.granular:M.restDelta.default);let b;if(c<1){let y=Tt(h,c);b=A=>{let D=Math.exp(-c*h*A);return i-D*((x+c*h*C)/y*Math.sin(y*A)+C*Math.cos(y*A))}}else if(c===1)b=y=>i-Math.exp(-h*y)*(C+(x+h*C)*y);else{let y=h*Math.sqrt(c*c-1);b=A=>{let D=Math.exp(-c*h*A),v=Math.min(y*A,300);return i-D*((x+c*h*C)*Math.sinh(v)+y*C*Math.cosh(v))/y}}let S={calculatedDuration:m&&p||null,next:y=>{let A=b(y);if(m)n.done=y>=p;else{let D=0;c<1&&(D=y===0?B(x):St(b,y,A));let v=Math.abs(D)<=o,T=Math.abs(i-A)<=a;n.done=v&&T}return n.value=n.done?i:A,n},toString:()=>{let y=Math.min(we(S),2e4),A=Ct(D=>S.next(y*D).value,y,30);return y+"ms "+A}};return S}function oo(t,e=100,r){let o=r({...t,keyframes:[0,e]}),a=Math.min(we(o),2e4);return{type:"keyframes",ease:s=>o.next(a*s).value/e,duration:O(a)}}function ae(t){return typeof t=="function"}var ao=(t,e,r)=>{let o=e-t;return((r-t)%o+o)%o+t};var At=t=>Array.isArray(t)&&typeof t[0]!="number";function Mt(t,e){return At(t)?t[ao(0,t.length,e)]:t}var X=(t,e,r)=>t+(e-t)*r;function Pt(t,e){let r=t[t.length-1];for(let o=1;o<=e;o++){let a=oe(0,e,o);t.push(X(r,1,a))}}function kt(t){let e=[0];return Pt(e,t.length-1),e}var k=t=>!!(t&&t.getVelocity);function so(t,e,r){var o;if(t instanceof Element)return[t];if(typeof t=="string"){let a=document;e&&(a=e.current);let s=(o=r?.[t])!==null&&o!==void 0?o:a.querySelectorAll(t);return s?Array.from(s):[]}return Array.from(t)}function Ge(t){return typeof t=="object"&&!Array.isArray(t)}function Dt(t,e,r,o){return typeof t=="string"&&Ge(e)?so(t,r,o):t instanceof NodeList?Array.from(t):Array.isArray(t)?t:[t]}function io(t,e,r){return t*(e+1)}function Cr(t,e,r,o){var a;return typeof e=="number"?e:e.startsWith("-")||e.startsWith("+")?Math.max(0,t+parseFloat(e)):e==="<"?r:(a=o.get(e))!==null&&a!==void 0?a:t}function no(t,e){t.indexOf(e)===-1&&t.push(e)}function Vt(t,e){let r=t.indexOf(e);r>-1&&t.splice(r,1)}function xs(t,e,r){for(let o=0;o<t.length;o++){let a=t[o];a.at>e&&a.at<r&&(Vt(t,a),o--)}}function lo(t,e,r,o,a,s){xs(t,a,s);for(let i=0;i<e.length;i++)t.push({value:e[i],at:X(a,s,o[i]),easing:Mt(r,i)})}function fo(t,e){for(let r=0;r<t.length;r++)t[r]=t[r]/(e+1)}function uo(t,e){return t.at===e.at?t.value===null?1:e.value===null?-1:0:t.at-e.at}var hs="easeInOut",gs=20;function co(t,{defaultTransition:e={},...r}={},o,a){let s=e.duration||.3,i=new Map,n=new Map,l={},f=new Map,u=0,p=0,d=0;for(let m=0;m<t.length;m++){let x=t[m];if(typeof x=="string"){f.set(x,p);continue}else if(!Array.isArray(x)){f.set(x.name,Cr(p,x.at,u,f));continue}let[c,C,h={}]=x;h.at!==void 0&&(p=Cr(p,h.at,u,f));let w=0,b=(S,y,A,D=0,v=0)=>{let T=ys(S),{delay:P=0,times:q=kt(T),type:Ie="keyframes",repeat:de,repeatType:xr,repeatDelay:Fi=0,...rs}=y,{ease:te=e.ease||"easeOut",duration:G}=y,Kr=typeof P=="function"?P(D,v):P,Wr=T.length,Xr=ae(Ie)?Ie:a?.[Ie];if(Wr<=2&&Xr){let Ne=100;if(Wr===2&&Cs(T)){let Ue=T[1]-T[0];Ne=Math.abs(Ue)}let st={...rs};G!==void 0&&(st.duration=B(G));let it=oo(st,Ne,Xr);te=it.ease,G=it.duration}G??(G=s);let jr=p+Kr;q.length===1&&q[0]===0&&(q[1]=1);let $r=q.length-T.length;if($r>0&&Pt(q,$r),T.length===1&&T.unshift(null),de){W(de<gs,"Repeat count too high, must be less than 20"),G=io(G,de);let Ne=[...T],st=[...q];te=Array.isArray(te)?[...te]:[te];let it=[...te];for(let Ue=0;Ue<de;Ue++){T.push(...Ne);for(let ze=0;ze<Ne.length;ze++)q.push(st[ze]+(Ue+1)),te.push(ze===0?"linear":Mt(it,ze-1))}fo(q,de)}let _r=jr+G;lo(A,T,te,q,jr,_r),w=Math.max(Kr+G,w),d=Math.max(_r,d)};if(k(c)){let S=po(c,n);b(C,h,mo("default",S))}else{let S=Dt(c,C,o,l),y=S.length;for(let A=0;A<y;A++){C=C,h=h;let D=S[A],v=po(D,n);for(let T in C)b(C[T],ws(h,T),mo(T,v),A,y)}}u=p,p+=w}return n.forEach((m,x)=>{for(let c in m){let C=m[c];C.sort(uo);let h=[],w=[],b=[];for(let y=0;y<C.length;y++){let{at:A,value:D,easing:v}=C[y];h.push(D),w.push(oe(0,d,A)),b.push(v||"easeOut")}w[0]!==0&&(w.unshift(0),h.unshift(h[0]),b.unshift(hs)),w[w.length-1]!==1&&(w.push(1),h.push(null)),i.has(x)||i.set(x,{keyframes:{},transition:{}});let S=i.get(x);S.keyframes[c]=h,S.transition[c]={...e,duration:d,ease:b,times:w,...r}}}),i}function po(t,e){return!e.has(t)&&e.set(t,{}),e.get(t)}function mo(t,e){return e[t]||(e[t]=[]),e[t]}function ys(t){return Array.isArray(t)?t:[t]}function ws(t,e){return t&&t[e]?{...t,...t[e]}:{...t}}var vs=t=>typeof t=="number",Cs=t=>t.every(vs);var Z=new WeakMap;function Ft(t,e){return t?t[e]||t.default||t:void 0}var j=["transformPerspective","x","y","z","translateX","translateY","translateZ","scale","scaleX","scaleY","rotate","rotateX","rotateY","rotateZ","skew","skewX","skewY"],U=new Set(j);var Rt=new Set(["width","height","top","left","right","bottom",...j]);var xo=t=>Array.isArray(t);var ho=t=>xo(t)?t[t.length-1]||0:t;var Ce={skipAnimations:!1,useManualTiming:!1};function go(t){let e=new Set,r=new Set,o=!1,a=!1,s=new WeakSet,i={delta:0,timestamp:0,isProcessing:!1};function n(f){s.has(f)&&(l.schedule(f),t()),f(i)}let l={schedule:(f,u=!1,p=!1)=>{let m=p&&o?e:r;return u&&s.add(f),m.has(f)||m.add(f),f},cancel:f=>{r.delete(f),s.delete(f)},process:f=>{if(i=f,o){a=!0;return}o=!0,[e,r]=[r,e],e.forEach(n),e.clear(),o=!1,a&&(a=!1,l.process(f))}};return l}var Bt=["read","resolveKeyframes","update","preRender","render","postRender"],bs=40;function yo(t,e){let r=!1,o=!0,a={delta:0,timestamp:0,isProcessing:!1},s=()=>r=!0,i=Bt.reduce((h,w)=>(h[w]=go(s),h),{}),{read:n,resolveKeyframes:l,update:f,preRender:u,render:p,postRender:d}=i,m=()=>{let h=Ce.useManualTiming?a.timestamp:performance.now();r=!1,a.delta=o?1e3/60:Math.max(Math.min(h-a.timestamp,bs),1),a.timestamp=h,a.isProcessing=!0,n.process(a),l.process(a),f.process(a),u.process(a),p.process(a),d.process(a),a.isProcessing=!1,r&&e&&(o=!1,t(m))},x=()=>{r=!0,o=!0,a.isProcessing||t(m)};return{schedule:Bt.reduce((h,w)=>{let b=i[w];return h[w]=(S,y=!1,A=!1)=>(r||x(),b.schedule(S,y,A)),h},{}),cancel:h=>{for(let w=0;w<Bt.length;w++)i[Bt[w]].cancel(h)},state:a,steps:i}}var{schedule:E,cancel:Ke,state:be,steps:lf}=yo(typeof requestAnimationFrame<"u"?requestAnimationFrame:L,!0);var Et;function Ss(){Et=void 0}var z={now:()=>(Et===void 0&&z.set(be.isProcessing||Ce.useManualTiming?be.timestamp:performance.now()),Et),set:t=>{Et=t,queueMicrotask(Ss)}};var Se=class{constructor(){this.subscriptions=[]}add(e){return no(this.subscriptions,e),()=>Vt(this.subscriptions,e)}notify(e,r,o){let a=this.subscriptions.length;if(a)if(a===1)this.subscriptions[0](e,r,o);else for(let s=0;s<a;s++){let i=this.subscriptions[s];i&&i(e,r,o)}}getSize(){return this.subscriptions.length}clear(){this.subscriptions.length=0}};var wo=30,Ts=t=>!isNaN(parseFloat(t)),vo={current:void 0},br=class{constructor(e,r={}){this.version="11.18.2",this.canTrackVelocity=null,this.events={},this.updateAndNotify=(o,a=!0)=>{let s=z.now();this.updatedAt!==s&&this.setPrevFrameValue(),this.prev=this.current,this.setCurrent(o),this.current!==this.prev&&this.events.change&&this.events.change.notify(this.current),a&&this.events.renderRequest&&this.events.renderRequest.notify(this.current)},this.hasAnimated=!1,this.setCurrent(e),this.owner=r.owner}setCurrent(e){this.current=e,this.updatedAt=z.now(),this.canTrackVelocity===null&&e!==void 0&&(this.canTrackVelocity=Ts(this.current))}setPrevFrameValue(e=this.current){this.prevFrameValue=e,this.prevUpdatedAt=this.updatedAt}onChange(e){return this.on("change",e)}on(e,r){this.events[e]||(this.events[e]=new Se);let o=this.events[e].add(r);return e==="change"?()=>{o(),E.read(()=>{this.events.change.getSize()||this.stop()})}:o}clearListeners(){for(let e in this.events)this.events[e].clear()}attach(e,r){this.passiveEffect=e,this.stopPassiveEffect=r}set(e,r=!0){!r||!this.passiveEffect?this.updateAndNotify(e,r):this.passiveEffect(e,this.updateAndNotify)}setWithVelocity(e,r,o){this.set(r),this.prev=void 0,this.prevFrameValue=e,this.prevUpdatedAt=this.updatedAt-o}jump(e,r=!0){this.updateAndNotify(e),this.prev=e,this.prevUpdatedAt=this.prevFrameValue=void 0,r&&this.stop(),this.stopPassiveEffect&&this.stopPassiveEffect()}get(){return vo.current&&vo.current.push(this),this.current}getPrevious(){return this.prev}getVelocity(){let e=z.now();if(!this.canTrackVelocity||this.prevFrameValue===void 0||e-this.updatedAt>wo)return 0;let r=Math.min(this.updatedAt-this.prevUpdatedAt,wo);return bt(parseFloat(this.current)-parseFloat(this.prevFrameValue),r)}start(e){return this.stop(),new Promise(r=>{this.hasAnimated=!0,this.animation=e(r),this.events.animationStart&&this.events.animationStart.notify()}).then(()=>{this.events.animationComplete&&this.events.animationComplete.notify(),this.clearAnimation()})}stop(){this.animation&&(this.animation.stop(),this.events.animationCancel&&this.events.animationCancel.notify()),this.clearAnimation()}isAnimating(){return!!this.animation}clearAnimation(){delete this.animation}destroy(){this.clearListeners(),this.stop(),this.stopPassiveEffect&&this.stopPassiveEffect()}};function J(t,e){return new br(t,e)}function Co(t){let e=[{},{}];return t?.values.forEach((r,o)=>{e[0][o]=r.get(),e[1][o]=r.getVelocity()}),e}function Lt(t,e,r,o){if(typeof e=="function"){let[a,s]=Co(o);e=e(r!==void 0?r:t.custom,a,s)}if(typeof e=="string"&&(e=t.variants&&t.variants[e]),typeof e=="function"){let[a,s]=Co(o);e=e(r!==void 0?r:t.custom,a,s)}return e}function bo(t,e,r){let o=t.getProps();return Lt(o,e,r!==void 0?r:o.custom,t)}function As(t,e,r){t.hasValue(e)?t.getValue(e).set(r):t.addValue(e,J(r))}function So(t,e){let r=bo(t,e),{transitionEnd:o={},transition:a={},...s}=r||{};s={...s,...o};for(let i in s){let n=ho(s[i]);As(t,i,n)}}function To(t){return!!(k(t)&&t.add)}function Ao(t,e){let r=t.getValue("willChange");if(To(r))return r.add(e)}var Te=t=>t.replace(/([a-z])([A-Z])/gu,"$1-$2").toLowerCase();var Ms="framerAppearId",Mo="data-"+Te(Ms);function Po(t){return t.props[Mo]}var Ot={current:!1};function Sr(t,e){t.timeline=e,t.onfinish=null}var We=t=>Array.isArray(t)&&typeof t[0]=="number";var ko={linearEasing:void 0};function Do(t,e){let r=ge(t);return()=>{var o;return(o=ko[e])!==null&&o!==void 0?o:r()}}var Ae=Do(()=>{try{document.createElement("div").animate({opacity:0},{easing:"linear(0, 1)"})}catch{return!1}return!0},"linearEasing");function Ar(t){return!!(typeof t=="function"&&Ae()||!t||typeof t=="string"&&(t in Tr||Ae())||We(t)||Array.isArray(t)&&t.every(Ar))}var Xe=([t,e,r,o])=>`cubic-bezier(${t}, ${e}, ${r}, ${o})`,Tr={linear:"linear",ease:"ease",easeIn:"ease-in",easeOut:"ease-out",easeInOut:"ease-in-out",circIn:Xe([0,.65,.55,1]),circOut:Xe([.55,0,1,.45]),backIn:Xe([.31,.01,.66,-.59]),backOut:Xe([.33,1.53,.69,.99])};function Mr(t,e){if(t)return typeof t=="function"&&Ae()?Ct(t,e):We(t)?Xe(t):Array.isArray(t)?t.map(r=>Mr(r,e)||Tr.easeOut):Tr[t]}var Vo=(t,e,r)=>(((1-3*r+3*e)*t+(3*r-6*e))*t+3*e)*t,Ps=1e-7,ks=12;function Ds(t,e,r,o,a){let s,i,n=0;do i=e+(r-e)/2,s=Vo(i,o,a)-t,s>0?r=i:e=i;while(Math.abs(s)>Ps&&++n<ks);return i}function se(t,e,r,o){if(t===e&&r===o)return L;let a=s=>Ds(s,0,1,t,r);return s=>s===0||s===1?s:Vo(a(s),e,o)}var qt=t=>e=>e<=.5?t(2*e)/2:(2-t(2*(1-e)))/2;var It=t=>e=>1-t(1-e);var Pr=se(.33,1.53,.69,.99),je=It(Pr),Nt=qt(je);var Ut=t=>(t*=2)<1?.5*je(t):.5*(2-Math.pow(2,-10*(t-1)));var zt=t=>1-Math.sin(Math.acos(t)),Fo=It(zt),Ht=qt(zt);var Gt=t=>/^0[^.\s]+$/u.test(t);function Ro(t){return typeof t=="number"?t===0:t!==null?t==="none"||t==="0"||Gt(t):!0}var $={test:t=>typeof t=="number",parse:parseFloat,transform:t=>t},Q={...$,transform:t=>N(0,1,t)},$e={...$,default:1};var ie=t=>Math.round(t*1e5)/1e5;var Me=/-?(?:\d+(?:\.\d+)?|\.\d+)/gu;function Bo(t){return t==null}var Eo=/^(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))$/iu;var Pe=(t,e)=>r=>!!(typeof r=="string"&&Eo.test(r)&&r.startsWith(t)||e&&!Bo(r)&&Object.prototype.hasOwnProperty.call(r,e)),Kt=(t,e,r)=>o=>{if(typeof o!="string")return o;let[a,s,i,n]=o.match(Me);return{[t]:parseFloat(a),[e]:parseFloat(s),[r]:parseFloat(i),alpha:n!==void 0?parseFloat(n):1}};var Vs=t=>N(0,255,t),kr={...$,transform:t=>Math.round(Vs(t))},_={test:Pe("rgb","red"),parse:Kt("red","green","blue"),transform:({red:t,green:e,blue:r,alpha:o=1})=>"rgba("+kr.transform(t)+", "+kr.transform(e)+", "+kr.transform(r)+", "+ie(Q.transform(o))+")"};function Fs(t){let e="",r="",o="",a="";return t.length>5?(e=t.substring(1,3),r=t.substring(3,5),o=t.substring(5,7),a=t.substring(7,9)):(e=t.substring(1,2),r=t.substring(2,3),o=t.substring(3,4),a=t.substring(4,5),e+=e,r+=r,o+=o,a+=a),{red:parseInt(e,16),green:parseInt(r,16),blue:parseInt(o,16),alpha:a?parseInt(a,16)/255:1}}var _e={test:Pe("#"),parse:Fs,transform:_.transform};var Ye=t=>({test:e=>typeof e=="string"&&e.endsWith(t)&&e.split(" ").length===1,parse:parseFloat,transform:e=>`${e}${t}`}),Y=Ye("deg"),ne=Ye("%"),g=Ye("px"),Lo=Ye("vh"),Oo=Ye("vw"),Dr={...ne,parse:t=>ne.parse(t)/100,transform:t=>ne.transform(t*100)};var le={test:Pe("hsl","hue"),parse:Kt("hue","saturation","lightness"),transform:({hue:t,saturation:e,lightness:r,alpha:o=1})=>"hsla("+Math.round(t)+", "+ne.transform(ie(e))+", "+ne.transform(ie(r))+", "+ie(Q.transform(o))+")"};var R={test:t=>_.test(t)||_e.test(t)||le.test(t),parse:t=>_.test(t)?_.parse(t):le.test(t)?le.parse(t):_e.parse(t),transform:t=>typeof t=="string"?t:t.hasOwnProperty("red")?_.transform(t):le.transform(t)};var qo=/(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))/giu;function Rs(t){var e,r;return isNaN(t)&&typeof t=="string"&&(((e=t.match(Me))===null||e===void 0?void 0:e.length)||0)+(((r=t.match(qo))===null||r===void 0?void 0:r.length)||0)>0}var No="number",Uo="color",Bs="var",Es="var(",Io="${}",Ls=/var\s*\(\s*--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)|#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\)|-?(?:\d+(?:\.\d+)?|\.\d+)/giu;function me(t){let e=t.toString(),r=[],o={color:[],number:[],var:[]},a=[],s=0,n=e.replace(Ls,l=>(R.test(l)?(o.color.push(s),a.push(Uo),r.push(R.parse(l))):l.startsWith(Es)?(o.var.push(s),a.push(Bs),r.push(l)):(o.number.push(s),a.push(No),r.push(parseFloat(l))),++s,Io)).split(Io);return{values:r,split:n,indexes:o,types:a}}function zo(t){return me(t).values}function Ho(t){let{split:e,types:r}=me(t),o=e.length;return a=>{let s="";for(let i=0;i<o;i++)if(s+=e[i],a[i]!==void 0){let n=r[i];n===No?s+=ie(a[i]):n===Uo?s+=R.transform(a[i]):s+=a[i]}return s}}var Os=t=>typeof t=="number"?0:t;function qs(t){let e=zo(t);return Ho(t)(e.map(Os))}var H={test:Rs,parse:zo,createTransformer:Ho,getAnimatableNone:qs};var Is=new Set(["brightness","contrast","saturate","opacity"]);function Ns(t){let[e,r]=t.slice(0,-1).split("(");if(e==="drop-shadow")return t;let[o]=r.match(Me)||[];if(!o)return t;let a=r.replace(o,""),s=Is.has(e)?1:0;return o!==r&&(s*=100),e+"("+s+a+")"}var Us=/\b([a-z-]*)\(.*?\)/gu,Ze={...H,getAnimatableNone:t=>{let e=t.match(Us);return e?e.map(Ns).join(" "):t}};var Go={borderWidth:g,borderTopWidth:g,borderRightWidth:g,borderBottomWidth:g,borderLeftWidth:g,borderRadius:g,radius:g,borderTopLeftRadius:g,borderTopRightRadius:g,borderBottomRightRadius:g,borderBottomLeftRadius:g,width:g,maxWidth:g,height:g,maxHeight:g,top:g,right:g,bottom:g,left:g,padding:g,paddingTop:g,paddingRight:g,paddingBottom:g,paddingLeft:g,margin:g,marginTop:g,marginRight:g,marginBottom:g,marginLeft:g,backgroundPositionX:g,backgroundPositionY:g};var Ko={rotate:Y,rotateX:Y,rotateY:Y,rotateZ:Y,scale:$e,scaleX:$e,scaleY:$e,scaleZ:$e,skew:Y,skewX:Y,skewY:Y,distance:g,translateX:g,translateY:g,translateZ:g,x:g,y:g,z:g,perspective:g,transformPerspective:g,opacity:Q,originX:Dr,originY:Dr,originZ:g};var Vr={...$,transform:Math.round};var ke={...Go,...Ko,zIndex:Vr,size:g,fillOpacity:Q,strokeOpacity:Q,numOctaves:Vr};var zs={...ke,color:R,backgroundColor:R,outlineColor:R,fill:R,stroke:R,borderColor:R,borderTopColor:R,borderRightColor:R,borderBottomColor:R,borderLeftColor:R,filter:Ze,WebkitFilter:Ze},De=t=>zs[t];function Wt(t,e){let r=De(t);return r!==Ze&&(r=H),r.getAnimatableNone?r.getAnimatableNone(e):void 0}var Hs=new Set(["auto","none","0"]);function Wo(t,e,r){let o=0,a;for(;o<t.length&&!a;){let s=t[o];typeof s=="string"&&!Hs.has(s)&&me(s).values.length&&(a=t[o]),o++}if(a&&r)for(let s of e)t[s]=Wt(r,a)}var Fr=t=>t===$||t===g,Xo=(t,e)=>parseFloat(t.split(", ")[e]),jo=(t,e)=>(r,{transform:o})=>{if(o==="none"||!o)return 0;let a=o.match(/^matrix3d\((.+)\)$/u);if(a)return Xo(a[1],e);{let s=o.match(/^matrix\((.+)\)$/u);return s?Xo(s[1],t):0}},Gs=new Set(["x","y","z"]),Ks=j.filter(t=>!Gs.has(t));function $o(t){let e=[];return Ks.forEach(r=>{let o=t.getValue(r);o!==void 0&&(e.push([r,o.get()]),o.set(r.startsWith("scale")?1:0))}),e}var ce={width:({x:t},{paddingLeft:e="0",paddingRight:r="0"})=>t.max-t.min-parseFloat(e)-parseFloat(r),height:({y:t},{paddingTop:e="0",paddingBottom:r="0"})=>t.max-t.min-parseFloat(e)-parseFloat(r),top:(t,{top:e})=>parseFloat(e),left:(t,{left:e})=>parseFloat(e),bottom:({y:t},{top:e})=>parseFloat(e)+(t.max-t.min),right:({x:t},{left:e})=>parseFloat(e)+(t.max-t.min),x:jo(4,13),y:jo(5,14)};ce.translateX=ce.x;ce.translateY=ce.y;var xe=new Set,Rr=!1,Br=!1;function _o(){if(Br){let t=Array.from(xe).filter(o=>o.needsMeasurement),e=new Set(t.map(o=>o.element)),r=new Map;e.forEach(o=>{let a=$o(o);a.length&&(r.set(o,a),o.render())}),t.forEach(o=>o.measureInitialState()),e.forEach(o=>{o.render();let a=r.get(o);a&&a.forEach(([s,i])=>{var n;(n=o.getValue(s))===null||n===void 0||n.set(i)})}),t.forEach(o=>o.measureEndState()),t.forEach(o=>{o.suspendedScrollY!==void 0&&window.scrollTo(0,o.suspendedScrollY)})}Br=!1,Rr=!1,xe.forEach(t=>t.complete()),xe.clear()}function Yo(){xe.forEach(t=>{t.readKeyframes(),t.needsMeasurement&&(Br=!0)})}function Zo(){Yo(),_o()}var fe=class{constructor(e,r,o,a,s,i=!1){this.isComplete=!1,this.isAsync=!1,this.needsMeasurement=!1,this.isScheduled=!1,this.unresolvedKeyframes=[...e],this.onComplete=r,this.name=o,this.motionValue=a,this.element=s,this.isAsync=i}scheduleResolve(){this.isScheduled=!0,this.isAsync?(xe.add(this),Rr||(Rr=!0,E.read(Yo),E.resolveKeyframes(_o))):(this.readKeyframes(),this.complete())}readKeyframes(){let{unresolvedKeyframes:e,name:r,element:o,motionValue:a}=this;for(let s=0;s<e.length;s++)if(e[s]===null)if(s===0){let i=a?.get(),n=e[e.length-1];if(i!==void 0)e[0]=i;else if(o&&r){let l=o.readValue(r,n);l!=null&&(e[0]=l)}e[0]===void 0&&(e[0]=n),a&&i===void 0&&a.set(e[0])}else e[s]=e[s-1]}setFinalKeyframe(){}measureInitialState(){}renderEndStyles(){}measureEndState(){}complete(){this.isComplete=!0,this.onComplete(this.unresolvedKeyframes,this.finalKeyframe),xe.delete(this)}cancel(){this.isComplete||(this.isScheduled=!1,xe.delete(this))}resume(){this.isComplete||this.scheduleResolve()}};var Xt=t=>/^-?(?:\d+(?:\.\d+)?|\.\d+)$/u.test(t);var Jo=t=>e=>typeof e=="string"&&e.startsWith(t),jt=Jo("--"),Ws=Jo("var(--"),Ve=t=>Ws(t)?Xs.test(t.split("/*")[0].trim()):!1,Xs=/var\(--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)$/iu;var js=/^var\(--(?:([\w-]+)|([\w-]+), ?([a-zA-Z\d ()%#.,-]+))\)/u;function $s(t){let e=js.exec(t);if(!e)return[,];let[,r,o,a]=e;return[`--${r??o}`,a]}var _s=4;function Er(t,e,r=1){W(r<=_s,`Max CSS variable fallback depth detected in property "${t}". This may indicate a circular fallback dependency.`);let[o,a]=$s(t);if(!o)return;let s=window.getComputedStyle(e).getPropertyValue(o);if(s){let i=s.trim();return Xt(i)?parseFloat(i):i}return Ve(a)?Er(a,e,r+1):a}var $t=t=>e=>e.test(t);var Qo={test:t=>t==="auto",parse:t=>t};var Lr=[$,g,ne,Y,Oo,Lo,Qo],Or=t=>Lr.find($t(t));var Fe=class extends fe{constructor(e,r,o,a,s){super(e,r,o,a,s,!0)}readKeyframes(){let{unresolvedKeyframes:e,element:r,name:o}=this;if(!r||!r.current)return;super.readKeyframes();for(let l=0;l<e.length;l++){let f=e[l];if(typeof f=="string"&&(f=f.trim(),Ve(f))){let u=Er(f,r.current);u!==void 0&&(e[l]=u),l===e.length-1&&(this.finalKeyframe=f)}}if(this.resolveNoneKeyframes(),!Rt.has(o)||e.length!==2)return;let[a,s]=e,i=Or(a),n=Or(s);if(i!==n)if(Fr(i)&&Fr(n))for(let l=0;l<e.length;l++){let f=e[l];typeof f=="string"&&(e[l]=parseFloat(f))}else this.needsMeasurement=!0}resolveNoneKeyframes(){let{unresolvedKeyframes:e,name:r}=this,o=[];for(let a=0;a<e.length;a++)Ro(e[a])&&o.push(a);o.length&&Wo(e,o,r)}measureInitialState(){let{element:e,unresolvedKeyframes:r,name:o}=this;if(!e||!e.current)return;o==="height"&&(this.suspendedScrollY=window.pageYOffset),this.measuredOrigin=ce[o](e.measureViewportBox(),window.getComputedStyle(e.current)),r[0]=this.measuredOrigin;let a=r[r.length-1];a!==void 0&&e.getValue(o,a).jump(a,!1)}measureEndState(){var e;let{element:r,name:o,unresolvedKeyframes:a}=this;if(!r||!r.current)return;let s=r.getValue(o);s&&s.jump(this.measuredOrigin,!1);let i=a.length-1,n=a[i];a[i]=ce[o](r.measureViewportBox(),window.getComputedStyle(r.current)),n!==null&&this.finalKeyframe===void 0&&(this.finalKeyframe=n),!((e=this.removedTransforms)===null||e===void 0)&&e.length&&this.removedTransforms.forEach(([l,f])=>{r.getValue(l).set(f)}),this.resolveNoneKeyframes()}};var qr=(t,e)=>e==="zIndex"?!1:!!(typeof t=="number"||Array.isArray(t)||typeof t=="string"&&(H.test(t)||t==="0")&&!t.startsWith("url("));function Ys(t){let e=t[0];if(t.length===1)return!0;for(let r=0;r<t.length;r++)if(t[r]!==e)return!0}function ea(t,e,r,o){let a=t[0];if(a===null)return!1;if(e==="display"||e==="visibility")return!0;let s=t[t.length-1],i=qr(a,e),n=qr(s,e);return re(i===n,`You are trying to animate ${e} from "${a}" to "${s}". ${a} is not an animatable value - to enable this animation set ${a} to a value animatable to ${s} via the \`style\` property.`),!i||!n?!1:Ys(t)||(r==="spring"||ae(r))&&o}var Zs=t=>t!==null;function ue(t,{repeat:e,repeatType:r="loop"},o){let a=t.filter(Zs),s=e&&r!=="loop"&&e%2===1?0:a.length-1;return!s||o===void 0?a[s]:o}var Js=40,Re=class{constructor({autoplay:e=!0,delay:r=0,type:o="keyframes",repeat:a=0,repeatDelay:s=0,repeatType:i="loop",...n}){this.isStopped=!1,this.hasAttemptedResolve=!1,this.createdAt=z.now(),this.options={autoplay:e,delay:r,type:o,repeat:a,repeatDelay:s,repeatType:i,...n},this.updateFinishedPromise()}calcStartTime(){return this.resolvedAt?this.resolvedAt-this.createdAt>Js?this.resolvedAt:this.createdAt:this.createdAt}get resolved(){return!this._resolved&&!this.hasAttemptedResolve&&Zo(),this._resolved}onKeyframesResolved(e,r){this.resolvedAt=z.now(),this.hasAttemptedResolve=!0;let{name:o,type:a,velocity:s,delay:i,onComplete:n,onUpdate:l,isGenerator:f}=this.options;if(!f&&!ea(e,o,a,s))if(Ot.current||!i){l&&l(ue(e,this.options,r)),n&&n(),this.resolveFinishedPromise();return}else this.options.duration=0;let u=this.initPlayback(e,r);u!==!1&&(this._resolved={keyframes:e,finalKeyframe:r,...u},this.onPostResolved())}onPostResolved(){}then(e,r){return this.currentFinishedPromise.then(e,r)}flatten(){this.options.type="keyframes",this.options.ease="linear"}updateFinishedPromise(){this.currentFinishedPromise=new Promise(e=>{this.resolveFinishedPromise=e})}};function Ir(t,e,r){return r<0&&(r+=1),r>1&&(r-=1),r<1/6?t+(e-t)*6*r:r<1/2?e:r<2/3?t+(e-t)*(2/3-r)*6:t}function ta({hue:t,saturation:e,lightness:r,alpha:o}){t/=360,e/=100,r/=100;let a=0,s=0,i=0;if(!e)a=s=i=r;else{let n=r<.5?r*(1+e):r+e-r*e,l=2*r-n;a=Ir(l,n,t+1/3),s=Ir(l,n,t),i=Ir(l,n,t-1/3)}return{red:Math.round(a*255),green:Math.round(s*255),blue:Math.round(i*255),alpha:o}}function Be(t,e){return r=>r>0?e:t}var Nr=(t,e,r)=>{let o=t*t,a=r*(e*e-o)+o;return a<0?0:Math.sqrt(a)},Qs=[_e,_,le],ei=t=>Qs.find(e=>e.test(t));function ra(t){let e=ei(t);if(re(!!e,`'${t}' is not an animatable color. Use the equivalent color code instead.`),!e)return!1;let r=e.parse(t);return e===le&&(r=ta(r)),r}var Ur=(t,e)=>{let r=ra(t),o=ra(e);if(!r||!o)return Be(t,e);let a={...r};return s=>(a.red=Nr(r.red,o.red,s),a.green=Nr(r.green,o.green,s),a.blue=Nr(r.blue,o.blue,s),a.alpha=X(r.alpha,o.alpha,s),_.transform(a))};var ti=(t,e)=>r=>e(t(r)),Ee=(...t)=>t.reduce(ti);var _t=new Set(["none","hidden"]);function oa(t,e){return _t.has(t)?r=>r<=0?t:e:r=>r>=1?e:t}function ri(t,e){return r=>X(t,e,r)}function Yt(t){return typeof t=="number"?ri:typeof t=="string"?Ve(t)?Be:R.test(t)?Ur:si:Array.isArray(t)?aa:typeof t=="object"?R.test(t)?Ur:oi:Be}function aa(t,e){let r=[...t],o=r.length,a=t.map((s,i)=>Yt(s)(s,e[i]));return s=>{for(let i=0;i<o;i++)r[i]=a[i](s);return r}}function oi(t,e){let r={...t,...e},o={};for(let a in r)t[a]!==void 0&&e[a]!==void 0&&(o[a]=Yt(t[a])(t[a],e[a]));return a=>{for(let s in o)r[s]=o[s](a);return r}}function ai(t,e){var r;let o=[],a={color:0,var:0,number:0};for(let s=0;s<e.values.length;s++){let i=e.types[s],n=t.indexes[i][a[i]],l=(r=t.values[n])!==null&&r!==void 0?r:0;o[s]=l,a[i]++}return o}var si=(t,e)=>{let r=H.createTransformer(e),o=me(t),a=me(e);return o.indexes.var.length===a.indexes.var.length&&o.indexes.color.length===a.indexes.color.length&&o.indexes.number.length>=a.indexes.number.length?_t.has(t)&&!a.values.length||_t.has(e)&&!o.values.length?oa(t,e):Ee(aa(ai(o,a),a.values),r):(re(!0,`Complex values '${t}' and '${e}' too different to mix. Ensure all colors are of the same type, and that each contains the same quantity of number and color values. Falling back to instant transition.`),Be(t,e))};function Zt(t,e,r){return typeof t=="number"&&typeof e=="number"&&typeof r=="number"?X(t,e,r):Yt(t)(t,e)}function zr({keyframes:t,velocity:e=0,power:r=.8,timeConstant:o=325,bounceDamping:a=10,bounceStiffness:s=500,modifyTarget:i,min:n,max:l,restDelta:f=.5,restSpeed:u}){let p=t[0],d={done:!1,value:p},m=v=>n!==void 0&&v<n||l!==void 0&&v>l,x=v=>n===void 0?l:l===void 0||Math.abs(n-v)<Math.abs(l-v)?n:l,c=r*e,C=p+c,h=i===void 0?C:i(C);h!==C&&(c=h-p);let w=v=>-c*Math.exp(-v/o),b=v=>h+w(v),S=v=>{let T=w(v),P=b(v);d.done=Math.abs(T)<=f,d.value=d.done?h:P},y,A,D=v=>{m(d.value)&&(y=v,A=ve({keyframes:[d.value,x(d.value)],velocity:St(b,v,d.value),damping:a,stiffness:s,restDelta:f,restSpeed:u}))};return D(0),{calculatedDuration:null,next:v=>{let T=!1;return!A&&y===void 0&&(T=!0,S(v),D(v)),y!==void 0&&v>=y?A.next(v-y):(!T&&S(v),d)}}}var sa=se(.42,0,1,1),ia=se(0,0,.58,1),Jt=se(.42,0,.58,1);var na={linear:L,easeIn:sa,easeInOut:Jt,easeOut:ia,circIn:zt,circInOut:Ht,circOut:Fo,backIn:je,backInOut:Nt,backOut:Pr,anticipate:Ut},Hr=t=>{if(We(t)){W(t.length===4,"Cubic bezier arrays must contain four numerical values.");let[e,r,o,a]=t;return se(e,r,o,a)}else if(typeof t=="string")return W(na[t]!==void 0,`Invalid easing type '${t}'`),na[t];return t};function ii(t,e,r){let o=[],a=r||Zt,s=t.length-1;for(let i=0;i<s;i++){let n=a(t[i],t[i+1]);if(e){let l=Array.isArray(e)?e[i]||L:e;n=Ee(l,n)}o.push(n)}return o}function la(t,e,{clamp:r=!0,ease:o,mixer:a}={}){let s=t.length;if(W(s===e.length,"Both input and output ranges must be the same length"),s===1)return()=>e[0];if(s===2&&e[0]===e[1])return()=>e[1];let i=t[0]===t[1];t[0]>t[s-1]&&(t=[...t].reverse(),e=[...e].reverse());let n=ii(e,o,a),l=n.length,f=u=>{if(i&&u<t[0])return e[0];let p=0;if(l>1)for(;p<t.length-2&&!(u<t[p+1]);p++);let d=oe(t[p],t[p+1],u);return n[p](d)};return r?u=>f(N(t[0],t[s-1],u)):f}function fa(t,e){return t.map(r=>r*e)}function ni(t,e){return t.map(()=>e||Jt).splice(0,t.length-1)}function Je({duration:t=300,keyframes:e,times:r,ease:o="easeInOut"}){let a=At(o)?o.map(Hr):Hr(o),s={done:!1,value:e[0]},i=fa(r&&r.length===e.length?r:kt(e),t),n=la(i,e,{ease:Array.isArray(a)?a:ni(e,a)});return{calculatedDuration:t,next:l=>(s.value=n(l),s.done=l>=t,s)}}var ua=t=>{let e=({timestamp:r})=>t(r);return{start:()=>E.update(e,!0),stop:()=>Ke(e),now:()=>be.isProcessing?be.timestamp:z.now()}};var li={decay:zr,inertia:zr,tween:Je,keyframes:Je,spring:ve},fi=t=>t/100,he=class extends Re{constructor(e){super(e),this.holdTime=null,this.cancelTime=null,this.currentTime=0,this.playbackSpeed=1,this.pendingPlayState="running",this.startTime=null,this.state="idle",this.stop=()=>{if(this.resolver.cancel(),this.isStopped=!0,this.state==="idle")return;this.teardown();let{onStop:l}=this.options;l&&l()};let{name:r,motionValue:o,element:a,keyframes:s}=this.options,i=a?.KeyframeResolver||fe,n=(l,f)=>this.onKeyframesResolved(l,f);this.resolver=new i(s,n,r,o,a),this.resolver.scheduleResolve()}flatten(){super.flatten(),this._resolved&&Object.assign(this._resolved,this.initPlayback(this._resolved.keyframes))}initPlayback(e){let{type:r="keyframes",repeat:o=0,repeatDelay:a=0,repeatType:s,velocity:i=0}=this.options,n=ae(r)?r:li[r]||Je,l,f;n!==Je&&typeof e[0]!="number"&&(l=Ee(fi,Zt(e[0],e[1])),e=[0,100]);let u=n({...this.options,keyframes:e});s==="mirror"&&(f=n({...this.options,keyframes:[...e].reverse(),velocity:-i})),u.calculatedDuration===null&&(u.calculatedDuration=we(u));let{calculatedDuration:p}=u,d=p+a,m=d*(o+1)-a;return{generator:u,mirroredGenerator:f,mapPercentToKeyframes:l,calculatedDuration:p,resolvedDuration:d,totalDuration:m}}onPostResolved(){let{autoplay:e=!0}=this.options;this.play(),this.pendingPlayState==="paused"||!e?this.pause():this.state=this.pendingPlayState}tick(e,r=!1){let{resolved:o}=this;if(!o){let{keyframes:v}=this.options;return{done:!0,value:v[v.length-1]}}let{finalKeyframe:a,generator:s,mirroredGenerator:i,mapPercentToKeyframes:n,keyframes:l,calculatedDuration:f,totalDuration:u,resolvedDuration:p}=o;if(this.startTime===null)return s.next(0);let{delay:d,repeat:m,repeatType:x,repeatDelay:c,onUpdate:C}=this.options;this.speed>0?this.startTime=Math.min(this.startTime,e):this.speed<0&&(this.startTime=Math.min(e-u/this.speed,this.startTime)),r?this.currentTime=e:this.holdTime!==null?this.currentTime=this.holdTime:this.currentTime=Math.round(e-this.startTime)*this.speed;let h=this.currentTime-d*(this.speed>=0?1:-1),w=this.speed>=0?h<0:h>u;this.currentTime=Math.max(h,0),this.state==="finished"&&this.holdTime===null&&(this.currentTime=u);let b=this.currentTime,S=s;if(m){let v=Math.min(this.currentTime,u)/p,T=Math.floor(v),P=v%1;!P&&v>=1&&(P=1),P===1&&T--,T=Math.min(T,m+1),!!(T%2)&&(x==="reverse"?(P=1-P,c&&(P-=c/p)):x==="mirror"&&(S=i)),b=N(0,1,P)*p}let y=w?{done:!1,value:l[0]}:S.next(b);n&&(y.value=n(y.value));let{done:A}=y;!w&&f!==null&&(A=this.speed>=0?this.currentTime>=u:this.currentTime<=0);let D=this.holdTime===null&&(this.state==="finished"||this.state==="running"&&A);return D&&a!==void 0&&(y.value=ue(l,this.options,a)),C&&C(y.value),D&&this.finish(),y}get duration(){let{resolved:e}=this;return e?O(e.calculatedDuration):0}get time(){return O(this.currentTime)}set time(e){e=B(e),this.currentTime=e,this.holdTime!==null||this.speed===0?this.holdTime=e:this.driver&&(this.startTime=this.driver.now()-e/this.speed)}get speed(){return this.playbackSpeed}set speed(e){let r=this.playbackSpeed!==e;this.playbackSpeed=e,r&&(this.time=O(this.currentTime))}play(){if(this.resolver.isScheduled||this.resolver.resume(),!this._resolved){this.pendingPlayState="running";return}if(this.isStopped)return;let{driver:e=ua,onPlay:r,startTime:o}=this.options;this.driver||(this.driver=e(s=>this.tick(s))),r&&r();let a=this.driver.now();this.holdTime!==null?this.startTime=a-this.holdTime:this.startTime?this.state==="finished"&&(this.startTime=a):this.startTime=o??this.calcStartTime(),this.state==="finished"&&this.updateFinishedPromise(),this.cancelTime=this.startTime,this.holdTime=null,this.state="running",this.driver.start()}pause(){var e;if(!this._resolved){this.pendingPlayState="paused";return}this.state="paused",this.holdTime=(e=this.currentTime)!==null&&e!==void 0?e:0}complete(){this.state!=="running"&&this.play(),this.pendingPlayState=this.state="finished",this.holdTime=null}finish(){this.teardown(),this.state="finished";let{onComplete:e}=this.options;e&&e()}cancel(){this.cancelTime!==null&&this.tick(this.cancelTime),this.teardown(),this.updateFinishedPromise()}teardown(){this.state="idle",this.stopDriver(),this.resolveFinishedPromise(),this.updateFinishedPromise(),this.startTime=this.cancelTime=null,this.resolver.cancel()}stopDriver(){this.driver&&(this.driver.stop(),this.driver=void 0)}sample(e){return this.startTime=0,this.tick(e,!0)}};var pa=new Set(["opacity","clipPath","filter","transform"]);function da(t,e,r,{delay:o=0,duration:a=300,repeat:s=0,repeatType:i="loop",ease:n="easeInOut",times:l}={}){let f={[e]:r};l&&(f.offset=l);let u=Mr(n,a);return Array.isArray(u)&&(f.easing=u),t.animate(f,{delay:o,duration:a,easing:Array.isArray(u)?"linear":u,fill:"both",iterations:s+1,direction:i==="reverse"?"alternate":"normal"})}var ma=ge(()=>Object.hasOwnProperty.call(Element.prototype,"animate"));var Qt=10,ui=2e4;function pi(t){return ae(t.type)||t.type==="spring"||!Ar(t.ease)}function di(t,e){let r=new he({...e,keyframes:t,repeat:0,delay:0,isGenerator:!0}),o={done:!1,value:t[0]},a=[],s=0;for(;!o.done&&s<ui;)o=r.sample(s),a.push(o.value),s+=Qt;return{times:void 0,keyframes:a,duration:s-Qt,ease:"linear"}}var ca={anticipate:Ut,backInOut:Nt,circInOut:Ht};function mi(t){return t in ca}var Qe=class extends Re{constructor(e){super(e);let{name:r,motionValue:o,element:a,keyframes:s}=this.options;this.resolver=new Fe(s,(i,n)=>this.onKeyframesResolved(i,n),r,o,a),this.resolver.scheduleResolve()}initPlayback(e,r){let{duration:o=300,times:a,ease:s,type:i,motionValue:n,name:l,startTime:f}=this.options;if(!n.owner||!n.owner.current)return!1;if(typeof s=="string"&&Ae()&&mi(s)&&(s=ca[s]),pi(this.options)){let{onComplete:p,onUpdate:d,motionValue:m,element:x,...c}=this.options,C=di(e,c);e=C.keyframes,e.length===1&&(e[1]=e[0]),o=C.duration,a=C.times,s=C.ease,i="keyframes"}let u=da(n.owner.current,l,e,{...this.options,duration:o,times:a,ease:s});return u.startTime=f??this.calcStartTime(),this.pendingTimeline?(Sr(u,this.pendingTimeline),this.pendingTimeline=void 0):u.onfinish=()=>{let{onComplete:p}=this.options;n.set(ue(e,this.options,r)),p&&p(),this.cancel(),this.resolveFinishedPromise()},{animation:u,duration:o,times:a,type:i,ease:s,keyframes:e}}get duration(){let{resolved:e}=this;if(!e)return 0;let{duration:r}=e;return O(r)}get time(){let{resolved:e}=this;if(!e)return 0;let{animation:r}=e;return O(r.currentTime||0)}set time(e){let{resolved:r}=this;if(!r)return;let{animation:o}=r;o.currentTime=B(e)}get speed(){let{resolved:e}=this;if(!e)return 1;let{animation:r}=e;return r.playbackRate}set speed(e){let{resolved:r}=this;if(!r)return;let{animation:o}=r;o.playbackRate=e}get state(){let{resolved:e}=this;if(!e)return"idle";let{animation:r}=e;return r.playState}get startTime(){let{resolved:e}=this;if(!e)return null;let{animation:r}=e;return r.startTime}attachTimeline(e){if(!this._resolved)this.pendingTimeline=e;else{let{resolved:r}=this;if(!r)return L;let{animation:o}=r;Sr(o,e)}return L}play(){if(this.isStopped)return;let{resolved:e}=this;if(!e)return;let{animation:r}=e;r.playState==="finished"&&this.updateFinishedPromise(),r.play()}pause(){let{resolved:e}=this;if(!e)return;let{animation:r}=e;r.pause()}stop(){if(this.resolver.cancel(),this.isStopped=!0,this.state==="idle")return;this.resolveFinishedPromise(),this.updateFinishedPromise();let{resolved:e}=this;if(!e)return;let{animation:r,keyframes:o,duration:a,type:s,ease:i,times:n}=e;if(r.playState==="idle"||r.playState==="finished")return;if(this.time){let{motionValue:f,onUpdate:u,onComplete:p,element:d,...m}=this.options,x=new he({...m,keyframes:o,duration:a,type:s,ease:i,times:n,isGenerator:!0}),c=B(this.time);f.setWithVelocity(x.sample(c-Qt).value,x.sample(c).value,Qt)}let{onStop:l}=this.options;l&&l(),this.cancel()}complete(){let{resolved:e}=this;e&&e.animation.finish()}cancel(){let{resolved:e}=this;e&&e.animation.cancel()}static supports(e){let{motionValue:r,name:o,repeatDelay:a,repeatType:s,damping:i,type:n}=e;if(!r||!r.owner||!(r.owner.current instanceof HTMLElement))return!1;let{onUpdate:l,transformTemplate:f}=r.owner.getProps();return ma()&&o&&pa.has(o)&&!l&&!f&&!a&&s!=="mirror"&&i!==0&&n!=="inertia"}};var ci={type:"spring",stiffness:500,damping:25,restSpeed:10},xi=t=>({type:"spring",stiffness:550,damping:t===0?2*Math.sqrt(550):30,restSpeed:10}),hi={type:"keyframes",duration:.8},gi={type:"keyframes",ease:[.25,.1,.35,1],duration:.3},xa=(t,{keyframes:e})=>e.length>2?hi:U.has(t)?t.startsWith("scale")?xi(e[1]):ci:gi;function ha({when:t,delay:e,delayChildren:r,staggerChildren:o,staggerDirection:a,repeat:s,repeatType:i,repeatDelay:n,from:l,elapsed:f,...u}){return!!Object.keys(u).length}var er=(t,e,r,o={},a,s)=>i=>{let n=Ft(o,t)||{},l=n.delay||o.delay||0,{elapsed:f=0}=o;f=f-B(l);let u={keyframes:Array.isArray(r)?r:[null,r],ease:"easeOut",velocity:e.getVelocity(),...n,delay:-f,onUpdate:d=>{e.set(d),n.onUpdate&&n.onUpdate(d)},onComplete:()=>{i(),n.onComplete&&n.onComplete()},name:t,motionValue:e,element:s?void 0:a};ha(n)||(u={...u,...xa(t,u)}),u.duration&&(u.duration=B(u.duration)),u.repeatDelay&&(u.repeatDelay=B(u.repeatDelay)),u.from!==void 0&&(u.keyframes[0]=u.from);let p=!1;if((u.type===!1||u.duration===0&&!u.repeatDelay)&&(u.duration=0,u.delay===0&&(p=!0)),(Ot.current||Ce.skipAnimations)&&(p=!0,u.duration=0,u.delay=0),p&&!s&&e.get()!==void 0){let d=ue(u.keyframes,n);if(d!==void 0)return E.update(()=>{u.onUpdate(d),u.onComplete()}),new ye([])}return!s&&Qe.supports(u)?new Qe(u):new he(u)};function yi({protectedKeys:t,needsAnimating:e},r){let o=t.hasOwnProperty(r)&&e[r]!==!0;return e[r]=!1,o}function ga(t,e,{delay:r=0,transitionOverride:o,type:a}={}){var s;let{transition:i=t.getDefaultTransition(),transitionEnd:n,...l}=e;o&&(i=o);let f=[],u=a&&t.animationState&&t.animationState.getState()[a];for(let p in l){let d=t.getValue(p,(s=t.latestValues[p])!==null&&s!==void 0?s:null),m=l[p];if(m===void 0||u&&yi(u,p))continue;let x={delay:r,...Ft(i||{},p)},c=!1;if(window.MotionHandoffAnimation){let h=Po(t);if(h){let w=window.MotionHandoffAnimation(h,p,E);w!==null&&(x.startTime=w,c=!0)}}Ao(t,p),d.start(er(p,d,m,t.shouldReduceMotion&&Rt.has(p)?{type:!1}:x,t,c));let C=d.animation;C&&f.push(C)}return n&&Promise.all(f).then(()=>{E.update(()=>{n&&So(t,n)})}),f}function ya(t){return t instanceof SVGElement&&t.tagName!=="svg"}var wa=()=>({min:0,max:0}),Le=()=>({x:wa(),y:wa()});var va={animation:["animate","variants","whileHover","whileTap","exit","whileInView","whileFocus","whileDrag"],exit:["exit"],drag:["drag","dragControls"],focus:["whileFocus"],hover:["whileHover","onHoverStart","onHoverEnd"],tap:["whileTap","onTap","onTapStart","onTapCancel"],pan:["onPan","onPanStart","onPanSessionStart","onPanEnd"],inView:["whileInView","onViewportEnter","onViewportLeave"],layout:["layout","layoutId"]},tr={};for(let t in va)tr[t]={isEnabled:e=>va[t].some(r=>!!e[r])};var Ca=typeof window<"u";var et={current:null},rr={current:!1};function ba(){if(rr.current=!0,!!Ca)if(window.matchMedia){let t=window.matchMedia("(prefers-reduced-motion)"),e=()=>et.current=t.matches;t.addListener(e),e()}else et.current=!1}var wi=[...Lr,R,H],Sa=t=>wi.find($t(t));function Ta(t){return t!==null&&typeof t=="object"&&typeof t.start=="function"}function Aa(t){return typeof t=="string"||Array.isArray(t)}var vi=["animate","whileInView","whileFocus","whileHover","whileTap","whileDrag","exit"],Ma=["initial",...vi];function Gr(t){return Ta(t.animate)||Ma.some(e=>Aa(t[e]))}function Pa(t){return!!(Gr(t)||t.variants)}function ka(t,e,r){for(let o in e){let a=e[o],s=r[o];if(k(a))t.addValue(o,a);else if(k(s))t.addValue(o,J(a,{owner:t}));else if(s!==a)if(t.hasValue(o)){let i=t.getValue(o);i.liveStyle===!0?i.jump(a):i.hasAnimated||i.set(a)}else{let i=t.getStaticValue(o);t.addValue(o,J(i!==void 0?i:a,{owner:t}))}}for(let o in r)e[o]===void 0&&t.removeValue(o);return e}var Da=["AnimationStart","AnimationComplete","Update","BeforeLayoutMeasure","LayoutMeasure","LayoutAnimationStart","LayoutAnimationComplete"],Oe=class{scrapeMotionValuesFromProps(e,r,o){return{}}constructor({parent:e,props:r,presenceContext:o,reducedMotionConfig:a,blockInitialAnimation:s,visualState:i},n={}){this.current=null,this.children=new Set,this.isVariantNode=!1,this.isControllingVariants=!1,this.shouldReduceMotion=null,this.values=new Map,this.KeyframeResolver=fe,this.features={},this.valueSubscriptions=new Map,this.prevMotionValues={},this.events={},this.propEventSubscriptions={},this.notifyUpdate=()=>this.notify("Update",this.latestValues),this.render=()=>{this.current&&(this.triggerBuild(),this.renderInstance(this.current,this.renderState,this.props.style,this.projection))},this.renderScheduledAt=0,this.scheduleRender=()=>{let m=z.now();this.renderScheduledAt<m&&(this.renderScheduledAt=m,E.render(this.render,!1,!0))};let{latestValues:l,renderState:f,onUpdate:u}=i;this.onUpdate=u,this.latestValues=l,this.baseTarget={...l},this.initialValues=r.initial?{...l}:{},this.renderState=f,this.parent=e,this.props=r,this.presenceContext=o,this.depth=e?e.depth+1:0,this.reducedMotionConfig=a,this.options=n,this.blockInitialAnimation=!!s,this.isControllingVariants=Gr(r),this.isVariantNode=Pa(r),this.isVariantNode&&(this.variantChildren=new Set),this.manuallyAnimateOnMount=!!(e&&e.current);let{willChange:p,...d}=this.scrapeMotionValuesFromProps(r,{},this);for(let m in d){let x=d[m];l[m]!==void 0&&k(x)&&x.set(l[m],!1)}}mount(e){this.current=e,Z.set(e,this),this.projection&&!this.projection.instance&&this.projection.mount(e),this.parent&&this.isVariantNode&&!this.isControllingVariants&&(this.removeFromVariantTree=this.parent.addVariantChild(this)),this.values.forEach((r,o)=>this.bindToMotionValue(o,r)),rr.current||ba(),this.shouldReduceMotion=this.reducedMotionConfig==="never"?!1:this.reducedMotionConfig==="always"?!0:et.current,this.parent&&this.parent.children.add(this),this.update(this.props,this.presenceContext)}unmount(){Z.delete(this.current),this.projection&&this.projection.unmount(),Ke(this.notifyUpdate),Ke(this.render),this.valueSubscriptions.forEach(e=>e()),this.valueSubscriptions.clear(),this.removeFromVariantTree&&this.removeFromVariantTree(),this.parent&&this.parent.children.delete(this);for(let e in this.events)this.events[e].clear();for(let e in this.features){let r=this.features[e];r&&(r.unmount(),r.isMounted=!1)}this.current=null}bindToMotionValue(e,r){this.valueSubscriptions.has(e)&&this.valueSubscriptions.get(e)();let o=U.has(e),a=r.on("change",n=>{this.latestValues[e]=n,this.props.onUpdate&&E.preRender(this.notifyUpdate),o&&this.projection&&(this.projection.isTransformDirty=!0)}),s=r.on("renderRequest",this.scheduleRender),i;window.MotionCheckAppearSync&&(i=window.MotionCheckAppearSync(this,e,r)),this.valueSubscriptions.set(e,()=>{a(),s(),i&&i(),r.owner&&r.stop()})}sortNodePosition(e){return!this.current||!this.sortInstanceNodePosition||this.type!==e.type?0:this.sortInstanceNodePosition(this.current,e.current)}updateFeatures(){let e="animation";for(e in tr){let r=tr[e];if(!r)continue;let{isEnabled:o,Feature:a}=r;if(!this.features[e]&&a&&o(this.props)&&(this.features[e]=new a(this)),this.features[e]){let s=this.features[e];s.isMounted?s.update():(s.mount(),s.isMounted=!0)}}}triggerBuild(){this.build(this.renderState,this.latestValues,this.props)}measureViewportBox(){return this.current?this.measureInstanceViewportBox(this.current,this.props):Le()}getStaticValue(e){return this.latestValues[e]}setStaticValue(e,r){this.latestValues[e]=r}update(e,r){(e.transformTemplate||this.props.transformTemplate)&&this.scheduleRender(),this.prevProps=this.props,this.props=e,this.prevPresenceContext=this.presenceContext,this.presenceContext=r;for(let o=0;o<Da.length;o++){let a=Da[o];this.propEventSubscriptions[a]&&(this.propEventSubscriptions[a](),delete this.propEventSubscriptions[a]);let s="on"+a,i=e[s];i&&(this.propEventSubscriptions[a]=this.on(a,i))}this.prevMotionValues=ka(this,this.scrapeMotionValuesFromProps(e,this.prevProps,this),this.prevMotionValues),this.handleChildMotionValue&&this.handleChildMotionValue(),this.onUpdate&&this.onUpdate(this)}getProps(){return this.props}getVariant(e){return this.props.variants?this.props.variants[e]:void 0}getDefaultTransition(){return this.props.transition}getTransformPagePoint(){return this.props.transformPagePoint}getClosestVariantNode(){return this.isVariantNode?this:this.parent?this.parent.getClosestVariantNode():void 0}addVariantChild(e){let r=this.getClosestVariantNode();if(r)return r.variantChildren&&r.variantChildren.add(e),()=>r.variantChildren.delete(e)}addValue(e,r){let o=this.values.get(e);r!==o&&(o&&this.removeValue(e),this.bindToMotionValue(e,r),this.values.set(e,r),this.latestValues[e]=r.get())}removeValue(e){this.values.delete(e);let r=this.valueSubscriptions.get(e);r&&(r(),this.valueSubscriptions.delete(e)),delete this.latestValues[e],this.removeValueFromRenderState(e,this.renderState)}hasValue(e){return this.values.has(e)}getValue(e,r){if(this.props.values&&this.props.values[e])return this.props.values[e];let o=this.values.get(e);return o===void 0&&r!==void 0&&(o=J(r===null?void 0:r,{owner:this}),this.addValue(e,o)),o}readValue(e,r){var o;let a=this.latestValues[e]!==void 0||!this.current?this.latestValues[e]:(o=this.getBaseTargetFromProps(this.props,e))!==null&&o!==void 0?o:this.readValueFromInstance(this.current,e,this.options);return a!=null&&(typeof a=="string"&&(Xt(a)||Gt(a))?a=parseFloat(a):!Sa(a)&&H.test(r)&&(a=Wt(e,r)),this.setBaseTarget(e,k(a)?a.get():a)),k(a)?a.get():a}setBaseTarget(e,r){this.baseTarget[e]=r}getBaseTarget(e){var r;let{initial:o}=this.props,a;if(typeof o=="string"||typeof o=="object"){let i=Lt(this.props,o,(r=this.presenceContext)===null||r===void 0?void 0:r.custom);i&&(a=i[e])}if(o&&a!==void 0)return a;let s=this.getBaseTargetFromProps(this.props,e);return s!==void 0&&!k(s)?s:this.initialValues[e]!==void 0&&a===void 0?void 0:this.baseTarget[e]}on(e,r){return this.events[e]||(this.events[e]=new Se),this.events[e].add(r)}notify(e,...r){this.events[e]&&this.events[e].notify(...r)}};var qe=class extends Oe{constructor(){super(...arguments),this.KeyframeResolver=Fe}sortInstanceNodePosition(e,r){return e.compareDocumentPosition(r)&2?1:-1}getBaseTargetFromProps(e,r){return e.style?e.style[r]:void 0}removeValueFromRenderState(e,{vars:r,style:o}){delete r[e],delete o[e]}handleChildMotionValue(){this.childSubscription&&(this.childSubscription(),delete this.childSubscription);let{children:e}=this.props;k(e)&&(this.childSubscription=e.on("change",r=>{this.current&&(this.current.textContent=`${r}`)}))}};var or=(t,e)=>e&&typeof t=="number"?e.transform(t):t;var Ci={x:"translateX",y:"translateY",z:"translateZ",transformPerspective:"perspective"},bi=j.length;function Va(t,e,r){let o="",a=!0;for(let s=0;s<bi;s++){let i=j[s],n=t[i];if(n===void 0)continue;let l=!0;if(typeof n=="number"?l=n===(i.startsWith("scale")?1:0):l=parseFloat(n)===0,!l||r){let f=or(n,ke[i]);if(!l){a=!1;let u=Ci[i]||i;o+=`${u}(${f}) `}r&&(e[i]=f)}}return o=o.trim(),r?o=r(e,a?"":o):a&&(o="none"),o}function ar(t,e,r){let{style:o,vars:a,transformOrigin:s}=t,i=!1,n=!1;for(let l in e){let f=e[l];if(U.has(l)){i=!0;continue}else if(jt(l)){a[l]=f;continue}else{let u=or(f,ke[l]);l.startsWith("origin")?(n=!0,s[l]=u):o[l]=u}}if(e.transform||(i||r?o.transform=Va(e,t.transform,r):o.transform&&(o.transform="none")),n){let{originX:l="50%",originY:f="50%",originZ:u=0}=s;o.transformOrigin=`${l} ${f} ${u}`}}var Si={offset:"stroke-dashoffset",array:"stroke-dasharray"},Ti={offset:"strokeDashoffset",array:"strokeDasharray"};function Fa(t,e,r=1,o=0,a=!0){t.pathLength=1;let s=a?Si:Ti;t[s.offset]=g.transform(-o);let i=g.transform(e),n=g.transform(r);t[s.array]=`${i} ${n}`}function Ra(t,e,r){return typeof t=="string"?t:g.transform(e+r*t)}function Ba(t,e,r){let o=Ra(e,t.x,t.width),a=Ra(r,t.y,t.height);return`${o} ${a}`}function Ea(t,{attrX:e,attrY:r,attrScale:o,originX:a,originY:s,pathLength:i,pathSpacing:n=1,pathOffset:l=0,...f},u,p){if(ar(t,f,p),u){t.style.viewBox&&(t.attrs.viewBox=t.style.viewBox);return}t.attrs=t.style,t.style={};let{attrs:d,style:m,dimensions:x}=t;d.transform&&(x&&(m.transform=d.transform),delete d.transform),x&&(a!==void 0||s!==void 0||m.transform)&&(m.transformOrigin=Ba(x,a!==void 0?a:.5,s!==void 0?s:.5)),e!==void 0&&(d.x=e),r!==void 0&&(d.y=r),o!==void 0&&(d.scale=o),i!==void 0&&Fa(d,i,n,l,!1)}var sr=new Set(["baseFrequency","diffuseConstant","kernelMatrix","kernelUnitLength","keySplines","keyTimes","limitingConeAngle","markerHeight","markerWidth","numOctaves","targetX","targetY","surfaceScale","specularConstant","specularExponent","stdDeviation","tableValues","viewBox","gradientTransform","pathLength","startOffset","textLength","lengthAdjust"]);var La=t=>typeof t=="string"&&t.toLowerCase()==="svg";function ir(t,{style:e,vars:r},o,a){Object.assign(t.style,e,a&&a.getProjectionStyles(o));for(let s in r)t.style.setProperty(s,r[s])}function Oa(t,e,r,o){ir(t,e,void 0,o);for(let a in e.attrs)t.setAttribute(sr.has(a)?a:Te(a),e.attrs[a])}var qa={};function Ia(t,{layout:e,layoutId:r}){return U.has(t)||t.startsWith("origin")||(e||r!==void 0)&&(!!qa[t]||t==="opacity")}function nr(t,e,r){var o;let{style:a}=t,s={};for(let i in a)(k(a[i])||e.style&&k(e.style[i])||Ia(i,t)||((o=r?.getValue(i))===null||o===void 0?void 0:o.liveStyle)!==void 0)&&(s[i]=a[i]);return s}function Na(t,e,r){let o=nr(t,e,r);for(let a in t)if(k(t[a])||k(e[a])){let s=j.indexOf(a)!==-1?"attr"+a.charAt(0).toUpperCase()+a.substring(1):a;o[s]=t[a]}return o}var lr=class extends qe{constructor(){super(...arguments),this.type="svg",this.isSVGTag=!1,this.measureInstanceViewportBox=Le}getBaseTargetFromProps(e,r){return e[r]}readValueFromInstance(e,r){if(U.has(r)){let o=De(r);return o&&o.default||0}return r=sr.has(r)?r:Te(r),e.getAttribute(r)}scrapeMotionValuesFromProps(e,r,o){return Na(e,r,o)}build(e,r,o){Ea(e,r,this.isSVGTag,o.transformTemplate)}renderInstance(e,r,o,a){Oa(e,r,o,a)}mount(e){this.isSVGTag=La(e.tagName),super.mount(e)}};function Ua({top:t,left:e,right:r,bottom:o}){return{x:{min:e,max:r},y:{min:t,max:o}}}function za(t,e){if(!e)return t;let r=e({x:t.left,y:t.top}),o=e({x:t.right,y:t.bottom});return{top:r.y,left:r.x,bottom:o.y,right:o.x}}function Ha(t,e){return Ua(za(t.getBoundingClientRect(),e))}function Ai(t){return window.getComputedStyle(t)}var fr=class extends qe{constructor(){super(...arguments),this.type="html",this.renderInstance=ir}readValueFromInstance(e,r){if(U.has(r)){let o=De(r);return o&&o.default||0}else{let o=Ai(e),a=(jt(r)?o.getPropertyValue(r):o[r])||0;return typeof a=="string"?a.trim():a}}measureInstanceViewportBox(e,{transformPagePoint:r}){return Ha(e,r)}build(e,r,o){ar(e,r,o.transformTemplate)}scrapeMotionValuesFromProps(e,r,o){return nr(e,r,o)}};function Mi(t,e){return t in e}var ur=class extends Oe{constructor(){super(...arguments),this.type="object"}readValueFromInstance(e,r){if(Mi(r,e)){let o=e[r];if(typeof o=="string"||typeof o=="number")return o}}getBaseTargetFromProps(){}removeValueFromRenderState(e,r){delete r.output[e]}measureInstanceViewportBox(){return Le()}build(e,r){Object.assign(e.output,r)}renderInstance(e,{output:r}){Object.assign(e,r)}sortInstanceNodePosition(){return 0}};function Ga(t){let e={presenceContext:null,props:{},visualState:{renderState:{transform:{},transformOrigin:{},style:{},vars:{},attrs:{}},latestValues:{}}},r=ya(t)?new lr(e):new fr(e);r.mount(t),Z.set(t,r)}function Ka(t){let e={presenceContext:null,props:{},visualState:{renderState:{output:{}},latestValues:{}}},r=new ur(e);r.mount(t),Z.set(t,r)}function Wa(t,e,r){let o=k(t)?t:J(t);return o.start(er("",o,e,r)),o.animation}function Pi(t,e){return k(t)||typeof t=="number"||typeof t=="string"&&!Ge(e)}function pr(t,e,r,o){let a=[];if(Pi(t,e))a.push(Wa(t,Ge(e)&&e.default||e,r&&(r.default||r)));else{let s=Dt(t,e,o),i=s.length;W(!!i,"No valid elements provided.");for(let n=0;n<i;n++){let l=s[n],f=l instanceof Element?Ga:Ka;Z.has(l)||f(l);let u=Z.get(l),p={...r};"delay"in p&&typeof p.delay=="function"&&(p.delay=p.delay(n,i)),a.push(...ga(u,{...e,transition:p},{}))}}return a}function Xa(t,e,r){let o=[];return co(t,e,r,{spring:ve}).forEach(({keyframes:s,transition:i},n)=>{o.push(...pr(n,s,i))}),o}function ki(t){return Array.isArray(t)&&t.some(Array.isArray)}function ja(t){function e(r,o,a){let s=[];ki(r)?s=Xa(r,o,t):s=pr(r,o,a,t);let i=new ye(s);return t&&t.animations.push(i),i}return e}var dr=ja();function tt(t,e=100){let{stiffness:r,damping:o,mass:a}=t,s=[],i=pe(t),n=Math.sqrt(r/a),l=o/(2*Math.sqrt(r*a));for(let f=0;f<=e;f++){let u=f/e*i,p;if(l<1){let d=n*Math.sqrt(1-l*l);p=1-Math.exp(-l*n*u)*(Math.cos(d*u)+l*n/d*Math.sin(d*u))}else if(l===1)p=1-Math.exp(-n*u)*(1+n*u);else{let d=-n*(l-Math.sqrt(l*l-1)),m=-n*(l+Math.sqrt(l*l-1)),x=m/(m-d),c=-d/(m-d);p=1-x*Math.exp(d*u)-c*Math.exp(m*u)}s.push({t:u,value:p})}return s}function pe(t){let{stiffness:e,damping:r,mass:o}=t,a=2*Math.sqrt(e*o),s=r/a,i=Math.sqrt(e/o);if(s>=1)return Math.max(.3,4/i);{let n=i*Math.sqrt(1-s*s);return Math.max(.3,4/(s*i))}}function rt(t){return Math.round(pe(t)*1e3)}function ot(t,e,r,o,a,s=""){let{stiffness:i,damping:n,mass:l}=e,f=null,u=null,p=!0,d=pe(e),m=d*1e3,x=Math.sqrt(i/l),c=n/(2*Math.sqrt(i*l));function C(w){if(c<1){let b=x*Math.sqrt(1-c*c);return 1-Math.exp(-c*x*w)*(Math.cos(b*w)+c*x/b*Math.sin(b*w))}else{if(c===1)return 1-Math.exp(-x*w)*(1+x*w);{let b=-x*(c-Math.sqrt(c*c-1)),S=-x*(c+Math.sqrt(c*c-1)),y=S/(S-b),A=-b/(S-b);return 1-y*Math.exp(b*w)-A*Math.exp(S*w)}}}function h(w){if(!p)return;f===null&&(f=w);let b=(w-f)/1e3;if(b>=d){t.style[r]=`${a}${s}`,p=!1;return}let S=C(b),y=o+(a-o)*S;t.style[r]=`${y}${s}`,u=requestAnimationFrame(h)}return u=requestAnimationFrame(h),{stop:()=>{p=!1,u&&cancelAnimationFrame(u)},isRunning:()=>p}}function $a(t,e,r,o=20){let a=tt(t,o),s=pe(t);return`@keyframes springAnimation {
${a.map(({t:n,value:l},f)=>{let u=Math.round(n/s*100),p=e+(r-e)*l;return`  ${u}% { transform: translateX(${p}px); }`}).join(`
`)}
}`}function mr(t,e){let r=Math.round(50+t*450),o=Math.round(5+(1-e)*45);return{stiffness:r,damping:o}}function cr(t,e){let r=Math.max(0,Math.min(1,(t-50)/450)),o=Math.max(0,Math.min(1,1-(e-5)/45));return{x:r,y:o}}var at=class{constructor(e={}){this.options={devMode:!0,position:"bottom-right",...e},this.isOpen=!1,this.selectedAnimation=null,this.currentConfig={stiffness:170,damping:26,mass:1},this.elements={},this.isDragging=!1,this.dragTarget=null,this.handleTriggerClick=this.handleTriggerClick.bind(this),this.handleDocumentClick=this.handleDocumentClick.bind(this),this.handlePointerDown=this.handlePointerDown.bind(this),this.handlePointerMove=this.handlePointerMove.bind(this),this.handlePointerUp=this.handlePointerUp.bind(this)}init(){this.options.devMode&&(wt(),this.createDOM(),this.attachEventListeners(),this.render(),F.subscribe(()=>this.render()))}createDOM(){this.elements.container=document.createElement("div"),this.elements.container.className="spring-workbench",this.elements.trigger=document.createElement("button"),this.elements.trigger.className="sw-trigger",this.elements.trigger.setAttribute("aria-label","Open Spring Workbench"),this.elements.trigger.appendChild(K.settings({size:22})),this.elements.popover=this.createPopover(),this.elements.saveDialog=this.createSaveDialog(),this.elements.container.appendChild(this.elements.trigger),this.elements.container.appendChild(this.elements.popover),this.elements.container.appendChild(this.elements.saveDialog),document.body.appendChild(this.elements.container)}createPopover(){let e=document.createElement("div");e.className="sw-popover";let r=document.createElement("div");r.className="sw-list-view";let o=document.createElement("div");o.className="sw-popover-header";let a=document.createElement("h3");a.textContent="Spring Animations";let s=document.createElement("button");s.className="sw-popover-close",s.appendChild(K.close({size:16})),s.onclick=()=>this.close(),o.appendChild(a),o.appendChild(s);let i=document.createElement("div");i.className="sw-list",this.elements.list=i,r.appendChild(o),r.appendChild(i),this.elements.listView=r;let n=document.createElement("div");n.className="sw-editor-view",n.style.display="none";let l=this.createRigContent();return n.appendChild(l),this.elements.editorView=n,e.appendChild(r),e.appendChild(n),e}createRigContent(){let e=document.createElement("div");e.className="sw-rig-content";let r=document.createElement("div");r.className="sw-rig-header";let o=document.createElement("h3");o.textContent="Configure Spring",this.elements.rigTitle=o;let a=document.createElement("div");a.className="sw-rig-header-actions";let s=document.createElement("button");s.className="sw-preview-btn",s.appendChild(K.play({size:14})),s.appendChild(document.createTextNode("Preview")),s.onclick=()=>this.playPreview();let i=document.createElement("button");i.className="sw-popover-close",i.appendChild(K.close({size:16})),i.onclick=()=>this.closeRig(),a.appendChild(s),a.appendChild(i),r.appendChild(o),r.appendChild(a);let n=document.createElement("div");n.className="sw-duration";let l=document.createElement("div");l.className="sw-duration-label",l.appendChild(K.clock({size:16})),l.appendChild(document.createTextNode(" Duration"));let f=document.createElement("input");f.type="text",f.className="sw-duration-value sw-control-input",f.value="667",f.dataset.param="duration",this.elements.durationValue=f;let u=0,p=0,d=!1;f.addEventListener("mousedown",T=>{if(document.activeElement===f)return;u=T.clientX,p=parseFloat(f.value)||0,d=!0,f.style.cursor="ew-resize";let P=Ie=>{if(!d)return;let de=Ie.clientX-u,xr=Math.max(50,Math.round(p+de*.5));f.value=xr,this.updateDurationFromMs(xr)},q=()=>{d=!1,f.style.cursor="",document.removeEventListener("mousemove",P),document.removeEventListener("mouseup",q)};document.addEventListener("mousemove",P),document.addEventListener("mouseup",q)}),f.addEventListener("change",T=>{let P=parseFloat(T.target.value)||0;this.updateDurationFromMs(Math.max(50,P))}),f.addEventListener("keydown",T=>{if(T.key==="ArrowUp"){T.preventDefault();let P=parseFloat(f.value)||0;f.value=P+10,this.updateDurationFromMs(P+10)}else if(T.key==="ArrowDown"){T.preventDefault();let P=parseFloat(f.value)||0;f.value=Math.max(50,P-10),this.updateDurationFromMs(Math.max(50,P-10))}});let m=document.createElement("div");m.style.display="flex",m.style.alignItems="center",m.style.gap="4px";let x=document.createElement("span");x.textContent="ms",x.style.color="var(--sw-text-secondary)",x.style.fontSize="14px",m.appendChild(f),m.appendChild(x),n.appendChild(l),n.appendChild(m);let c=document.createElement("div");c.className="sw-visualization";let C=document.createElement("canvas");C.className="sw-canvas",this.elements.canvas=C;let h=document.createElement("div");h.className="sw-drag-circle",h.dataset.dragType="circle",this.elements.dragCircle=h;let w=document.createElement("div");w.className="sw-slider-track";let b=document.createElement("div");b.className="sw-slider-thumb",b.dataset.dragType="slider",this.elements.sliderThumb=b,w.appendChild(b),c.appendChild(C),c.appendChild(h),c.appendChild(w),this.elements.visualization=c;let S=document.createElement("div");S.className="sw-controls";let y=this.createControlRow("Stiffness","stiffness",170);this.elements.stiffnessInput=y.querySelector("input");let A=this.createControlRow("Damping","damping",26);this.elements.dampingInput=A.querySelector("input");let D=this.createControlRow("Mass","mass",1,!0);this.elements.massInput=D.querySelector("input");let v=document.createElement("button");return v.className="sw-save-btn",v.appendChild(K.save({size:16})),v.appendChild(document.createTextNode(" Save as Preset")),v.onclick=()=>this.openSaveDialog(),S.appendChild(y),S.appendChild(A),S.appendChild(D),S.appendChild(v),e.appendChild(r),e.appendChild(n),e.appendChild(c),e.appendChild(S),e}createRig(){let e=document.createElement("div");return e.className="sw-rig",e.style.display="none",e}createControlRow(e,r,o,a=!1){let s=document.createElement("div");s.className="sw-control-row";let i=document.createElement("label");i.className="sw-control-label",i.textContent=e;let n=document.createElement("input");if(n.type="text",n.className="sw-control-input"+(a?" readonly":""),n.value=o,n.readOnly=a,n.dataset.param=r,!a){let l=0,f=0,u=!1;n.addEventListener("mousedown",p=>{if(document.activeElement===n)return;l=p.clientX,f=parseFloat(n.value)||0,u=!0,n.style.cursor="ew-resize";let d=x=>{if(!u)return;let c=x.clientX-l,h=Math.max(1,Math.round(f+c*(r==="stiffness"?2:.5)));n.value=h,this.updateConfig(r,h)},m=()=>{u=!1,n.style.cursor="",document.removeEventListener("mousemove",d),document.removeEventListener("mouseup",m)};document.addEventListener("mousemove",d),document.addEventListener("mouseup",m)}),n.addEventListener("change",p=>{let d=parseFloat(p.target.value)||0;this.updateConfig(r,Math.max(1,d))}),n.addEventListener("keydown",p=>{if(p.key==="ArrowUp"){p.preventDefault();let d=parseFloat(n.value)||0,m=r==="stiffness"?10:1;n.value=d+m,this.updateConfig(r,d+m)}else if(p.key==="ArrowDown"){p.preventDefault();let d=parseFloat(n.value)||0,m=r==="stiffness"?10:1;n.value=Math.max(1,d-m),this.updateConfig(r,Math.max(1,d-m))}})}return s.appendChild(i),s.appendChild(n),s}createSaveDialog(){let e=document.createElement("div");e.className="sw-save-dialog";let r=document.createElement("div");r.className="sw-save-dialog-content";let o=document.createElement("h4");o.textContent="Save as Preset";let a=document.createElement("input");a.type="text",a.className="sw-save-dialog-input",a.placeholder="Enter preset name...",this.elements.saveInput=a;let s=document.createElement("div");s.className="sw-save-dialog-actions";let i=document.createElement("button");i.className="sw-dialog-btn secondary",i.textContent="Cancel",i.onclick=()=>this.closeSaveDialog();let n=document.createElement("button");return n.className="sw-dialog-btn primary",n.textContent="Save",n.onclick=()=>this.savePreset(),s.appendChild(i),s.appendChild(n),r.appendChild(o),r.appendChild(a),r.appendChild(s),e.appendChild(r),e.onclick=l=>{l.target===e&&this.closeSaveDialog()},a.onkeydown=l=>{l.key==="Enter"&&this.savePreset(),l.key==="Escape"&&this.closeSaveDialog()},e}makeRigDraggable(e,r){let o=!1,a,s,i,n;e.addEventListener("mousedown",l=>{if(l.target.closest("button"))return;o=!0,a=l.clientX,s=l.clientY;let f=r.getBoundingClientRect();i=window.innerWidth-f.right,n=window.innerHeight-f.bottom,document.body.style.userSelect="none"}),document.addEventListener("mousemove",l=>{if(!o)return;let f=l.clientX-a,u=l.clientY-s;r.style.right=Math.max(20,i-f)+"px",r.style.bottom=Math.max(80,n-u)+"px"}),document.addEventListener("mouseup",()=>{o=!1,document.body.style.userSelect=""})}attachEventListeners(){this.elements.trigger.addEventListener("click",this.handleTriggerClick),document.addEventListener("click",this.handleDocumentClick),this.elements.visualization.addEventListener("pointerdown",this.handlePointerDown),document.addEventListener("pointermove",this.handlePointerMove),document.addEventListener("pointerup",this.handlePointerUp)}handleTriggerClick(e){e.stopPropagation(),this.toggle()}handleDocumentClick(e){if(!this.isOpen)return;let r=this.elements.container;r&&(r.contains(e.target)||this.elements.trigger&&this.elements.trigger.contains(e.target)||this.close())}handlePointerDown(e){let r=e.target;r.dataset.dragType==="circle"?(this.isDragging=!0,this.dragTarget="circle",r.classList.add("dragging"),r.setPointerCapture(e.pointerId)):r.dataset.dragType==="slider"&&(this.isDragging=!0,this.dragTarget="slider",r.classList.add("dragging"),r.setPointerCapture(e.pointerId))}handlePointerMove(e){if(!this.isDragging)return;let r=this.elements.visualization.getBoundingClientRect();if(this.dragTarget==="circle"){let o=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),a=Math.max(0,Math.min(1,(e.clientY-r.top)/(r.height-60))),s=mr(o,a);this.updateConfig("stiffness",s.stiffness),this.updateConfig("damping",s.damping)}else if(this.dragTarget==="slider"){let a=this.elements.visualization.querySelector(".sw-slider-track").getBoundingClientRect(),s=Math.max(0,Math.min(1,(e.clientX-a.left)/a.width));this.elements.sliderThumb.style.left=s*100+"%";let i=Math.round(50+s*450);this.updateConfig("stiffness",i)}}handlePointerUp(e){this.isDragging&&(this.isDragging=!1,this.dragTarget==="circle"?this.elements.dragCircle.classList.remove("dragging"):this.dragTarget==="slider"&&this.elements.sliderThumb.classList.remove("dragging"),this.dragTarget=null)}toggle(){this.isOpen?this.close():this.open()}open(){this.isOpen=!0;let e=this.elements.trigger.getBoundingClientRect(),r=this.elements.popover,o=this.elements.listView;this.elements.trigger.style.visibility="hidden",this.elements.trigger.style.opacity="0",this.elements.trigger.style.pointerEvents="none";let a=20,s=20;r.style.position="fixed",r.style.width=e.width+"px",r.style.height=e.height+"px",r.style.bottom=a+"px",r.style.right=s+"px",r.style.borderRadius="50%",r.style.opacity="1",r.style.display="flex",r.style.overflow="hidden",o&&(o.style.opacity="0",o.style.transform="translateY(20px)"),r.offsetHeight,requestAnimationFrame(()=>{let l=a,f=s;r.style.transition="width 0.4s cubic-bezier(0.4, 0, 0.2, 1), height 0.4s cubic-bezier(0.4, 0, 0.2, 1), border-radius 0.4s cubic-bezier(0.4, 0, 0.2, 1)",r.style.width="320px",r.style.height="500px",r.style.borderRadius="var(--sw-radius-lg)",setTimeout(()=>{o&&(o.style.transition="opacity 0.1s ease-out, transform 0.1s ease-out",o.style.opacity="1",o.style.transform="translateY(0)",this.animateListItems())},100)}),this.elements.trigger.classList.add("active"),this.render(),setTimeout(()=>{r.classList.add("open")},0)}close(){this.isOpen=!1;let e=this.elements.popover,r=this.elements.trigger.getBoundingClientRect(),o=this.elements.listView,a=this.elements.editorView;if(a&&a.style.display!=="none"){this.closeRig(),setTimeout(()=>this.close(),400);return}o&&(o.style.transition="opacity 0.1s ease-out, transform 0.1s ease-out",o.style.opacity="0",o.style.transform="translateY(20px)");let s=20,i=20,n=400;setTimeout(()=>{this.elements.trigger.style.visibility="visible",this.elements.trigger.style.transformOrigin="top left",this.elements.trigger.style.transform="scale(1.4)",this.elements.trigger.style.transition="opacity 0.3s ease-out, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.35s",this.elements.trigger.style.opacity="0",this.elements.trigger.style.pointerEvents="auto",e.style.transition="width 0.4s cubic-bezier(0.4, 0, 0.2, 1), height 0.4s cubic-bezier(0.4, 0, 0.2, 1), border-radius 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease-out",e.style.width=r.width+"px",e.style.height=r.height+"px",e.style.borderRadius="50%",e.style.opacity="0",requestAnimationFrame(()=>{this.elements.trigger.style.opacity="1",this.elements.trigger.style.transform="scale(1)"}),setTimeout(()=>{e.classList.remove("open"),e.style.display="none",e.style.transition="",e.style.width="",e.style.height="",e.style.borderRadius="",e.style.opacity="",this.elements.trigger.style.transition="",this.elements.trigger.style.transform="",this.elements.trigger.style.transformOrigin="",o&&(o.style.transition="",o.style.opacity="",o.style.transform="")},n)},100),this.elements.trigger.classList.remove("active")}closeRig(){let e=this.elements.popover,r=this.elements.listView,o=this.elements.editorView;o&&(o.style.transition="opacity 0.2s ease-out, transform 0.2s ease-out",o.style.opacity="0",o.style.transform="translateX(20px)"),setTimeout(()=>{e.style.transition="width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",e.style.width="320px",o&&(o.style.display="none",o.style.transition="",o.style.opacity="",o.style.transform=""),r&&(r.style.display="flex",r.style.opacity="0",r.style.transform="translateX(-20px)",r.style.transition="opacity 0.3s ease-out 0.2s, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.2s",requestAnimationFrame(()=>{r.style.opacity="1",r.style.transform="translateX(0)"})),e.style.transition=""},200),this.selectedAnimation=null}openRig(e,r="Configure Spring"){this.currentConfig={...e},this.elements.rigTitle&&(this.elements.rigTitle.textContent=r);let o=this.elements.popover,a=this.elements.listView,s=this.elements.editorView,i=o.getBoundingClientRect(),n=340;a&&(a.style.transition="opacity 0.2s ease-out, transform 0.2s ease-out",a.style.opacity="0",a.style.transform="translateX(-20px)"),setTimeout(()=>{o.style.transition="width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",o.style.width=n+"px",a&&(a.style.display="none"),s.style.display="flex",s.style.opacity="0",s.style.transform="translateX(20px)",s.style.transition="opacity 0.3s ease-out 0.2s, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.2s",requestAnimationFrame(()=>{s.style.opacity="1",s.style.transform="translateX(0)"}),this.updateRigUI(),this.drawCurve()},200)}updateConfig(e,r){this.currentConfig[e]=r,this.updateRigUI(),this.drawCurve(),this.selectedAnimation&&F.updateAnimation(this.selectedAnimation,this.currentConfig)}updateRigUI(){let{stiffness:e,damping:r,mass:o}=this.currentConfig;this.elements.stiffnessInput.value=e,this.elements.dampingInput.value=r,this.elements.massInput.value=o;let a=rt(this.currentConfig);this.elements.durationValue.value=a;let{x:s,y:i}=cr(e,r),n=this.elements.visualization.getBoundingClientRect();this.elements.dragCircle.style.left=s*100+"%",this.elements.dragCircle.style.top=i*100+"%";let l=(e-50)/450;this.elements.sliderThumb.style.left=l*100+"%"}updateDurationFromMs(e){let r=e/1e3,{stiffness:o,damping:a,mass:s}=this.currentConfig,i=Math.sqrt(o/s),n=pe(this.currentConfig),l=a,f=r/n;f<1?l=Math.min(50,a*(1+(1-f)*.5)):l=Math.max(5,a*(1-(f-1)*.3)),this.updateConfig("damping",Math.round(l))}drawCurve(){let e=this.elements.canvas,r=e.getContext("2d"),o=e.parentElement.getBoundingClientRect();e.width=o.width*window.devicePixelRatio,e.height=o.height*window.devicePixelRatio,e.style.width=o.width+"px",e.style.height=o.height+"px",r.scale(window.devicePixelRatio,window.devicePixelRatio),r.clearRect(0,0,o.width,o.height),r.strokeStyle="#3d3d3d",r.lineWidth=1;let a=o.height/2;r.beginPath(),r.moveTo(0,a),r.lineTo(o.width,a),r.stroke();let s=tt(this.currentConfig,100);r.strokeStyle="#f5f5f5",r.lineWidth=2,r.lineCap="round",r.lineJoin="round",r.beginPath();let i=20,n=o.width-i*2,l=o.height-i*2;s.forEach((f,u)=>{let p=i+u/s.length*n,d=l*.4,m=a-(f.value-.5)*d*2;u===0?r.moveTo(p,m):r.lineTo(p,m)}),r.stroke()}playPreview(){let e=document.querySelector(".sw-preview-element");e||(e=document.createElement("div"),e.className="sw-preview-element",e.style.cssText=`
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
      `,document.body.appendChild(e)),e.style.transform="translate(-50%, -50%) scale(0)",requestAnimationFrame(()=>{ot(e,this.currentConfig,"transform",0,1,"");let{stiffness:r,damping:o,mass:a}=this.currentConfig;e.style.transition="none";let s=null,i=rt(this.currentConfig),n=l=>{s||(s=l);let f=l-s,u=Math.min(1,f/i),p=o/(2*Math.sqrt(r*a)),d=Math.sqrt(r/a),m;if(p<1){let x=d*Math.sqrt(1-p*p);m=1-Math.exp(-p*d*(f/1e3))*Math.cos(x*(f/1e3))}else m=1-Math.exp(-d*(f/1e3));e.style.transform=`translate(-50%, -50%) scale(${m})`,f<i?requestAnimationFrame(n):setTimeout(()=>{e.style.transition="opacity 0.3s",e.style.opacity="0",setTimeout(()=>{e.style.opacity="1",e.style.transform="translate(-50%, -50%) scale(0)",e.style.transition="none"},300)},200)};requestAnimationFrame(n)})}openSaveDialog(){this.elements.saveDialog.classList.add("open"),this.elements.saveInput.value="",this.elements.saveInput.focus()}closeSaveDialog(){this.elements.saveDialog.classList.remove("open")}savePreset(){let e=this.elements.saveInput.value.trim();if(!e){this.elements.saveInput.focus();return}F.saveAsPreset(e,this.currentConfig),this.closeSaveDialog(),this.render()}render(){if(!this.elements.list)return;this.elements.list.innerHTML="";let e=document.createElement("div");e.className="sw-list-section";let r=document.createElement("h4");r.className="sw-list-section-title",r.textContent="Presets",e.appendChild(r);let o=F.getAllPresets();Object.entries(o).forEach(([s,i])=>{let n=this.createListItem(s,i,"preset");e.appendChild(n)}),this.elements.list.appendChild(e);let a=F.getAnimations();if(a.length>0){let s=document.createElement("div");s.className="sw-list-section";let i=document.createElement("h4");i.className="sw-list-section-title",i.textContent="Animations",s.appendChild(i),a.forEach(n=>{let l=this.createListItem(n.id,n,"animation");s.appendChild(l)}),this.elements.list.appendChild(s)}}animateListItems(){let e=this.elements.list.querySelectorAll(".sw-list-item");if(e.length===0)return;e.forEach(a=>{a.style.opacity="0",a.style.transform="translateY(10px)"});let r=.3,o=r*.8;e.forEach((a,s)=>{let i=s*.05;dr(a,{opacity:[0,1]},{duration:o,delay:i,easing:[.4,0,.2,1]}),dr(a,{y:[10,0]},{duration:r,delay:i,easing:[.4,0,.2,1]})})}createListItem(e,r,o){let a=document.createElement("div");a.className="sw-list-item",a.style.cursor="pointer",this.selectedAnimation===e&&a.classList.add("selected");let s=document.createElement("div");s.className="sw-list-item-info",s.style.cursor="pointer",s.style.flex="1";let i=document.createElement("div");i.className="sw-list-item-name",i.textContent=r.name;let n=document.createElement("div");n.className="sw-list-item-desc",n.textContent=`S: ${r.stiffness} D: ${r.damping}`,s.appendChild(i),s.appendChild(n);let l=document.createElement("div");l.className="sw-list-item-actions";let f=document.createElement("button");if(f.className="sw-list-item-btn",f.appendChild(K.pencil({size:14})),f.onclick=p=>{p.stopPropagation(),this.startRename(a,e,r,o)},l.appendChild(f),r.isCustom){let p=document.createElement("button");p.className="sw-list-item-btn delete",p.appendChild(K.trash({size:14})),p.onclick=d=>{d.stopPropagation(),F.deletePreset(e)},l.appendChild(p)}a.appendChild(s),a.appendChild(l),l.style.pointerEvents="auto";let u=p=>{p.target.closest(".sw-list-item-btn")||(p.stopPropagation(),this.selectedAnimation=o==="animation"?e:null,this.openRig({stiffness:r.stiffness,damping:r.damping,mass:r.mass||1},r.name),this.render())};return a.addEventListener("click",u),a}startRename(e,r,o,a){let s=e.querySelector(".sw-list-item-info"),i=o.name;s.innerHTML="";let n=document.createElement("input");n.type="text",n.className="sw-rename-input",n.value=i,n.onkeydown=l=>{if(l.key==="Enter"){let f=n.value.trim();f&&f!==i&&(a==="preset"?F.renamePreset(r,f):F.updateAnimation(r,{name:f})),this.render()}else l.key==="Escape"&&this.render()},n.onblur=()=>{let l=n.value.trim();l&&l!==i&&(a==="preset"?F.renamePreset(r,l):F.updateAnimation(r,{name:l})),this.render()},s.appendChild(n),n.focus(),n.select()}destroy(){this.elements.trigger.removeEventListener("click",this.handleTriggerClick),document.removeEventListener("click",this.handleDocumentClick),document.removeEventListener("pointermove",this.handlePointerMove),document.removeEventListener("pointerup",this.handlePointerUp),this.elements.container.remove();let e=document.getElementById("spring-workbench-styles");e&&e.remove()}};var ee=null;function _a(t={}){return ee?(console.warn("Spring Workbench already initialized"),ee):(ee=new at(t),ee.init(),t.animations&&Array.isArray(t.animations)&&t.animations.forEach(e=>{F.registerAnimation(e.id,e)}),ee)}function Ya(){return ee}function Za(){ee&&(ee.destroy(),ee=null)}function Ja(t,e){F.registerAnimation(t,e)}function Qa(t){return F.getAnimation(t)}function es(t){return F.getPreset(t)}function ts(t,e,r,o,a,s=""){let i=e;return typeof e=="string"&&(i=F.getPreset(e)||F.getAnimation(e),!i)?(console.error(`Spring config not found: ${e}`),null):ot(t,i,r,o,a,s)}var Di={init:_a,getInstance:Ya,destroy:Za,registerAnimation:Ja,getAnimation:Qa,getPreset:es,animate:ts,registry:F,DEFAULT_PRESETS:nt};return ls(Vi);})();
/*! Bundled license information:

lucide/dist/esm/createElement.js:
  (**
   * @license lucide v0.460.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/defaultAttributes.js:
  (**
   * @license lucide v0.460.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/chevron-down.js:
  (**
   * @license lucide v0.460.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/chevron-right.js:
  (**
   * @license lucide v0.460.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/clock.js:
  (**
   * @license lucide v0.460.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/pause.js:
  (**
   * @license lucide v0.460.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/pencil.js:
  (**
   * @license lucide v0.460.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/play.js:
  (**
   * @license lucide v0.460.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/rotate-ccw.js:
  (**
   * @license lucide v0.460.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/save.js:
  (**
   * @license lucide v0.460.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/settings.js:
  (**
   * @license lucide v0.460.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/trash-2.js:
  (**
   * @license lucide v0.460.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/icons/x.js:
  (**
   * @license lucide v0.460.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)

lucide/dist/esm/lucide.js:
  (**
   * @license lucide v0.460.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)
*/
