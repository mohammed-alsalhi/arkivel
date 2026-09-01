"use client";

import { useState } from "react";
import ReadingLevelButton from "./ReadingLevelButton";
import SpecialBlocksRenderer from "@/components/SpecialBlocksRenderer";
import GlossaryTooltipLayer from "@/components/GlossaryTooltipLayer";
import HeadingPermalinks from "@/components/HeadingPermalinks";

type Level = "standard" | "beginner" | "technical" | "eli5";

const LEVEL_BANNER: Record<Exclude<Level, "standard">, { label: string; color: string }> = {
  beginner: { label: "Beginner mode — simplified for easier reading", color: "bg-info-soft border-info-border text-info" },
  technical: { label: "Technical mode — expert depth and detail", color: "bg-special-soft border-special-border text-special" },
  eli5: { label: "ELI5 mode — explained like you're 5", color: "bg-success-soft border-success-border text-success" },
};

type Props = {
  articleId: string;
  originalHtml: string;
  dir?: string;
};

export default function ArticleBodyWithReadingLevel({ articleId, originalHtml, dir = "ltr" }: Props) {
  const [adaptedHtml, setAdaptedHtml] = useState<string | null>(null);
  const [activeLevel, setActiveLevel] = useState<Level>("standard");

  function handleLevelChange(html: string | null, level: Level) {
    setAdaptedHtml(html);
    setActiveLevel(level);
  }

  const displayHtml = adaptedHtml ?? originalHtml;

  return (
    <>
      {/* Reading level control — floats right inside the article body header */}
      <div className="flex justify-end mb-2">
        <ReadingLevelButton articleId={articleId} onLevelChange={handleLevelChange} />
      </div>

      {activeLevel !== "standard" && (
        <div className={`flex items-center justify-between mb-3 px-3 py-2 border rounded text-[11px] ${LEVEL_BANNER[activeLevel].color}`}>
          <span>
            <svg className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.347a3.75 3.75 0 01-5.304 0l-.35-.35z" />
            </svg>
            {LEVEL_BANNER[activeLevel].label}
          </span>
          <button
            onClick={() => handleLevelChange(null, "standard")}
            className="underline hover:no-underline"
          >
            Restore original
          </button>
        </div>
      )}

      <div id="article-content" dir={dir} className="relative">
        <SpecialBlocksRenderer html={displayHtml} />
        <GlossaryTooltipLayer />
        <HeadingPermalinks />
      </div>
    </>
  );
}
