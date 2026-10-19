"use client";

import { useRef, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Stage, HeroScene, ParticleField, StaticHero } from "./components/webgl";
import { FilmGrain, BreathingVignette, AmbientGlow } from "./components/cinematic";
import { ScrollProgress } from "./components/ui/ScrollProgress";
import { SignInButton } from "./components/ui/SignInButton";
import { StoryChapter } from "./components/story/StoryChapter";
import {
  LeaveVisual,
  WaitVisual,
  ScanVisual,
  AlertVisual,
  QuietVisual,
} from "./components/story/ChapterVisuals";
import { LoginGateway } from "./components/story/LoginGateway";
import { PerspectiveSelector } from "./components/story/PerspectiveSelector";
import { SoundToggle } from "./components/story/SoundToggle";
import { CHAPTERS, type ChapterId } from "./components/story/data";
import { useChapterTracker } from "./components/hooks/useChapterTracker";
import { useReturningVisitor } from "./components/hooks/useReturningVisitor";
import { usePerformanceTier } from "./components/hooks/usePerformanceTier";

const VISUALS: Record<ChapterId, React.ReactNode> = {
  leave: <LeaveVisual />,
  wait: <WaitVisual />,
  scan: <ScanVisual />,
  alert: <AlertVisual />,
  quiet: <QuietVisual />,
};

export function HomeStoryClient() {
  const tier = usePerformanceTier();
  useChapterTracker();
  const returning = useReturningVisitor();

  useEffect(() => {
    document.body.classList.add("is-home");
    return () => {
      document.body.classList.remove("is-home");
    };
  }, []);

  return (
    <main data-home data-tier={tier} className="relative min-h-screen">
      <ScrollProgress />
      <FilmGrain />
      <BreathingVignette intensity={0.7} />
      <AmbientGlow />
      <SignInButton />
      {!returning && <IntroHero />}
      {CHAPTERS.map((chapter) => (
        <StoryChapter key={chapter.id} chapter={chapter} visual={VISUALS[chapter.id]} />
      ))}
      <LoginGateway />
      <PerspectiveSelector />
      <SoundToggle />
    </main>
  );
}

function IntroHero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const o1 = useTransform(scrollYProgress, [0, 0.35, 0.5], [1, 1, 0]);
  const o2 = useTransform(scrollYProgress, [0.4, 0.6, 0.75], [0, 1, 0]);
  const o3 = useTransform(scrollYProgress, [0.75, 0.9, 1], [0, 1, 1]);
  const y1 = useTransform(scrollYProgress, [0, 0.5], [0, -40]);
  const y2 = useTransform(scrollYProgress, [0.4, 0.75], [0, -40]);
  const y3 = useTransform(scrollYProgress, [0.75, 1], [0, -20]);

  return (
    <section ref={ref} className="relative" style={{ height: "200vh" }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <Stage fallback={<StaticHero accent="amber" />}>
          <HeroScene accent="amber" />
          <ParticleField accent="amber" />
        </Stage>
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-6">
          <motion.h1
            style={{ opacity: o1, y: y1 }}
            className="absolute max-w-3xl text-center font-serif text-4xl leading-tight text-[var(--home-text-primary)] md:text-6xl"
          >
            Every entrance.<br />Every exit.<br />Every story. Protected.
          </motion.h1>
          <motion.h1
            style={{ opacity: o2, y: y2 }}
            className="absolute max-w-3xl text-center font-serif text-4xl leading-tight text-[var(--home-text-primary)] md:text-6xl"
          >
            A gate.<br />A promise.<br />A campus that knows you.
          </motion.h1>
          <motion.h1
            style={{ opacity: o3, y: y3 }}
            className="absolute max-w-3xl text-center font-serif text-4xl leading-tight text-[var(--home-text-primary)] md:text-6xl"
          >
            Five stories.<br />One gate.<br />Scroll to begin.
          </motion.h1>
        </div>
      </div>
    </section>
  );
}
