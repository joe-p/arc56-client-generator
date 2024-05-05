import ARC56 from "./ref.arc56.json";
import {
  AlgorandClient,
  type SendSingleTransactionResult,
} from "@algorandfoundation/algokit-utils";
import { type MethodCallParams } from "@algorandfoundation/algokit-utils/types/composer";
import algosdk from "algosdk";

type MethodParams = Omit<
  Omit<Omit<Omit<MethodCallParams, "args">, "appId">, "method">,
  "sender"
> & { sender?: string };

/* Aliases for non-encoded ABI values */
type uint64 = bigint;

/* Type definitions for ARC56 structs */
export type Inputs = {
  add: { a: uint64; b: uint64 };
  subtract: { a: uint64; b: uint64 };
};
export type Outputs = { sum: uint64; difference: uint64 };

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

async function compileProgram(
  algorand: AlgorandClient,
  program: "clear" | "approval"
) {
  const teal = new Uint8Array(Buffer.from(ARC56.source[program], "base64"));
  const result = await algorand.client.algod.compile(teal).do();

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

  call = (methodParams?: MethodParams) => {
    return {
      foo: async (
        inputs: Inputs
      ): Promise<{
        result: SendSingleTransactionResult;
        returnValue: Outputs;
      }> => {
        const sender = methodParams?.sender ?? this.defaultSender;

        if (sender === undefined) {
          throw new Error("No sender provided");
        }

        const result = await this.algorand.send.methodCall({
          sender,
          appId: this.appId,
          method: this.contract.getMethodByName("foo")!,
          args: [InputsToArray(inputs)],
          ...methodParams,
        });

        return {
          result,
          returnValue: rawValueToOutputs(result.returns![0].rawReturnValue!),
        };
      },
    };
  };

  create = (methodParams?: MethodParams) => {
    return {
      createApplication: async (): Promise<{
        appId: bigint;
        appAddress: string;
        result: SendSingleTransactionResult;
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
        const result = await this.algorand.send.methodCall({
          schema: {
            globalByteSlices: ARC56.state.schema.global.bytes,
            globalUints: ARC56.state.schema.global.ints,
            localByteSlices: ARC56.state.schema.local.bytes,
            localUints: ARC56.state.schema.local.ints,
          },
          approvalProgram: await compileProgram(this.algorand, "approval"),
          clearProgram: await compileProgram(this.algorand, "clear"),
          sender,
          appId: this.appId,
          method: this.contract.getMethodByName("createApplication")!,
          ...methodParams,
        });

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
}

export default ReferenceClient;
