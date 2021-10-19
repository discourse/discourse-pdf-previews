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

              const preview = createPreviewElem();
              pdf.append(preview);

              pdf.classList.add("pdf-attachment");

              const httpRequest = new XMLHttpRequest();
              httpRequest.open("GET", pdf.href);
              httpRequest.responseType = "blob";

              httpRequest.onreadystatechange = () => {
                if (httpRequest.readyState !== XMLHttpRequest.DONE) return;

                if (httpRequest.status === 200) {
                  const blob = new Blob([httpRequest.response], {
                    type: "application/pdf",
                  });
                  const src = URL.createObjectURL(blob);

                  preview.src = src;
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
