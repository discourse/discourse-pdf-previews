import { withPluginApi } from "discourse/lib/plugin-api";
import Mobile from "discourse/lib/mobile";

const PREVIEW_HEIGHT = 500;

const createPreviewElem = () => {
  const preview = document.createElement("iframe");
  preview.src = "";
  preview.height = PREVIEW_HEIGHT;
  preview.loading = "lazy";
  preview.classList.add("pdf-preview");

  return preview;
};

export default {
  name: "pdf-previews",
  initialize() {
    withPluginApi("0.8.41", (api) => {
      if (Mobile.mobileView) return;

      const previewMode = settings.preview_mode;
      const newTabIcon = () => {
        const template = document.createElement("template");
        template.innerHTML = iconHTML("external-link-alt", {
          class: "new-tab-pdf-icon",
        });
        return template.content.firstChild;
      };

      try {
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

              const startsWithWhitespace = /^\s+/;
              const fileName = pdf.innerText;

              if (startsWithWhitespace.test(fileName)) {
                pdf.innerText = pdf.innerText.trim();
                return;
              }

              httpRequest.onreadystatechange = () => {
                if (httpRequest.readyState !== XMLHttpRequest.DONE) return;

                if (httpRequest.status === 200) {
                  let src = null;
                  const blob = new Blob([httpRequest.response], {
                    type: "application/pdf",
                  });

                  // new tab previews
                  if (previewMode === "New Tab") {
                    pdf.classList.add("new-tab-pdf");
                    pdf.prepend(newTabIcon());
                    src = URL.createObjectURL(blob);

                    pdf.addEventListener("click", (event) => {
                      event.preventDefault();
                      window.open(src);
                    });

                    return;
                  }

                  // inline preview
                  if (previewMode === "Inline") {
                    pdf.classList.add("pdf-attachment");
                    const preview = createPreviewElem();
                    pdf.append(preview);

                    const reader = new FileReader();
                    reader.onload = function (event) {
                      src = event.target.result;
                      preview.src = src;
                    };
                  }

                  reader.readAsDataURL(blob);
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
