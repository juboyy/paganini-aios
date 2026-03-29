// Core engine exports
export {
  createCharacter,
  getCharacterSprite,
  isReadingTool,
  updateCharacter,
} from './characters';
export type { GameLoopCallbacks } from './gameLoop';
export { startGameLoop } from './gameLoop';
export { OfficeState } from './officeState';
export type { DeleteButtonBounds, EditorRenderState, SelectionRenderState } from './renderer';
export {
  renderDeleteButton,
  renderFrame,
  renderGhostPreview,
  renderGridOverlay,
  renderScene,
  renderSelectionHighlight,
  renderTileGrid,
} from './renderer';

// Paganini-specific exports
export { PixelOffice } from './PixelOffice';
export type { PixelOfficeProps } from './PixelOffice';
export { useAgentSync } from './useAgentSync';
export type { AgentStatus, UseAgentSyncOptions } from './useAgentSync';
export { AGENT_CONFIGS, ALL_AGENT_IDS, getAgentConfig } from './agentMapping';
export type { AgentCharacterConfig, PaganiniAgentId } from './agentMapping';
export { DEFAULT_PAGANINI_LAYOUT } from './defaultLayout';
