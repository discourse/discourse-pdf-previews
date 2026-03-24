import { iconHTML } from "discourse/lib/icon-library";
import { withPluginApi } from "discourse/lib/plugin-api";

const PREVIEW_HEIGHT = 600;

export default {
  name: "pdf-previews",
  initialize(container) {
    withPluginApi((api) => {
      // MOBILE DETECTION REMOVED - works on all devices now
      
      try {
        const previewModeSetting = settings.preview_mode;
        
        const newTabIcon = () => {
          const template = document.createElement("template");
          template.innerHTML = iconHTML("up-right-from-square", {
            class: "new-tab-pdf-icon",
          });
          return template.content.firstChild;
        };

        const createPDFJSViewer = () => {
          const container = document.createElement("div");
          container.classList.add("pdf-preview-container");
          
          // Controls bar
          const controls = document.createElement("div");
          controls.classList.add("pdf-controls");
          controls.innerHTML = `
            <button class="pdf-prev" title="Previous page">${iconHTML("chevron-left")}</button>
            <span class="pdf-page-info">
              <span class="pdf-current-page">1</span> / <span class="pdf-total-pages">-</span>
            </span>
            <button class="pdf-next" title="Next page">${iconHTML("chevron-right")}</button>
            <button class="pdf-zoom-out" title="Zoom out">${iconHTML("magnifying-glass-minus")}</button>
            <span class="pdf-zoom-level">100%</span>
            <button class="pdf-zoom-in" title="Zoom in">${iconHTML("magnifying-glass-plus")}</button>
            <button class="pdf-fullscreen" title="Fullscreen">${iconHTML("expand")}</button>
          `;
          
          // Canvas container with scroll
          const canvasContainer = document.createElement("div");
          canvasContainer.classList.add("pdf-canvas-container");
          
          const canvas = document.createElement("canvas");
          canvas.classList.add("pdf-canvas");
          canvasContainer.appendChild(canvas);
          
          container.appendChild(controls);
          container.appendChild(canvasContainer);
          
          return container;
        };

        const loadPDFJS = () => {
          return new Promise((resolve, reject) => {
            if (window.pdfjsLib) {
              resolve();
              return;
            }
            
            const script = document.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
            script.onload = () => {
              window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
                "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
              resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
          });
        };

        const setupPDFViewer = async (container, pdfUrl) => {
          await loadPDFJS();
          
          const canvas = container.querySelector(".pdf-canvas");
          const ctx = canvas.getContext("2d");
          const canvasContainer = container.querySelector(".pdf-canvas-container");
          
          const prevBtn = container.querySelector(".pdf-prev");
          const nextBtn = container.querySelector(".pdf-next");
          const zoomInBtn = container.querySelector(".pdf-zoom-in");
          const zoomOutBtn = container.querySelector(".pdf-zoom-out");
          const fullscreenBtn = container.querySelector(".pdf-fullscreen");
          const currentPageSpan = container.querySelector(".pdf-current-page");
          const totalPagesSpan = container.querySelector(".pdf-total-pages");
          const zoomLevelSpan = container.querySelector(".pdf-zoom-level");
          
          let pdfDoc = null;
          let currentPage = 1;
          let scale = 1.5; // Starting scale for good readability
          
          const renderPage = async (pageNum) => {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale });
            
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            const renderContext = {
              canvasContext: ctx,
              viewport: viewport,
            };
            
            await page.render(renderContext).promise;
            
            currentPageSpan.textContent = pageNum;
            
            // Update button states
            prevBtn.disabled = pageNum === 1;
            nextBtn.disabled = pageNum === pdfDoc.numPages;
          };
          
          const updateZoom = (newScale) => {
            scale = Math.max(0.5, Math.min(3, newScale)); // Limit between 50% and 300%
            zoomLevelSpan.textContent = Math.round(scale * 100) + "%";
            renderPage(currentPage);
          };
          
          // Load PDF
          try {
            const loadingTask = window.pdfjsLib.getDocument(pdfUrl);
            pdfDoc = await loadingTask.promise;
            totalPagesSpan.textContent = pdfDoc.numPages;
            
            await renderPage(currentPage);
            
            // Event listeners
            prevBtn.addEventListener("click", () => {
              if (currentPage > 1) {
                currentPage--;
                renderPage(currentPage);
                canvasContainer.scrollTop = 0;
              }
            });
            
            nextBtn.addEventListener("click", () => {
              if (currentPage < pdfDoc.numPages) {
                currentPage++;
                renderPage(currentPage);
                canvasContainer.scrollTop = 0;
              }
            });
            
            zoomInBtn.addEventListener("click", () => {
              updateZoom(scale + 0.25);
            });
            
            zoomOutBtn.addEventListener("click", () => {
              updateZoom(scale - 0.25);
            });
            
            fullscreenBtn.addEventListener("click", () => {
              if (canvasContainer.requestFullscreen) {
                canvasContainer.requestFullscreen();
              } else if (canvasContainer.webkitRequestFullscreen) {
                canvasContainer.webkitRequestFullscreen();
              } else if (canvasContainer.mozRequestFullScreen) {
                canvasContainer.mozRequestFullScreen();
              }
            });
            
            // Touch/pinch zoom for mobile
            let initialDistance = 0;
            let initialScale = scale;
            
            canvasContainer.addEventListener("touchstart", (e) => {
              if (e.touches.length === 2) {
                e.preventDefault();
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                initialDistance = Math.hypot(
                  touch2.clientX - touch1.clientX,
                  touch2.clientY - touch1.clientY
                );
                initialScale = scale;
              }
            });
            
            canvasContainer.addEventListener("touchmove", (e) => {
              if (e.touches.length === 2) {
                e.preventDefault();
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                const currentDistance = Math.hypot(
                  touch2.clientX - touch1.clientX,
                  touch2.clientY - touch1.clientY
                );
                const scaleChange = currentDistance / initialDistance;
                updateZoom(initialScale * scaleChange);
              }
            });
            
          } catch (error) {
            console.error("Error loading PDF:", error);
            container.innerHTML = `<div class="pdf-error">Error loading PDF. <a href="${pdfUrl}" target="_blank">Open in new tab</a></div>`;
          }
        };

        const createThumbnail = () => {
          const container = document.createElement("div");
          container.classList.add("pdf-thumbnail-container");
          
          const canvas = document.createElement("canvas");
          canvas.classList.add("pdf-thumbnail");
          container.appendChild(canvas);
          
          const overlay = document.createElement("div");
          overlay.classList.add("pdf-thumbnail-overlay");
          overlay.innerHTML = iconHTML("up-right-from-square");
          container.appendChild(overlay);
          
          return container;
        };

        const generateThumbnail = async (canvas, pdfUrl) => {
          await loadPDFJS();
          
          try {
            const loadingTask = window.pdfjsLib.getDocument(pdfUrl);
            const pdfDoc = await loadingTask.promise;
            const page = await pdfDoc.getPage(1);
            
            // Scale to create a reasonable thumbnail (300px width)
            const viewport = page.getViewport({ scale: 1 });
            const scale = 300 / viewport.width;
            const scaledViewport = page.getViewport({ scale });
            
            canvas.width = scaledViewport.width;
            canvas.height = scaledViewport.height;
            
            const ctx = canvas.getContext("2d");
            const renderContext = {
              canvasContext: ctx,
              viewport: scaledViewport,
            };
            
            await page.render(renderContext).promise;
          } catch (error) {
            console.error("Error generating thumbnail:", error);
          }
        };

        const setUpPreviewType = (pdf, renderMode) => {
          if (renderMode === "Inline") {
            const preview = createPDFJSViewer();
            pdf.classList.add("pdf-attachment");
            pdf.after(preview);
            return preview;
          }
          if (renderMode === "New Tab") {
            const thumbnail = createThumbnail();
            pdf.classList.add("new-tab-pdf");
            
            // Replace the link with thumbnail
            const fileName = pdf.innerText;
            const linkWrapper = document.createElement("div");
            linkWrapper.classList.add("pdf-new-tab-wrapper");
            
            const label = document.createElement("div");
            label.classList.add("pdf-thumbnail-label");
            label.textContent = fileName;
            
            pdf.parentNode.insertBefore(linkWrapper, pdf);
            linkWrapper.appendChild(thumbnail);
            linkWrapper.appendChild(label);
            linkWrapper.appendChild(pdf);
            
            // Hide the original link text
            pdf.style.display = "none";
            
            return thumbnail;
          }
        };

        api.decorateCookedElement(
          (post) => {
            // Get all links, not just those with .attachment class
            const allLinks = [...post.querySelectorAll("a[href]")];
            // Filter for PDF links (ends with .pdf)
            const pdfs = allLinks.filter((link) =>
              /\.pdf$/i.test(link.href)
            );
            
            pdfs.forEach((pdf) => {
              const fileSize = pdf.nextSibling;
              if (fileSize) {
                fileSize.nodeValue = "";
              }
              const startsWithWhitespace = /^\s+/;
              const fileName = pdf.innerText;
              
              // open the pdf in a new tab if either the global setting is
              // "New Tab" or if the pdf description starts with a whitespace
              // otherwise, render the preview inline in the post
              const renderMode =
                previewModeSetting === "New Tab" ||
                startsWithWhitespace.test(fileName)
                  ? "New Tab"
                  : "Inline";
              
              // we don't need the space anymore.
              pdf.innerText = pdf.innerText.trim();
              
              // handle preview type
              const preview = setUpPreviewType(pdf, renderMode);
              
              // the pdf is set to Content-Disposition: attachment; filename="filename.jpg"
              // on the server. this means we can't just use the href as the
              // src for the pdf preview elements.
              const httpRequest = new XMLHttpRequest();
              httpRequest.open("GET", pdf.href);
              httpRequest.responseType = "blob";
              httpRequest.onreadystatechange = () => {
                if (httpRequest.readyState !== XMLHttpRequest.DONE) {
                  return;
                }
                if (httpRequest.status === 200) {
                  const src = URL.createObjectURL(httpRequest.response);
                  if (renderMode === "Inline") {
                    setupPDFViewer(preview, src);
                  }
                  if (renderMode === "New Tab") {
                    const canvas = preview.querySelector(".pdf-thumbnail");
                    generateThumbnail(canvas, src);
                    
                    // Make the entire thumbnail container clickable
                    const wrapper = preview.closest(".pdf-new-tab-wrapper");
                    wrapper.style.cursor = "pointer";
                    wrapper.addEventListener("click", (event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      window.open(src);
                    });
                  }
                }
              };
              httpRequest.send();
            });
          },
          {
            id: "pdf-previews",
            onlyStream: true,
          }
        );
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(
          "There's an issue in the pdf previews theme component",
          error
        );
      }
    });
  },
};
