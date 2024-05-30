export const importsAndMethodParams = `
import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import AlgokitComposer, {
  type MethodCallParams,
} from "@algorandfoundation/algokit-utils/types/composer";
import algosdk from "algosdk";
import { type SendAtomicTransactionComposerResults } from "@algorandfoundation/algokit-utils/types/transaction";
import { ARC56AppClient } from "../../src/arc56_client";

type MethodParams = Omit<MethodCallParams,"args" | "appId" | "method" | "sender"> & { sender?: string };
`.trim();

export const noTemplateVarsCompileProgram = `
async function compileProgram(
    algorand: AlgorandClient,
    program: "clear" | "approval",
  ) {
    const tealString = Buffer.from(this.arc56.source![program], "base64").toString();
    const result = await algorand.client.algod.compile(tealString).do();
    return new Uint8Array(Buffer.from(result.result, "base64"));
  }
`.trim();

export const consructor = `constructor(p: {
  appId: bigint;
  algorand: AlgorandClient;
  defaultSender?: string;
}) {
  super({ ...p, arc56: JSON.parse(ARC56_JSON) });
}`;
