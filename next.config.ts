import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      /**
       * Raised for progress photos, and only for them.
       *
       * A photo is stored inline as a data: URI (this app has no object
       * storage — see the note on AppearancePhoto in schema.prisma), so
       * createPhotoAction carries roughly a megabyte of base64: the full image
       * is capped at 900 000 characters by its zod schema and the thumbnail at
       * 90 000. The 1 MB default would reject a photo the client had already
       * compressed correctly.
       *
       * The real ceiling is the schema, not this number. This only has to sit
       * comfortably above the largest payload those caps allow; anything bigger
       * is rejected by validation before it can reach a row.
       */
      bodySizeLimit: "3mb",
    },
  },
};

export default nextConfig;
