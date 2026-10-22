"use client";

import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useTranslations } from "next-intl";
import { useRef } from "react";

function Word({ word, range, progress }: { word: string; range: [number, number]; progress: MotionValue<number> }) {
  const opacity = useTransform(progress, range, [0.14, 1]);
  return (
    <motion.span style={{ opacity }} className="inline-block">
      {word}&nbsp;
    </motion.span>
  );
}

/** Kalimat besar yang "menyala" kata demi kata mengikuti scroll — gaya halaman produk Apple. */
export function Statement() {
  const t = useTranslations("landing");
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.45"] });
  const words = t("statement").split(" ");

  return (
    <section className="mx-auto max-w-5xl px-5 py-32 sm:px-6 sm:py-48">
      <p
        ref={ref}
        className="text-[clamp(1.9rem,5vw,3.6rem)] leading-[1.12] font-semibold tracking-[-0.035em] text-ink"
      >
        {words.map((word, i) => (
          <Word
            key={i}
            word={word}
            progress={scrollYProgress}
            range={[i / words.length, (i + 1) / words.length]}
          />
        ))}
      </p>
    </section>
  );
}
