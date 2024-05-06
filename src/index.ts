import nunjucks from "nunjucks";
import path from "path";

export default function generate() {
  const content = nunjucks.render(
    path.join(
      path.dirname(import.meta.url.replace("file:", "")),
      "..",
      "templates",
      "arc56_client.ts.njk"
    )
  );

  console.log(content);
}

generate();
