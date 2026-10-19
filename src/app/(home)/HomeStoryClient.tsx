"use client";

import { useEffect, useState } from "react";
import { SCENES, type SceneId } from "./components/story/scenes";
import { SceneFrame } from "./components/story/SceneFrame";
import { RequestScene, ApprovalScene, ScanScene, ShieldScene, WholeCampusScene } from "./components/story/index";
import { BootSequence } from "./components/story/BootSequence";
import { GateScene } from "./components/story/GateScene";
import { LoginGateway } from "./components/story/LoginGateway";
import { PerspectiveSelector } from "./components/story/PerspectiveSelector";
import { SoundToggle } from "./components/story/SoundToggle";
import { FilmGrain, BreathingVignette, AmbientGlow } from "./components/cinematic";
import { ScrollProgress } from "./components/ui/ScrollProgress";
import { SignInButton } from "./components/ui/SignInButton";
import { useSceneTracker } from "./components/hooks/useSceneTracker";
import { useReturningVisitor } from "./components/hooks/useReturningVisitor";
import { usePerformanceTier } from "./components/hooks/usePerformanceTier";
import { LiveStatePill } from "@/components/landing/LiveStatePill";

const VISUALS: Record<SceneId, React.ReactNode> = {
  request:      <RequestScene />,
  approval:     <ApprovalScene />,
  scan:         <ScanScene />,
  shield:       <ShieldScene />,
  wholecampus:  <WholeCampusScene />,
};

export function HomeStoryClient() {
  const tier = usePerformanceTier();
  useSceneTracker();
  const returning = useReturningVisitor();
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    document.body.classList.add("is-home");
    return () => document.body.classList.remove("is-home");
  }, []);

  return (
    <main data-home data-tier={tier} className="relative min-h-screen">
      {!returning && !booted && <BootSequence onDone={() => setBooted(true)} />}
      <ScrollProgress />
      <FilmGrain />
      <BreathingVignette intensity={0.7} />
      <AmbientGlow />
      <SignInButton />
      {/* Scene 1 — The Gate (WebGL hero) */}
      <GateScene />
      {/* Scenes 2–6 — product capabilities */}
      {SCENES.map((scene) => (
        <SceneFrame key={scene.id} scene={scene} visual={VISUALS[scene.id]} />
      ))}
      {/* Scene 7 — Login */}
      <LoginGateway />
      <PerspectiveSelector />
      <SoundToggle />
      <div className="fixed bottom-6 left-6 z-30 hidden md:block">
        <LiveStatePill />
      </div>
    </main>
  );
}
