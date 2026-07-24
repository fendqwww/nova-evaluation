import Image from "next/image";
import { cn } from "@/shared/lib/cn";

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}

export function Avatar({ src, name, size = 44, className }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div
      className={cn("relative shrink-0 overflow-hidden rounded-full ring-1 ring-white/10", className)}
      style={{ width: size, height: size }}
    >
      {src ? (
        // Telegram serves avatars from a CDN host that isn't known ahead of
        // time, so next/image's remotePatterns allow-list isn't workable
        // here — `unoptimized` still gets us the component's lazy-loading
        // and layout stability without requiring a fixed domain.
        <Image src={src} alt={name} fill unoptimized className="object-cover" />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center"
          style={{
            background:
              "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 55%, black))",
          }}
        >
          <span className="font-bold text-white" style={{ fontSize: size * 0.42 }}>
            {initial}
          </span>
        </div>
      )}
    </div>
  );
}
