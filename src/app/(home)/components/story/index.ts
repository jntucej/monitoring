import { SCENES } from "./scenes/scenesData";
export type { Scene, SceneId, SceneAccent } from "./scenes/scenesData";
export { SceneFrame } from "./SceneFrame";
export { LoginGateway } from "./LoginGateway";
export { SoundToggle } from "./SoundToggle";
export { BootSequence } from "./BootSequence";
export { GateScene } from "./GateScene";
export { RequestScene, ApprovalScene, ScanScene, ShieldScene, WholeCampusScene } from "./scenes";

export const CHAPTERS = SCENES;
export type Chapter = import("./scenes/scenesData").Scene;
export type ChapterId = import("./scenes/scenesData").SceneId;
export type ChapterAccent = import("./scenes/scenesData").SceneAccent;
export type Perspective = string;
export const CHAPTER_BY_ID = Object.fromEntries(SCENES.map((c) => [c.id, c]));
export const PERSPECTIVE_ACCENT = Object.fromEntries(SCENES.map((c) => [c.id, c.accent]));
