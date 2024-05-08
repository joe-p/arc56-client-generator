import ARC56Generator from "../src";
import arc56Ref from "../example/ARC56Test.arc56.json";
import { type ARC56Contract } from "../src/types/arc56";
import { writeFileSync } from "fs";
import path from "path";

async function main() {
  const client = await new ARC56Generator(arc56Ref as ARC56Contract).generate();

  writeFileSync(`${path.join(__dirname)}/ARC56TestClient.ts`, client);
}

main();
