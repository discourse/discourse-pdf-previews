import { iconHTML } from "discourse/lib/icon-library";
import { withPluginApi } from "discourse/lib/plugin-api";

const PREVIEW_HEIGHT = 500;

export default {
  name: "pdf-previews",
  initialize(container) {
    withPluginApi("1.0", (api) => {
      try {
        const siteSettings = api.container.lookup("service:site-settings");

        const previewModeSetting = siteSettings.preview_mode;
        const newTabIcon = () => {
          const template = document.createElement("template");
          template.innerHTML = iconHTML("up-right-from-square", {
            class: "new-tab-pdf-icon",
          });
          return template.content.firstChild;
        };

        const createPreviewElement = () => {
          const iframe = document.createElement("iframe");
          iframe.src = "";
          iframe.type = "application/pdf";
          iframe.height = PREVIEW_HEIGHT;
          iframe.loading = "lazy";
          iframe.classList.add("pdf-preview");

          return iframe;
        };

        const setUpIconAndLink = (pdf, src) => {
          // Remove any existing icons
          const existingIcon = pdf.querySelector("svg");
          if (existingIcon) {
            existingIcon.remove();
          }

          // Prepend the new tab icon
          pdf.prepend(newTabIcon());

          // Set the click handler
          pdf.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            window.open(src);
          });
        };

        api.decorateCookedElement(
          (post) => {
            const site = api.container.lookup("service:site");

            const attachments = [...post.querySelectorAll(".attachment")];

            const pdfs = attachments.filter((attachment) =>
              /\.pdf$/i.test(attachment.href)
            );

            pdfs.forEach((pdf) => {
              const fileSize = pdf.nextSibling;
              if (fileSize) {
                fileSize.nodeValue = "";
              }

              const startsWithWhitespace = /^\s+/;
              const fileName = pdf.innerText.trim();

              // Determine the render mode
              const renderMode = site.mobileView || previewModeSetting === "New Tab" || startsWithWhitespace.test(pdf.innerText)
                ? "New Tab"
                : "Inline";

              // Trim text for space
              pdf.innerText = fileName;

              // Setup XML request to fetch blob for the PDF
              const httpRequest = new XMLHttpRequest();
              httpRequest.open("GET", pdf.href);
              httpRequest.responseType = "blob";

              httpRequest.onreadystatechange = () => {
                if (httpRequest.readyState !== XMLHttpRequest.DONE) {
                  return;
                }

                if (httpRequest.status === 200) {
                  const src = URL.createObjectURL(httpRequest.response);

                  // Handle Icon and Link setup
                  setUpIconAndLink(pdf, src);

                  if (renderMode === "Inline") {
                    const preview = createPreviewElement();
                    pdf.classList.add("pdf-attachment");
                    pdf.after(preview);
                    preview.src = src;
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
        console.error(
          "There's an issue in the pdf previews theme component",
          error
        );
      }
    });
  },
};
