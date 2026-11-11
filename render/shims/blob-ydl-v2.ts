// Blob storage for YDL-V2 (its own namespace, as on Val Town).
import { createBlobStore } from "./blob-store.ts";
export const blob = createBlobStore("ydl-v2");
