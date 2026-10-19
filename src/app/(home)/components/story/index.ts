import { SCENES } from "./scenes/scenesData";
export type { Scene, SceneId, SceneAccent } from "./scenes/scenesData";
export { SceneFrame } from "./SceneFrame";
export { LoginGateway } from "./LoginGateway";
export { SoundToggle } from "./SoundToggle";
export { BootSequence } from "./BootSequence";
export { GateScene } from "./GateScene";
export { RequestScene, ApprovalScene, ScanScene, ShieldScene, WholeCampusScene } from "./scenes";

export const CHAPTERS = SCENES;
export type Chapter = any;
export type ChapterId = string;
export type ChapterAccent = string;
export type Perspective = string;
export const CHAPTER_BY_ID = {};
export const PERSPECTIVE_ACCENT = {};
