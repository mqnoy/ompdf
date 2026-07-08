import { json } from "@sveltejs/kit";
const VALID_ALGORITHMS = [
  "standard",
  "condense",
  "mutool",
  "ghostscript",
  "smallest",
  "photon"
];
const VALID_QUALITIES = ["low", "medium", "high", "maximum"];
const VALID_FORMATS = ["jpeg", "png"];
const VALID_GHOSTSCRIPT_PRESETS = ["screen", "ebook", "printer", "prepress", "default"];
const VALID_GHOSTSCRIPT_COMPATIBILITY_LEVELS = ["1.4", "1.5", "1.6", "1.7"];
function formString(form, key) {
  const value = form.get(key);
  return typeof value === "string" && value.trim().length > 0 ? value : void 0;
}
function formBoolean(form, key) {
  const value = form.get(key);
  if (value === null) {
    return void 0;
  }
  if (typeof value !== "string") {
    return void 0;
  }
  return value === "on" || value === "true" || value === "1";
}
function parseEnum(form, key, allowed, fallback) {
  const value = formString(form, key);
  if (!value || !allowed.includes(value)) {
    return fallback;
  }
  return value;
}
function parseOptionalEnum(form, key, allowed, errors, message) {
  const value = formString(form, key);
  if (!value) {
    return void 0;
  }
  if (!allowed.includes(value)) {
    errors.push({ code: "INVALID_OPTION", message });
    return void 0;
  }
  return value;
}
function parseNumberInRange(form, key, min, max, errors, message) {
  const value = formString(form, key);
  if (!value) {
    return void 0;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < min || numeric > max) {
    errors.push({ code: "INVALID_NUMBER", message });
    return void 0;
  }
  return numeric;
}
function createSafeFilename(filename) {
  const fallback = "document.pdf";
  const safe = (filename ?? fallback).replace(/[^a-zA-Z0-9._-]/g, "_");
  if (safe.toLowerCase().endsWith(".pdf")) {
    return safe;
  }
  return `${safe}.pdf`;
}
function errorResponse(status, code, message, details) {
  return json(
    {
      error: {
        code,
        message,
        ...details ? { details } : {}
      }
    },
    { status }
  );
}
const POST = async ({ request }) => {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return errorResponse(415, "UNSUPPORTED_MEDIA_TYPE", "Expected multipart/form-data");
  }
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return errorResponse(400, "MISSING_FILE", "Upload a PDF file to compress");
  }
  if (file.size === 0) {
    return errorResponse(400, "EMPTY_FILE", "The uploaded PDF is empty");
  }
  const filename = createSafeFilename(file.name);
  const isPdfByName = filename.toLowerCase().endsWith(".pdf");
  const isPdfByType = file.type === "application/pdf" || file.type === "";
  if (!isPdfByName || !isPdfByType) {
    return errorResponse(400, "INVALID_FILE_TYPE", "Only PDF uploads are supported");
  }
  const errors = [];
  const algorithm = parseEnum(form, "algorithm", VALID_ALGORITHMS, "photon");
  const quality = parseEnum(form, "quality", VALID_QUALITIES, "medium");
  const photonFormat = parseEnum(form, "photonFormat", VALID_FORMATS, "jpeg");
  const ghostscriptPreset = parseOptionalEnum(
    form,
    "ghostscriptPreset",
    VALID_GHOSTSCRIPT_PRESETS,
    errors,
    "ghostscriptPreset must be one of screen, ebook, printer, prepress, or default"
  );
  const ghostscriptCompatibilityLevel = parseOptionalEnum(
    form,
    "ghostscriptCompatibilityLevel",
    VALID_GHOSTSCRIPT_COMPATIBILITY_LEVELS,
    errors,
    "ghostscriptCompatibilityLevel must be one of 1.4, 1.5, 1.6, or 1.7"
  );
  const photonDpi = parseNumberInRange(
    form,
    "photonDpi",
    36,
    600,
    errors,
    "photonDpi must be between 36 and 600"
  );
  const photonQuality = parseNumberInRange(
    form,
    "photonQuality",
    1,
    100,
    errors,
    "photonQuality must be between 1 and 100"
  );
  const colorImageResolution = parseNumberInRange(
    form,
    "ghostscriptColorImageResolution",
    36,
    1200,
    errors,
    "ghostscriptColorImageResolution must be between 36 and 1200"
  );
  const grayImageResolution = parseNumberInRange(
    form,
    "ghostscriptGrayImageResolution",
    36,
    1200,
    errors,
    "ghostscriptGrayImageResolution must be between 36 and 1200"
  );
  const monoImageResolution = parseNumberInRange(
    form,
    "ghostscriptMonoImageResolution",
    36,
    2400,
    errors,
    "ghostscriptMonoImageResolution must be between 36 and 2400"
  );
  if (errors.length > 0) {
    return errorResponse(400, "INVALID_OPTIONS", "One or more compression options are invalid", errors);
  }
  const options = {
    algorithm,
    quality,
    filename,
    removeMetadata: formBoolean(form, "removeMetadata") ?? false,
    optimizeImages: formBoolean(form, "optimizeImages") ?? true,
    photon: {
      dpi: photonDpi,
      format: photonFormat,
      quality: photonQuality
    },
    ghostscript: {
      preset: ghostscriptPreset,
      compatibilityLevel: ghostscriptCompatibilityLevel,
      colorImageResolution,
      grayImageResolution,
      monoImageResolution,
      downsampleImages: formBoolean(form, "ghostscriptDownsampleImages")
    }
  };
  try {
    const { compressPdf } = await import("ompdf");
    const input = Buffer.from(await file.arrayBuffer());
    const { data, stats } = await compressPdf(input, options);
    const body = new ArrayBuffer(data.byteLength);
    new Uint8Array(body).set(data);
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": data.byteLength.toString(),
        "Content-Disposition": `attachment; filename="${stats.outputFilename}"`,
        "X-Original-Size": stats.originalSize.toString(),
        "X-Compressed-Size": stats.compressedSize.toString(),
        "X-Compression-Ratio": stats.compressionRatio,
        "X-Compression-Algorithm": stats.algorithm,
        "X-Pages-Processed": stats.pagesProcessed.toString(),
        "X-Processing-Time-Ms": stats.processingTimeMs.toString(),
        "Access-Control-Expose-Headers": [
          "Content-Disposition",
          "X-Original-Size",
          "X-Compressed-Size",
          "X-Compression-Ratio",
          "X-Compression-Algorithm",
          "X-Pages-Processed",
          "X-Processing-Time-Ms"
        ].join(", ")
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PDF compression failed";
    return errorResponse(500, "COMPRESSION_FAILED", message);
  }
};
export {
  POST
};
