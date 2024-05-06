import ARC56 from "./ref.arc56.json";
import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import AlgokitComposer, {
  type MethodCallParams,
} from "@algorandfoundation/algokit-utils/types/composer";
import algosdk from "algosdk";
import { type SendAtomicTransactionComposerResults } from "@algorandfoundation/algokit-utils/types/transaction";

type MethodParams = Omit<
  MethodCallParams,
  "args" | "appId" | "method" | "sender"
> & { sender?: string };

type TemplateVars = { someNumber: uint64 };

/* Aliases for non-encoded ABI values */
type uint64 = bigint;
type uint16 = number;

/* Type definitions for ARC56 structs */
export type Inputs = {
  add: { a: uint64; b: uint64 };
  subtract: { a: uint64; b: uint64 };
};
export type Outputs = { sum: uint64; difference: uint64 };
export type UnnamedType1 = { foo: uint16; bar: uint16 };

/* Structs To Arrays */
export function InputsToArray(
  inputs: Inputs
): [[uint64, uint64], [uint64, uint64]] {
  return [
    [inputs.add.a, inputs.add.b],
    [inputs.subtract.a, inputs.subtract.b],
  ];
}

/** Binary To Structs */
export function rawValueToOutputs(rawValue: Uint8Array): Outputs {
  const decoded = algosdk.ABITupleType.from("(uint64,uint64)")
    .decode(rawValue)
    .valueOf() as [uint64, uint64];

  return { sum: decoded[0], difference: decoded[1] };
}

export function rawValueToUnnamedType1(rawValue: Uint8Array): UnnamedType1 {
  const decoded = algosdk.ABITupleType.from("(uint16,uint16)")
    .decode(rawValue)
    .valueOf() as [uint16, uint16];

  return { foo: decoded[0], bar: decoded[1] };
}

/* Helper Functions */
async function compileProgram(
  algorand: AlgorandClient,
  program: "clear" | "approval",
  templateVars: TemplateVars
) {
  let tealString = Buffer.from(ARC56.source[program], "base64").toString();

  tealString = tealString
    .toString()
    .replace(
      /pushint TMPL_someNumber/g,
      `pushint ${templateVars["someNumber"].toString()}`
    );

  const result = await algorand.client.algod.compile(tealString).do();

  return new Uint8Array(Buffer.from(result.result, "base64"));
}

export class ReferenceClient {
  appId: bigint;
  algorand: AlgorandClient;
  contract: algosdk.ABIContract;
  defaultSender?: string;
  appAddress: string;

  constructor(p: {
    appId: bigint;
    algorand: AlgorandClient;
    defaultSender?: string;
  }) {
    this.appId = p.appId;
    this.appAddress = algosdk.getApplicationAddress(p.appId);
    this.algorand = p.algorand;
    this.contract = new algosdk.ABIContract({
      name: ARC56.name,
      methods: ARC56.methods,
    });
    this.defaultSender = p.defaultSender;
  }

  // TOOD: Allow addMethodCall to pass in a callback function to handle errors
  private async executeWithErrorParsing(group: AlgokitComposer) {
    try {
      return await group.execute();
    } catch (e) {
      const txId = JSON.stringify(e).match(
        /(?<=TransactionPool.Remember: transaction )\S+(?=:)/
      )?.[0];

      const appId = BigInt(
        JSON.stringify(e).match(/(?<=Details: app=)\d+/)?.[0] || ""
      );

      const pc = Number(JSON.stringify(e).match(/(?<=pc=)\d+/)?.[0] || "");

      if (appId !== this.appId) {
        throw e;
      }

      // TODO: Use our own source map we got during create if we have one
      const errorMessage = ARC56.sourceInfo.find((s) =>
        s.pc.includes(pc)
      )?.errorMessage;

      if (errorMessage) {
        throw Error(
          `Runtime error when executing ${ARC56.name} (appId: ${this.appId}) in transaction ${txId}: ${errorMessage}`
        );
      }

      throw e;
    }
  }

  call = (methodParams?: MethodParams) => {
    return {
      foo: async (
        inputs: Inputs
      ): Promise<{
        result: SendAtomicTransactionComposerResults;
        returnValue: Outputs;
      }> => {
        const sender = methodParams?.sender ?? this.defaultSender;

        if (sender === undefined) {
          throw new Error("No sender provided");
        }

        const group = this.algorand.newGroup();
        group.addMethodCall({
          sender,
          appId: this.appId,
          method: this.contract.getMethodByName("foo")!,
          args: [InputsToArray(inputs)],
          ...methodParams,
        });

        const result = await this.executeWithErrorParsing(group);

        return {
          result,
          returnValue: rawValueToOutputs(result.returns![0].rawReturnValue!),
        };
      },
    };
  };

  // Note: make methodParams optional UNLESS there are template variables
  create = (
    methodParams: MethodParams & { templateVariables: TemplateVars }
  ) => {
    return {
      createApplication: async (): Promise<{
        appId: bigint;
        appAddress: string;
        result: SendAtomicTransactionComposerResults;
      }> => {
        if (this.appId !== 0n)
          throw Error(
            `Create was called but the app has already been created: ${this.appId.toString()}`
          );

        const sender = methodParams?.sender ?? this.defaultSender;

        if (sender === undefined) {
          throw new Error("No sender provided");
        }

        // TODO: fix bug in AlgorandClient with schema
        const group = this.algorand.newGroup();
        group.addMethodCall({
          schema: {
            globalByteSlices: ARC56.state.schema.global.bytes,
            globalUints: ARC56.state.schema.global.ints,
            localByteSlices: ARC56.state.schema.local.bytes,
            localUints: ARC56.state.schema.local.ints,
          },
          approvalProgram: await compileProgram(
            this.algorand,
            "approval",
            methodParams.templateVariables
          ),
          clearProgram: await compileProgram(
            this.algorand,
            "clear",
            methodParams.templateVariables
          ),
          sender,
          appId: this.appId,
          method: this.contract.getMethodByName("createApplication")!,
          ...methodParams,
        });

        const result = await this.executeWithErrorParsing(group);

        this.appId = BigInt(result.confirmations.at(-1)!.applicationIndex!);
        this.appAddress = algosdk.getApplicationAddress(this.appId);

        return {
          appId: this.appId,
          appAddress: this.appAddress,
          result,
        };
      },
    };
  };

  params = (methodParams?: MethodParams) => {
    return {
      foo: (inputs: Inputs): MethodCallParams => {
        const sender = methodParams?.sender ?? this.defaultSender;

        if (sender === undefined) {
          throw new Error("No sender provided");
        }

        return {
          sender,
          appId: this.appId,
          method: this.contract.getMethodByName("foo")!,
          args: [InputsToArray(inputs)],
          ...methodParams,
        };
      },
    };
  };

  // TODO: Modify AlgorandClient to take in a (rawValue: Uint8Array) => DecodedType that we can use here to not have to manually expose decoders
  decodeReturnValue = {
    foo(rawValue: Uint8Array): Outputs {
      return rawValueToOutputs(rawValue);
    },
  };

  state = {
    keys: {
      globalKey: async () => {
        const b64Key = Buffer.from("globalKey").toString("base64");

        const result = await this.algorand.client.algod
          .getApplicationByID(Number(this.appId))
          .do();

        const keyValue = result.params["global-state"].find(
          (s: any) => s.key === b64Key
        );

        return BigInt(keyValue.value.uint);
      },
    },
    maps: {
      globalMap: {
        value: async (keyValue: string) => {
          const encodedKey = algosdk.ABIType.from("string").encode(keyValue);

          const key = Buffer.concat([
            Buffer.from("p"),
            Buffer.from(encodedKey),
          ]);

          const b64Key = Buffer.from(key).toString("base64");

          const result = await this.algorand.client.algod
            .getApplicationByID(Number(this.appId))
            .do();

          const value = result.params["global-state"].find(
            (s: any) => s.key === b64Key
          );

          return rawValueToUnnamedType1(
            Buffer.from(value.value.bytes, "base64")
          );
        },
      },
    },
  };
}

export default ReferenceClient;
