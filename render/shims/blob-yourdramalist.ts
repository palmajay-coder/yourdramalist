// Blob storage for YourDramaList (its own namespace, as on Val Town).
import { createBlobStore } from "./blob-store.ts";
export const blob = createBlobStore("yourdramalist");
