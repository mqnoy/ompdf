<script lang="ts">
  type CompressionStats = {
    originalSize: string;
    compressedSize: string;
    ratio: string;
    algorithm: string;
    pages: string;
    processingTime: string;
  };

  const algorithms = [
    { value: 'photon', label: 'Photon', description: 'Rasterizes pages; best for image-heavy PDFs.' },
    { value: 'smallest', label: 'Smallest', description: 'Tries multiple strategies and keeps the smallest output.' },
    { value: 'ghostscript', label: 'Ghostscript', description: 'WASM pdfwrite compression presets.' },
    { value: 'mutool', label: 'MuTool', description: 'MuPDF-based document cleaning.' },
    { value: 'standard', label: 'Standard', description: 'Balanced metadata and image optimization.' },
    { value: 'condense', label: 'Condense', description: 'More aggressive library-native compression.' }
  ];

  const qualities = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'maximum', label: 'Maximum' }
  ];

  let selectedAlgorithm = $state('photon');
  let selectedFileName = $state('No file selected');
  let pending = $state(false);
  let errorMessage = $state<string | null>(null);
  let stats = $state<CompressionStats | null>(null);
  let downloadName = $state<string | null>(null);

  const selectedAlgorithmDescription = $derived(
    algorithms.find((algorithm) => algorithm.value === selectedAlgorithm)?.description ?? ''
  );

  function formatBytes(value: string): string {
    const bytes = Number(value);

    if (!Number.isFinite(bytes)) {
      return value;
    }

    const units = ['B', 'KB', 'MB', 'GB'];
    let amount = bytes;
    let unitIndex = 0;

    while (amount >= 1024 && unitIndex < units.length - 1) {
      amount /= 1024;
      unitIndex += 1;
    }

    return `${amount.toFixed(amount >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  }

  function extractFilename(contentDisposition: string | null): string | null {
    if (!contentDisposition) {
      return null;
    }

    const match = /filename="?([^";]+)"?/i.exec(contentDisposition);
    return match?.[1] ?? null;
  }

  function updateFileName(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    selectedFileName = input.files?.[0]?.name ?? 'No file selected';
    stats = null;
    errorMessage = null;
    downloadName = null;
  }

  async function readError(response: Response): Promise<string> {
    const contentType = response.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      const body = (await response.json()) as { error?: { message?: string } };
      return body.error?.message ?? 'Compression failed';
    }

    return response.text();
  }

  async function handleSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();

    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);

    pending = true;
    errorMessage = null;
    stats = null;
    downloadName = null;

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const blob = await response.blob();
      const filename = extractFilename(response.headers.get('content-disposition')) ?? 'compressed.pdf';
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = objectUrl;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);

      downloadName = filename;
      stats = {
        originalSize: response.headers.get('x-original-size') ?? '',
        compressedSize: response.headers.get('x-compressed-size') ?? '',
        ratio: response.headers.get('x-compression-ratio') ?? '',
        algorithm: response.headers.get('x-compression-algorithm') ?? selectedAlgorithm,
        pages: response.headers.get('x-pages-processed') ?? '',
        processingTime: response.headers.get('x-processing-time-ms') ?? ''
      };
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Compression failed';
    } finally {
      pending = false;
    }
  }
</script>

<svelte:head>
  <title>ompdf Web UI</title>
  <meta
    name="description"
    content="Server-rendered SvelteKit interface for compressing PDFs with ompdf."
  />
</svelte:head>

<main class="page-shell">
  <section class="hero" aria-labelledby="page-title">
    <div>
      <p class="eyebrow">Svelte 5 SSR · ompdf</p>
      <h1 id="page-title">Compress PDFs from a local web UI</h1>
      <p class="hero-copy">
        Upload a PDF, choose a compression strategy, and let the SvelteKit server call the
        workspace <code>ompdf</code> package. The compression engine stays server-only.
      </p>
    </div>
    <div class="hero-card" aria-label="Runtime details">
      <span>SSR endpoint</span>
      <strong>/api/compress</strong>
      <small>Node adapter · multipart uploads · PDF download response</small>
    </div>
  </section>

  <section class="workspace" aria-label="PDF compression workspace">
    <form
      class="panel form-panel"
      action="/api/compress"
      method="post"
      enctype="multipart/form-data"
      onsubmit={handleSubmit}
    >
      <div class="section-heading">
        <span class="step">1</span>
        <div>
          <h2>Upload PDF</h2>
          <p>Plain form posts work without JavaScript; enhanced submissions show stats here.</p>
        </div>
      </div>

      <label class="file-drop" for="file">
        <input id="file" name="file" type="file" accept="application/pdf,.pdf" required onchange={updateFileName} />
        <span class="file-icon" aria-hidden="true">PDF</span>
        <span>
          <strong>{selectedFileName}</strong>
          <small>Choose a PDF document to compress</small>
        </span>
      </label>

      <div class="section-heading compact">
        <span class="step">2</span>
        <div>
          <h2>Compression strategy</h2>
          <p>{selectedAlgorithmDescription}</p>
        </div>
      </div>

      <div class="grid two">
        <label>
          <span>Algorithm</span>
          <select name="algorithm" bind:value={selectedAlgorithm}>
            {#each algorithms as algorithm}
              <option value={algorithm.value}>{algorithm.label}</option>
            {/each}
          </select>
        </label>

        <label>
          <span>Quality preset</span>
          <select name="quality" value="medium">
            {#each qualities as quality}
              <option value={quality.value}>{quality.label}</option>
            {/each}
          </select>
        </label>
      </div>

      <div class="toggles">
        <label class="checkbox-row">
          <input name="optimizeImages" type="checkbox" checked />
          <span>Optimize embedded images</span>
        </label>
        <label class="checkbox-row">
          <input name="removeMetadata" type="checkbox" />
          <span>Remove PDF metadata where supported</span>
        </label>
      </div>

      <details class="advanced" open={selectedAlgorithm === 'photon'}>
        <summary>Photon options</summary>
        <div class="grid three">
          <label>
            <span>DPI</span>
            <input name="photonDpi" type="number" min="36" max="600" value="150" />
          </label>
          <label>
            <span>Image format</span>
            <select name="photonFormat" value="jpeg">
              <option value="jpeg">JPEG</option>
              <option value="png">PNG</option>
            </select>
          </label>
          <label>
            <span>JPEG quality</span>
            <input name="photonQuality" type="number" min="1" max="100" value="85" />
          </label>
        </div>
      </details>

      <details class="advanced" open={selectedAlgorithm === 'ghostscript'}>
        <summary>Ghostscript options</summary>
        <div class="grid two">
          <label>
            <span>Preset</span>
            <select name="ghostscriptPreset">
              <option value="">Auto from quality</option>
              <option value="screen">Screen</option>
              <option value="ebook">Ebook</option>
              <option value="printer">Printer</option>
              <option value="prepress">Prepress</option>
              <option value="default">Default</option>
            </select>
          </label>
          <label>
            <span>Compatibility</span>
            <select name="ghostscriptCompatibilityLevel">
              <option value="">Default</option>
              <option value="1.4">PDF 1.4</option>
              <option value="1.5">PDF 1.5</option>
              <option value="1.6">PDF 1.6</option>
              <option value="1.7">PDF 1.7</option>
            </select>
          </label>
        </div>
        <div class="grid three">
          <label>
            <span>Color DPI</span>
            <input name="ghostscriptColorImageResolution" type="number" min="36" max="1200" placeholder="Auto" />
          </label>
          <label>
            <span>Grayscale DPI</span>
            <input name="ghostscriptGrayImageResolution" type="number" min="36" max="1200" placeholder="Auto" />
          </label>
          <label>
            <span>Mono DPI</span>
            <input name="ghostscriptMonoImageResolution" type="number" min="36" max="2400" placeholder="Auto" />
          </label>
        </div>
        <label class="checkbox-row inline">
          <input name="ghostscriptDownsampleImages" type="checkbox" />
          <span>Downsample images</span>
        </label>
      </details>

      <button class="primary-action" type="submit" disabled={pending}>
        {pending ? 'Compressing…' : 'Compress PDF'}
      </button>
    </form>

    <aside class="panel results-panel" aria-live="polite">
      <div class="section-heading">
        <span class="step">3</span>
        <div>
          <h2>Result</h2>
          <p>Compression stats appear after an enhanced upload completes.</p>
        </div>
      </div>

      {#if pending}
        <div class="status loading">
          <span class="spinner" aria-hidden="true"></span>
          <strong>Compressing your PDF on the server…</strong>
          <small>Large documents or WASM-backed algorithms can take a moment.</small>
        </div>
      {:else if errorMessage}
        <div class="status error">
          <strong>Compression failed</strong>
          <small>{errorMessage}</small>
        </div>
      {:else if stats}
        <div class="status success">
          <strong>Downloaded {downloadName}</strong>
          <small>Compression completed with {stats.algorithm}.</small>
        </div>

        <dl class="stats-grid">
          <div>
            <dt>Original size</dt>
            <dd>{formatBytes(stats.originalSize)}</dd>
          </div>
          <div>
            <dt>Compressed size</dt>
            <dd>{formatBytes(stats.compressedSize)}</dd>
          </div>
          <div>
            <dt>Reduction</dt>
            <dd>{stats.ratio}</dd>
          </div>
          <div>
            <dt>Pages</dt>
            <dd>{stats.pages || '—'}</dd>
          </div>
          <div>
            <dt>Processing time</dt>
            <dd>{stats.processingTime ? `${stats.processingTime} ms` : '—'}</dd>
          </div>
          <div>
            <dt>Algorithm</dt>
            <dd>{stats.algorithm}</dd>
          </div>
        </dl>
      {:else}
        <div class="status idle">
          <strong>Ready to compress</strong>
          <small>
            Pick a PDF and submit. If JavaScript is disabled, your browser will still receive the
            compressed PDF directly.
          </small>
        </div>
      {/if}
    </aside>
  </section>
</main>

<style>
  code {
    border-radius: 0.35rem;
    background: rgba(23, 32, 51, 0.08);
    padding: 0.12rem 0.35rem;
  }

  .page-shell {
    width: min(1180px, calc(100% - 32px));
    margin: 0 auto;
    padding: 48px 0;
  }

  .hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: 24px;
    align-items: stretch;
    margin-bottom: 28px;
  }

  .eyebrow {
    margin: 0 0 12px;
    color: #53637d;
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  h1,
  h2,
  p {
    margin-top: 0;
  }

  h1 {
    max-width: 760px;
    margin-bottom: 16px;
    color: #101827;
    font-size: clamp(2.4rem, 7vw, 5rem);
    line-height: 0.95;
    letter-spacing: -0.08em;
  }

  h2 {
    margin-bottom: 4px;
    color: #101827;
    font-size: 1rem;
  }

  .hero-copy {
    max-width: 760px;
    margin-bottom: 0;
    color: #53637d;
    font-size: 1.08rem;
    line-height: 1.7;
  }

  .hero-card,
  .panel {
    border: 1px solid rgba(126, 144, 172, 0.24);
    border-radius: 28px;
    background: rgba(255, 255, 255, 0.84);
    box-shadow: 0 24px 80px rgba(15, 23, 42, 0.08);
    backdrop-filter: blur(18px);
  }

  .hero-card {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    min-height: 220px;
    padding: 24px;
    background:
      radial-gradient(circle at top right, rgba(87, 120, 255, 0.26), transparent 40%),
      linear-gradient(135deg, #151d31, #263552);
    color: white;
  }

  .hero-card span,
  .hero-card small {
    color: rgba(255, 255, 255, 0.72);
  }

  .hero-card strong {
    margin: 8px 0;
    font-size: 1.5rem;
  }

  .workspace {
    display: grid;
    grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.65fr);
    gap: 24px;
    align-items: start;
  }

  .panel {
    padding: 26px;
  }

  .section-heading {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    margin-bottom: 20px;
  }

  .section-heading.compact {
    margin-top: 26px;
  }

  .section-heading p {
    margin-bottom: 0;
    color: #68758b;
    font-size: 0.92rem;
    line-height: 1.5;
  }

  .step {
    display: inline-grid;
    flex: 0 0 auto;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 999px;
    background: #101827;
    color: white;
    font-size: 0.85rem;
    font-weight: 800;
  }

  .file-drop {
    display: flex;
    gap: 16px;
    align-items: center;
    border: 1px dashed #9aa8bd;
    border-radius: 22px;
    background: #f8fafc;
    padding: 22px;
    cursor: pointer;
  }

  .file-drop input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }

  .file-drop strong,
  .file-drop small {
    display: block;
  }

  .file-drop small {
    margin-top: 4px;
    color: #68758b;
  }

  .file-icon {
    display: inline-grid;
    place-items: center;
    width: 56px;
    height: 56px;
    border-radius: 18px;
    background: #e8415f;
    color: white;
    font-size: 0.78rem;
    font-weight: 900;
    letter-spacing: 0.08em;
  }

  .grid {
    display: grid;
    gap: 16px;
    margin-bottom: 18px;
  }

  .grid.two {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .grid.three {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  label span,
  summary {
    display: block;
    margin-bottom: 8px;
    color: #263552;
    font-size: 0.88rem;
    font-weight: 800;
  }

  input:not([type='checkbox']),
  select {
    width: 100%;
    border: 1px solid #d6deea;
    border-radius: 14px;
    background: white;
    color: #172033;
    padding: 12px 13px;
    outline: none;
  }

  input:focus,
  select:focus {
    border-color: #5678ff;
    box-shadow: 0 0 0 4px rgba(86, 120, 255, 0.12);
  }

  .toggles {
    display: grid;
    gap: 10px;
    margin: 12px 0 22px;
  }

  .checkbox-row {
    display: flex;
    gap: 10px;
    align-items: center;
    color: #263552;
    font-weight: 700;
  }

  .checkbox-row span {
    margin-bottom: 0;
  }

  .checkbox-row.inline {
    margin-top: 8px;
  }

  .advanced {
    border: 1px solid #e1e7f0;
    border-radius: 20px;
    margin-bottom: 14px;
    padding: 16px;
  }

  .advanced summary {
    cursor: pointer;
  }

  .advanced .grid:last-child {
    margin-bottom: 0;
  }

  .primary-action {
    width: 100%;
    border-radius: 16px;
    background: #101827;
    color: white;
    padding: 15px 18px;
    font-weight: 900;
    cursor: pointer;
    transition:
      transform 160ms ease,
      opacity 160ms ease;
  }

  .primary-action:not(:disabled):hover {
    transform: translateY(-1px);
  }

  .primary-action:disabled {
    cursor: wait;
    opacity: 0.68;
  }

  .results-panel {
    position: sticky;
    top: 24px;
  }

  .status {
    display: grid;
    gap: 8px;
    border-radius: 22px;
    padding: 22px;
  }

  .status strong,
  .status small {
    display: block;
  }

  .status small {
    color: #68758b;
    line-height: 1.5;
  }

  .status.idle {
    background: #f8fafc;
  }

  .status.loading {
    background: #eef3ff;
  }

  .status.error {
    background: #fff1f2;
    color: #9f1239;
  }

  .status.error small {
    color: #be123c;
  }

  .status.success {
    background: #ecfdf5;
    color: #065f46;
  }

  .status.success small {
    color: #047857;
  }

  .spinner {
    width: 28px;
    height: 28px;
    border: 3px solid rgba(86, 120, 255, 0.25);
    border-top-color: #5678ff;
    border-radius: 999px;
    animation: spin 0.8s linear infinite;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin: 18px 0 0;
  }

  .stats-grid div {
    border-radius: 18px;
    background: #f8fafc;
    padding: 16px;
  }

  .stats-grid dt {
    color: #68758b;
    font-size: 0.75rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  .stats-grid dd {
    margin: 6px 0 0;
    color: #101827;
    font-size: 1.1rem;
    font-weight: 900;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 900px) {
    .hero,
    .workspace {
      grid-template-columns: 1fr;
    }

    .results-panel {
      position: static;
    }
  }

  @media (max-width: 640px) {
    .page-shell {
      width: min(100% - 20px, 1180px);
      padding: 24px 0;
    }

    .panel,
    .hero-card {
      border-radius: 22px;
      padding: 20px;
    }

    .grid.two,
    .grid.three,
    .stats-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
