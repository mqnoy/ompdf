import { h as head, e as escape_html, a as ensure_array_like, b as attr, d as derived } from "../../chunks/index.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const algorithms = [
      {
        value: "photon",
        label: "Photon",
        description: "Rasterizes pages; best for image-heavy PDFs."
      },
      {
        value: "smallest",
        label: "Smallest",
        description: "Tries multiple strategies and keeps the smallest output."
      },
      {
        value: "ghostscript",
        label: "Ghostscript",
        description: "WASM pdfwrite compression presets."
      },
      {
        value: "mutool",
        label: "MuTool",
        description: "MuPDF-based document cleaning."
      },
      {
        value: "standard",
        label: "Standard",
        description: "Balanced metadata and image optimization."
      },
      {
        value: "condense",
        label: "Condense",
        description: "More aggressive library-native compression."
      }
    ];
    const qualities = [
      { value: "low", label: "Low" },
      { value: "medium", label: "Medium" },
      { value: "high", label: "High" },
      { value: "maximum", label: "Maximum" }
    ];
    let selectedAlgorithm = "photon";
    let selectedFileName = "No file selected";
    let pending = false;
    const selectedAlgorithmDescription = derived(() => algorithms.find((algorithm) => algorithm.value === selectedAlgorithm)?.description ?? "");
    head("1uha8ag", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>ompdf Web UI</title>`);
      });
      $$renderer3.push(`<meta name="description" content="Server-rendered SvelteKit interface for compressing PDFs with ompdf."/>`);
    });
    $$renderer2.push(`<main class="page-shell svelte-1uha8ag"><section class="hero svelte-1uha8ag" aria-labelledby="page-title"><div><p class="eyebrow svelte-1uha8ag">Svelte 5 SSR · ompdf</p> <h1 id="page-title" class="svelte-1uha8ag">Compress PDFs from a local web UI</h1> <p class="hero-copy svelte-1uha8ag">Upload a PDF, choose a compression strategy, and let the SvelteKit server call the
        workspace <code class="svelte-1uha8ag">ompdf</code> package. The compression engine stays server-only.</p></div> <div class="hero-card svelte-1uha8ag" aria-label="Runtime details"><span class="svelte-1uha8ag">SSR endpoint</span> <strong class="svelte-1uha8ag">/api/compress</strong> <small class="svelte-1uha8ag">Node adapter · multipart uploads · PDF download response</small></div></section> <section class="workspace svelte-1uha8ag" aria-label="PDF compression workspace"><form class="panel form-panel svelte-1uha8ag" action="/api/compress" method="post" enctype="multipart/form-data"><div class="section-heading svelte-1uha8ag"><span class="step svelte-1uha8ag">1</span> <div><h2 class="svelte-1uha8ag">Upload PDF</h2> <p class="svelte-1uha8ag">Plain form posts work without JavaScript; enhanced submissions show stats here.</p></div></div> <label class="file-drop svelte-1uha8ag" for="file"><input id="file" name="file" type="file" accept="application/pdf,.pdf" required="" class="svelte-1uha8ag"/> <span class="file-icon svelte-1uha8ag" aria-hidden="true">PDF</span> <span class="svelte-1uha8ag"><strong class="svelte-1uha8ag">${escape_html(selectedFileName)}</strong> <small class="svelte-1uha8ag">Choose a PDF document to compress</small></span></label> <div class="section-heading compact svelte-1uha8ag"><span class="step svelte-1uha8ag">2</span> <div><h2 class="svelte-1uha8ag">Compression strategy</h2> <p class="svelte-1uha8ag">${escape_html(selectedAlgorithmDescription())}</p></div></div> <div class="grid two svelte-1uha8ag"><label class="svelte-1uha8ag"><span class="svelte-1uha8ag">Algorithm</span> `);
    $$renderer2.select(
      { name: "algorithm", value: selectedAlgorithm, class: "" },
      ($$renderer3) => {
        $$renderer3.push(`<!--[-->`);
        const each_array = ensure_array_like(algorithms);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let algorithm = each_array[$$index];
          $$renderer3.option({ value: algorithm.value }, ($$renderer4) => {
            $$renderer4.push(`${escape_html(algorithm.label)}`);
          });
        }
        $$renderer3.push(`<!--]-->`);
      },
      "svelte-1uha8ag"
    );
    $$renderer2.push(`</label> <label class="svelte-1uha8ag"><span class="svelte-1uha8ag">Quality preset</span> `);
    $$renderer2.select(
      { name: "quality", value: "medium", class: "" },
      ($$renderer3) => {
        $$renderer3.push(`<!--[-->`);
        const each_array_1 = ensure_array_like(qualities);
        for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
          let quality = each_array_1[$$index_1];
          $$renderer3.option({ value: quality.value }, ($$renderer4) => {
            $$renderer4.push(`${escape_html(quality.label)}`);
          });
        }
        $$renderer3.push(`<!--]-->`);
      },
      "svelte-1uha8ag"
    );
    $$renderer2.push(`</label></div> <div class="toggles svelte-1uha8ag"><label class="checkbox-row svelte-1uha8ag"><input name="optimizeImages" type="checkbox" checked="" class="svelte-1uha8ag"/> <span class="svelte-1uha8ag">Optimize embedded images</span></label> <label class="checkbox-row svelte-1uha8ag"><input name="removeMetadata" type="checkbox" class="svelte-1uha8ag"/> <span class="svelte-1uha8ag">Remove PDF metadata where supported</span></label></div> <details class="advanced svelte-1uha8ag"${attr("open", selectedAlgorithm === "photon", true)}><summary class="svelte-1uha8ag">Photon options</summary> <div class="grid three svelte-1uha8ag"><label class="svelte-1uha8ag"><span class="svelte-1uha8ag">DPI</span> <input name="photonDpi" type="number" min="36" max="600" value="150" class="svelte-1uha8ag"/></label> <label class="svelte-1uha8ag"><span class="svelte-1uha8ag">Image format</span> `);
    $$renderer2.select(
      { name: "photonFormat", value: "jpeg", class: "" },
      ($$renderer3) => {
        $$renderer3.option({ value: "jpeg" }, ($$renderer4) => {
          $$renderer4.push(`JPEG`);
        });
        $$renderer3.option({ value: "png" }, ($$renderer4) => {
          $$renderer4.push(`PNG`);
        });
      },
      "svelte-1uha8ag"
    );
    $$renderer2.push(`</label> <label class="svelte-1uha8ag"><span class="svelte-1uha8ag">JPEG quality</span> <input name="photonQuality" type="number" min="1" max="100" value="85" class="svelte-1uha8ag"/></label></div></details> <details class="advanced svelte-1uha8ag"${attr("open", selectedAlgorithm === "ghostscript", true)}><summary class="svelte-1uha8ag">Ghostscript options</summary> <div class="grid two svelte-1uha8ag"><label class="svelte-1uha8ag"><span class="svelte-1uha8ag">Preset</span> <select name="ghostscriptPreset" class="svelte-1uha8ag">`);
    $$renderer2.option({ value: "" }, ($$renderer3) => {
      $$renderer3.push(`Auto from quality`);
    });
    $$renderer2.option({ value: "screen" }, ($$renderer3) => {
      $$renderer3.push(`Screen`);
    });
    $$renderer2.option({ value: "ebook" }, ($$renderer3) => {
      $$renderer3.push(`Ebook`);
    });
    $$renderer2.option({ value: "printer" }, ($$renderer3) => {
      $$renderer3.push(`Printer`);
    });
    $$renderer2.option({ value: "prepress" }, ($$renderer3) => {
      $$renderer3.push(`Prepress`);
    });
    $$renderer2.option({ value: "default" }, ($$renderer3) => {
      $$renderer3.push(`Default`);
    });
    $$renderer2.push(`</select></label> <label class="svelte-1uha8ag"><span class="svelte-1uha8ag">Compatibility</span> <select name="ghostscriptCompatibilityLevel" class="svelte-1uha8ag">`);
    $$renderer2.option({ value: "" }, ($$renderer3) => {
      $$renderer3.push(`Default`);
    });
    $$renderer2.option({ value: "1.4" }, ($$renderer3) => {
      $$renderer3.push(`PDF 1.4`);
    });
    $$renderer2.option({ value: "1.5" }, ($$renderer3) => {
      $$renderer3.push(`PDF 1.5`);
    });
    $$renderer2.option({ value: "1.6" }, ($$renderer3) => {
      $$renderer3.push(`PDF 1.6`);
    });
    $$renderer2.option({ value: "1.7" }, ($$renderer3) => {
      $$renderer3.push(`PDF 1.7`);
    });
    $$renderer2.push(`</select></label></div> <div class="grid three svelte-1uha8ag"><label class="svelte-1uha8ag"><span class="svelte-1uha8ag">Color DPI</span> <input name="ghostscriptColorImageResolution" type="number" min="36" max="1200" placeholder="Auto" class="svelte-1uha8ag"/></label> <label class="svelte-1uha8ag"><span class="svelte-1uha8ag">Grayscale DPI</span> <input name="ghostscriptGrayImageResolution" type="number" min="36" max="1200" placeholder="Auto" class="svelte-1uha8ag"/></label> <label class="svelte-1uha8ag"><span class="svelte-1uha8ag">Mono DPI</span> <input name="ghostscriptMonoImageResolution" type="number" min="36" max="2400" placeholder="Auto" class="svelte-1uha8ag"/></label></div> <label class="checkbox-row inline svelte-1uha8ag"><input name="ghostscriptDownsampleImages" type="checkbox" class="svelte-1uha8ag"/> <span class="svelte-1uha8ag">Downsample images</span></label></details> <button class="primary-action svelte-1uha8ag" type="submit"${attr("disabled", pending, true)}>${escape_html("Compress PDF")}</button></form> <aside class="panel results-panel svelte-1uha8ag" aria-live="polite"><div class="section-heading svelte-1uha8ag"><span class="step svelte-1uha8ag">3</span> <div><h2 class="svelte-1uha8ag">Result</h2> <p class="svelte-1uha8ag">Compression stats appear after an enhanced upload completes.</p></div></div> `);
    {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="status idle svelte-1uha8ag"><strong class="svelte-1uha8ag">Ready to compress</strong> <small class="svelte-1uha8ag">Pick a PDF and submit. If JavaScript is disabled, your browser will still receive the
            compressed PDF directly.</small></div>`);
    }
    $$renderer2.push(`<!--]--></aside></section></main>`);
  });
}
export {
  _page as default
};
