import { withPluginApi } from "discourse/lib/plugin-api";
import { iconHTML } from "discourse-common/lib/icon-library";
import Mobile from "discourse/lib/mobile";

const PREVIEW_HEIGHT = 500;

export default {
  name: "pdf-previews",
  initialize() {
    withPluginApi("0.8.41", (api) => {
      if (Mobile.mobileView) return;

      try {
        const previewMode = settings.preview_mode;
        const newTabIcon = () => {
          const template = document.createElement("template");
          template.innerHTML = iconHTML("external-link-alt", {
            class: "new-tab-pdf-icon",
          });
          return template.content.firstChild;
        };

        const createElements = () => {
          const object = document.createElement("object");
          object.data = "";
          object.type = "application/pdf";
          object.height = PREVIEW_HEIGHT;
          object.loading = "lazy";
          object.classList.add("pdf-preview");

          const iframe = document.createElement("iframe");
          iframe.src = "";
          iframe.type = "application/pdf";
          iframe.height = PREVIEW_HEIGHT;
          iframe.loading = "lazy";
          iframe.classList.add("pdf-preview");

          object.append(iframe);

          return { object, iframe };
        };

        const setUpPreviewType = (pdf) => {
          const elements = createElements();
          if (previewMode === "Inline") {
            pdf.classList.add("pdf-attachment");
            pdf.append(elements.object);
          }

          if (previewMode === "New Tab") {
            pdf.classList.add("new-tab-pdf");
            pdf.prepend(newTabIcon());
          }

          return elements;
        };

        api.decorateCookedElement(
          (post) => {
            const attachments = [...post.querySelectorAll(".attachment")];

            const pdfs = attachments.filter((attachment) =>
              attachment.href.match(/\.[pdf]+$/)
            );

            pdfs.forEach((pdf) => {
              const fileSize = pdf.nextSibling;
              if (fileSize) {
                fileSize.nodeValue = "";
              }

              // ignore the pdf if its description starts with white-space
              const startsWithWhitespace = /^\s+/;
              const fileName = pdf.innerText;

              if (startsWithWhitespace.test(fileName)) {
                pdf.innerText = pdf.innerText.trim();
                return;
              }

              // handle preview type
              const elements = setUpPreviewType(pdf);

              // the pdf is set to Content-Disposition: attachment; filename="filename.jpg"
              // one the server. this means we can't just use the href as the
              // data/src for the pdf preview elements.
              const httpRequest = new XMLHttpRequest();
              httpRequest.open("GET", pdf.href);
              httpRequest.responseType = "blob";

              httpRequest.onreadystatechange = () => {
                if (httpRequest.readyState !== XMLHttpRequest.DONE) return;

                if (httpRequest.status === 200) {
                  const src = URL.createObjectURL(httpRequest.response);

                  if (previewMode === "Inline") {
                    elements.object.data = src;
                    elements.iframe.src = src;
                  }

                  if (previewMode === "New Tab") {
                    pdf.addEventListener("click", (event) => {
                      event.preventDefault();
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
        console.error("There's an issue in the pdf previews theme component");
        console.error(error);
      }
    });
  },
};
