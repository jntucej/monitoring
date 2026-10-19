"use client";

import { useEffect, useState } from "react";
import { SCENES, type SceneId } from "./components/story/scenes/scenesData";
import { SceneFrame } from "./components/story/SceneFrame";
import {
  RequestScene,
  ApprovalScene,
  ScanScene,
  ShieldScene,
  WholeCampusScene,
} from "./components/story/scenes";
import { BootSequence } from "./components/story/BootSequence";
import { GateScene } from "./components/story/GateScene";
import { LoginGateway } from "./components/story/LoginGateway";
import { SoundToggle } from "./components/story/SoundToggle";
import { FilmGrain, BreathingVignette, AmbientGlow } from "./components/cinematic";
import { ScrollProgress } from "./components/ui/ScrollProgress";
import { SignInButton } from "./components/ui/SignInButton";
import { GateBackdrop } from "./components/ui/GateBackdrop";
import { useSceneTracker } from "./components/hooks/useSceneTracker";
import { useReturningVisitor } from "./components/hooks/useReturningVisitor";
import { usePerformanceTier } from "./components/hooks/usePerformanceTier";
import { useLiveData } from "./components/hooks/useLiveData";
import { LiveStatePill } from "@/components/landing/LiveStatePill";

export function HomeStoryClient() {
  const tier = usePerformanceTier();
  useSceneTracker();
  const returning = useReturningVisitor();
  const live = useLiveData(25_000);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    document.body.classList.add("is-home");
    return () => document.body.classList.remove("is-home");
  }, []);

  const VISUALS: Record<SceneId, React.ReactNode> = {
    request: <RequestScene data={live} />,
    approval: <ApprovalScene />,
    scan: <ScanScene data={live} />,
    shield: <ShieldScene />,
    wholecampus: <WholeCampusScene data={live} />,
  };

  return (
    <main data-home data-tier={tier} className="relative min-h-screen bg-black text-white">
      {!returning && !booted && <BootSequence onDone={() => setBooted(true)} />}
      <GateBackdrop />
      <ScrollProgress />
      <FilmGrain />
      <BreathingVignette intensity={0.7} />
      <AmbientGlow />
      <SignInButton />
      <GateScene />
      {SCENES.map((scene) => (
        <SceneFrame key={scene.id} scene={scene} data={live} visual={VISUALS[scene.id]} />
      ))}
      <LoginGateway data={live} />
      <SoundToggle />
      <div className="fixed bottom-6 left-6 z-30 hidden md:block">
        <LiveStatePill />
      </div>
    </main>
  );
}
