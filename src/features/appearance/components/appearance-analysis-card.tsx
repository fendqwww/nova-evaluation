"use client";

import { Sparkles, ScanFace } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";
import type { AppearanceAnalysis, AppearanceZoneState } from "@/ai/types";

/** The list blocks, in the order they read best: what's good → what to do. */
const ANALYSIS_SECTIONS = [
  { key: "strengths", label: "Сильные стороны" },
  { key: "weaknesses", label: "Точки роста" },
  { key: "recommendations", label: "Рекомендации" },
  { key: "care", label: "Уход" },
  { key: "style", label: "Стиль" },
] as const;

/**
 * Zone chips. Three states, and the label always carries the meaning — colour
 * only reinforces it, so the row still reads for a colourblind user and in the
 * app's light mode.
 */
const ZONE_STATE: Record<AppearanceZoneState, { label: string; className: string }> = {
  good: { label: "хорошо", className: "bg-positive-muted text-positive" },
  neutral: { label: "норма", className: "bg-fill-muted text-muted-foreground" },
  attention: { label: "внимание", className: "bg-warning-muted text-warning" },
};

/**
 * One photo's AI reading, rendered as cards rather than a wall of text — the
 * same rule the Coach's answers follow.
 *
 * Shared by the viewer and the add-photo modal so an analysis looks identical
 * whether it was just produced or loaded from a row.
 */
export function AppearanceAnalysisCard({ analysis }: { analysis: AppearanceAnalysis }) {
  const { face, zones } = analysis;
  const hasFace =
    face.shape !== "" ||
    face.proportions !== "" ||
    face.symmetry !== "" ||
    face.features.length > 0;

  return (
    <Card elevation="accent">
      <div className="flex flex-col gap-4 p-3.5">
        <div className="flex items-center gap-2 text-accent">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          <span className="text-caption font-medium">
            Уверенность анализа — {Math.round(analysis.confidence * 100)}%
          </span>
        </div>

        {!analysis.isAnalyzable && (
          <p className="text-caption text-muted-foreground">
            На фото не получилось разглядеть то, что было выбрано в «Что на фото».
            Проверьте, что зона выбрана верно, и попробуйте более светлый и чёткий
            снимок.
          </p>
        )}

        {/* Facial structure. First, because every style note below refers back
            to it. */}
        {hasFace && (
          <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-surface-inset p-3">
            <div className="flex items-center gap-2">
              <ScanFace className="h-3.5 w-3.5 shrink-0 text-tint-purple" />
              <p className="text-caption font-medium text-foreground">Черты лица</p>
            </div>

            <dl className="flex flex-col gap-2">
              {face.shape && <FaceRow term="Форма" value={face.shape} />}
              {face.proportions && <FaceRow term="Пропорции" value={face.proportions} />}
              {face.symmetry && <FaceRow term="Симметрия" value={face.symmetry} />}
            </dl>

            {face.features.length > 0 && (
              <ul className="flex flex-col gap-1 border-t border-border pt-2.5">
                {face.features.map((feature) => (
                  <li key={feature} className="text-caption text-muted-foreground">
                    {feature}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Per-zone readings */}
        {zones.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-caption font-medium text-foreground">По зонам</p>
            <ul className="flex flex-col gap-2">
              {zones.map((zone) => {
                const state = ZONE_STATE[zone.state];
                return (
                  <li key={`${zone.zone}-${zone.note}`} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-caption font-medium text-foreground">
                        {zone.zone}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-label",
                          state.className,
                        )}
                      >
                        {state.label}
                      </span>
                    </div>
                    <p className="text-caption text-muted-foreground">{zone.note}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {ANALYSIS_SECTIONS.map(({ key, label }) => {
          const items = analysis[key];
          if (items.length === 0) return null;

          return (
            <div key={key} className="flex flex-col gap-1">
              <p className="text-caption font-medium text-foreground">{label}</p>
              <ul className="flex flex-col gap-1">
                {items.map((item) => (
                  <li key={item} className="text-caption text-muted-foreground">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        <p className="text-label text-subtle-foreground">
          Наблюдения по фото, а не медицинское заключение.
        </p>
      </div>
    </Card>
  );
}

function FaceRow({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-[5.5rem] shrink-0 text-caption text-subtle-foreground">{term}</dt>
      <dd className="text-caption text-muted-foreground">{value}</dd>
    </div>
  );
}
