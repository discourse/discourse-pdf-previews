import { iconHTML } from "discourse/lib/icon-library";
import { withPluginApi } from "discourse/lib/plugin-api";
import { getOwner } from "discourse-common/lib/get-owner";

const PREVIEW_HEIGHT = 500;

export default {
  name: "pdf-previews",
  initialize(container) {
    withPluginApi("0.8.41", (api) => {
      try {
        const siteSettings = container.lookup("service:site-settings");
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

        const setUpPreviewType = (pdf, renderMode) => {
          if (renderMode === "Inline") {
            const preview = createPreviewElement();
            pdf.classList.add("pdf-attachment");
            pdf.after(preview);

            return preview;
          }

          if (renderMode === "New Tab") {
            pdf.classList.add("new-tab-pdf");
            pdf.prepend(newTabIcon());
          }
        };

        api.decorateCookedElement(
          (post) => {
            // Access site to check for view capabilities here
            const site = getOwner(container).lookup("service:site");

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

              // Utilize "New Tab" mode for mobile or based on settings/pattern
              const renderMode = site.mobileView || previewModeSetting === "New Tab" || startsWithWhitespace.test(fileName)
                ? "New Tab"
                : "Inline";

              // No need for the space anymore
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
                    preview.src = src;
                  }

                  // Event listeners for PDF link opening
                  pdf.addEventListener("click", (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    window.open(src);
                  });
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
