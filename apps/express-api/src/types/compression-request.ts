export type CompressionAlgorithm =
  | 'standard'
  | 'condense'
  | 'mutool'
  | 'ghostscript'
  | 'smallest'
  | 'photon';

export type CompressionQuality = 'low' | 'medium' | 'high' | 'maximum';
export type ImageFormat = 'jpeg' | 'png';
export type GhostscriptPreset = 'screen' | 'ebook' | 'printer' | 'prepress' | 'default';
export type GhostscriptCompatibilityLevel = '1.4' | '1.5' | '1.6' | '1.7';

export interface CompressionRequestBody {
  algorithm: CompressionAlgorithm;
  quality?: CompressionQuality;
  removeMetadata?: boolean;
  optimizeImages?: boolean;
  photonDpi?: number;
  photonFormat?: ImageFormat;
  photonQuality?: number;
  ghostscriptPreset?: GhostscriptPreset;
  ghostscriptCompatibilityLevel?: GhostscriptCompatibilityLevel;
  ghostscriptColorImageResolution?: number;
  ghostscriptGrayImageResolution?: number;
  ghostscriptMonoImageResolution?: number;
  ghostscriptDownsampleImages?: boolean;
}
