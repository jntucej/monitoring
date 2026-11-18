"use client";

import { motion } from "framer-motion";
import { useNoMotion } from "../hooks/useNoMotion";

/**
 * StoryBand — the one-paragraph story of this campus.
 *
 * Sits between the Hero and LiveCountsStrip. No motion beyond a soft
 * fade-in on view. The text is the point: a plain, specific account of
 * what this campus is and why it needed this portal. Not a feature
 * list. Not a tagline. The story.
 */

export function StoryBand() {
  const reduced = useNoMotion();

  return (
    <section
      aria-label="Our story"
      className="mx-auto w-full max-w-3xl px-6 py-14"
    >
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 16 }}
        whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-2xl font-bold md:text-3xl">
          A campus that outgrew paper
        </h2>

        <div className="mt-6 space-y-4 text-base leading-relaxed text-[var(--home-text-secondary,var(--text-muted))] md:text-lg">
          <p>
            Jagtial is a district town in Telangana. The college sits on
            the edge of Nachupally, where the campus sprawls across four
            hostel blocks, two academic wings and a gate that does not
            close. Students walk in from 6 AM. Mess tokens get scanned
            three times a day. Wardens keep a register in a notebook and
            a file in a cupboard. When a parent calls asking where their
            child is, the answer is a phone chain: warden to hostel
            manager to operator, and back.
          </p>
          <p>
            This portal replaces that phone chain. Every scan, every
            pass, every leave and every mess bill lands in one place
            that the person who needs it can open in a browser or on a
            Telegram bot. A student sees their own attendance and fees.
            A parent sees their child's. A warden sees the hostel block
            without leaving the desk. An operator sees the gate without
            leaving the post.
          </p>
          <p>
            Nothing here is new technology. It is a database, a set of
            permissions, and a few cron jobs that run at 5 AM and 10 PM.
            The point was never the software. The point is that the
            people running this campus stopped keeping the records in
            their heads.
          </p>
        </div>
      </motion.div>
    </section>
  );
}
