import { withPluginApi } from "discourse/lib/plugin-api";
import Mobile from "discourse/lib/mobile";

export default {
  name: "pdf-previews",
  initialize() {
    withPluginApi("0.8.41", api => {
      if (Mobile.mobileView) return;

      const createPreviewElem = () => {
        const preview = document.createElement("iframe");
        preview.height = 450;
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

            const xhr = new XMLHttpRequest();
            xhr.open("GET", pdf.href, true);
            xhr.responseType = "blob";

            xhr.onload = function() {
              if (this.status == 200) {
                const blob = new Blob([this.response], {
                  type: "application/pdf"
                });
                const url = URL.createObjectURL(blob);

                preview.src = url;
              }
            };

            xhr.send();
            pdf.classList.add("pdf-attachment");
            pdf.nextSibling.nodeValue = "";
          });
        },
        {
          id: "pdf-previews",
          onlyStream: true
        }
      );
    });
  }
};
