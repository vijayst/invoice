const markdownPdf = require("markdown-pdf");

const options = {
  cssPath: "./invoice.css",
  paperFormat: "A4",
  paperOrientation: "portrait",
  paperBorder: "0.5in",
  remarkable: {
    html: true,
    breaks: true,
  }
};

markdownPdf(options)
  .from("./invoice.md")
  .to("./invoice.pdf", function () {
    console.log("Done");
  });