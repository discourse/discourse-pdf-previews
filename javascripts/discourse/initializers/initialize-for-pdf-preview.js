import { iconHTML } from "discourse/lib/icon-library";
import { withPluginApi } from "discourse/lib/plugin-api";

const PREVIEW_HEIGHT = 500;

export default {
  name: "pdf-previews",
  initialize(container) {
    withPluginApi((api) => {
      const site = api.container.lookup("service:site"); // Updated for mobile detection
      const isMobile = site.mobileView; // Use isMobile variable for clarity

      try {
        const previewModeSetting = settings.preview_mode;
        
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

        const setUpPreviewType = (pdf, renderMode) => {
          if (renderMode === "Inline") {
            const preview = createPreviewElement();
            pdf.classList.add("pdf-attachment");
            pdf.after(preview);
            pdf.classList.add("new-tab-pdf"); // Add link icon and behavior as "New Tab"
            pdf.prepend(newTabIcon());

            return preview;
          }

          if (renderMode === "New Tab") {
            pdf.classList.add("new-tab-pdf");
            pdf.prepend(newTabIcon());
          }
        };

        api.decorateCookedElement(
          (post) => {
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
              const fileName = pdf.innerText;

              // Open the PDF in a new tab if global setting is "New Tab",
              // or pdf description starts with whitespace, or on mobile
              // Otherwise, render the preview inline in the post
              const renderMode =
                previewModeSetting === "New Tab" ||
                startsWithWhitespace.test(fileName) ||
                isMobile // Apply "New Tab" mode to mobile
                  ? "New Tab"
                  : "Inline";

              // Remove the leading space from the pdf file name
              pdf.innerText = pdf.innerText.trim();

              // Handle preview type
              const preview = setUpPreviewType(pdf, renderMode);

              // Set up the PDF src and event listener for the link
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
                    preview.src = src;
                  }

                  if (renderMode === "New Tab") {
                    pdf.addEventListener("click", (event) => {
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
        console.error(
          "There's an issue in the pdf previews theme component",
          error
        );
      }
    });
  },
};
