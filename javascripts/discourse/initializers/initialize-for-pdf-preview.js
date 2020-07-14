import { withPluginApi } from "discourse/lib/plugin-api";
import { scheduleOnce } from "@ember/runloop";
import Mobile from "discourse/lib/mobile";

const PREVIEW_HEIGHT = 500;

export default {
  name: "pdf-previews",
  initialize() {
    withPluginApi("0.8.41", api => {
      if (Mobile.mobileView) return;

      try {
        const createPreviewElem = () => {
          const preview = document.createElement("iframe");
          preview.height = PREVIEW_HEIGHT;
          preview.classList.add("pdf-preview");

          return preview;
        };

        api.decorateCookedElement(
          post => {
            const attachments = [...post.querySelectorAll(".attachment")];

            if (!attachments) return;

            const pdfs = attachments.filter(attachment =>
              attachment.href.match(/\.[pdf]+$/g)
            );

            if (!pdfs.length) return;

            pdfs.forEach(pdf => {
              const preview = createPreviewElem();
              pdf.append(preview);

              const httpRequest = new XMLHttpRequest();
              httpRequest.open("GET", pdf.href);
              httpRequest.responseType = "blob";

              httpRequest.onreadystatechange = () => {
                if (httpRequest.readyState !== XMLHttpRequest.DONE) return;

                if (httpRequest.status === 200) {
                  const blob = new Blob([httpRequest.response], {
                    type: "application/pdf"
                  });
                  const src = URL.createObjectURL(blob);

                  preview.src = src;
                }
              };

              scheduleOnce("afterRender", () => {
                httpRequest.send();
              });

              pdf.classList.add("pdf-attachment");
              pdf.nextSibling.nodeValue = "";
            });
          },
          {
            id: "pdf-previews",
            onlyStream: true
          }
        );
      } catch (error) {
        console.warn("There's an issue in the pdf previews theme component");
        console.error(error);
      }
    });
  }
};
