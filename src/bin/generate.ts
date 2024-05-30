import ARC56Generator from "../index";
import { type ARC56Contract } from "../types/arc56";
import { writeFileSync, readFileSync } from "fs";
import path from "path";

async function main() {
  const jsonFile = readFileSync(process.argv[2]);
  const arc56Ref = JSON.parse(jsonFile.toString()) as ARC56Contract;
  const client = await new ARC56Generator(arc56Ref).generate();
  writeFileSync(`${path.join(__dirname)}/${arc56Ref.name}Client.ts`, client);
}

main();
