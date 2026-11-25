import { ManifestSchema, type Manifest } from './schema';
import { SAMPLE_MANIFEST } from './sample-manifest';

export interface LoadedManifest {
  manifest: Manifest;
  isSampleData: boolean;
  hasWebpAssets: boolean;
  errorReason: string | null;
}

const MANIFEST_URL = '/assets/manifest.json';

async function probeImageAssetsAvailable(heroPath: string, signal?: AbortSignal): Promise<boolean> {
  try {
    const res = await fetch(resolveAssetUrl(heroPath), { method: 'HEAD', signal });
    if (!res.ok) return false;
    const ct = res.headers.get('content-type') ?? '';
    return ct.startsWith('image/');
  } catch {
    return false;
  }
}

/**
 * Fetches and validates /assets/manifest.json with Zod.
 * Falls back cleanly to SAMPLE_MANIFEST if missing, unreachable, or invalid.
 */
export async function loadManifest(signal?: AbortSignal): Promise<LoadedManifest> {
  try {
    const response = await fetch(MANIFEST_URL, {
      signal,
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return {
        manifest: SAMPLE_MANIFEST,
        isSampleData: true,
        hasWebpAssets: false,
        errorReason: `HTTP ${response.status}`,
      };
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json') && !contentType.includes('text/plain')) {
      return {
        manifest: SAMPLE_MANIFEST,
        isSampleData: true,
        hasWebpAssets: false,
        errorReason: 'Invalid content-type',
      };
    }

    const raw: unknown = await response.json();
    const parsed = ManifestSchema.safeParse(raw);

    if (!parsed.success) {
      return {
        manifest: SAMPLE_MANIFEST,
        isSampleData: true,
        hasWebpAssets: false,
        errorReason: 'Schema validation failed',
      };
    }

    const hasWebpAssets = await probeImageAssetsAvailable(parsed.data.hero.cover, signal);

    return {
      manifest: parsed.data,
      isSampleData: false,
      hasWebpAssets,
      errorReason: null,
    };
  } catch {
    return {
      manifest: SAMPLE_MANIFEST,
      isSampleData: true,
      hasWebpAssets: false,
      errorReason: 'Fetch failed',
    };
  }
}

export function resolveAssetUrl(relativePath: string): string {
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://') || relativePath.startsWith('/')) {
    return relativePath;
  }
  return `/assets/${relativePath}`;
}
