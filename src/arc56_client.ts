import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import AlgokitComposer, {
  type MethodCallParams,
} from "@algorandfoundation/algokit-utils/types/composer";
import algosdk from "algosdk";
import { type ARC56Contract, type StorageMap } from "./types/arc56";

type MethodParams = Omit<
  MethodCallParams,
  "appId" | "method" | "sender" | "onComplete" | "args"
> & {
  sender?: string;
  args?: any[];
};

export class ARC56AppClient {
  appId: bigint;
  algorand: AlgorandClient;
  contract: algosdk.ABIContract;
  defaultSender?: string;
  appAddress: string;
  arc56: ARC56Contract;

  constructor(p: {
    arc56: ARC56Contract;
    appId: bigint;
    algorand: AlgorandClient;
    defaultSender?: string;
  }) {
    this.arc56 = p.arc56;
    this.appId = p.appId;
    this.appAddress = algosdk.getApplicationAddress(p.appId);
    this.algorand = p.algorand;
    this.contract = new algosdk.ABIContract({
      name: this.arc56.name,
      methods: this.arc56.methods,
    });
    this.defaultSender = p.defaultSender;
  }

  // TOOD: Allow addMethodCall to pass in a callback function to handle errors
  private async executeWithErrorParsing(group: AlgokitComposer) {
    try {
      return await group.execute();
    } catch (e) {
      const txId = JSON.stringify(e).match(/(?<=transaction )S+(?=:)/)?.[0];

      const appId = BigInt(JSON.stringify(e).match(/(?<=app=)d+/)?.[0] || "");

      const pc = Number(JSON.stringify(e).match(/(?<=pc=)d+/)?.[0] || "");

      if (appId !== this.appId) {
        throw e;
      }

      // TODO: Use our own source map we got during create if we have one
      const errorMessage = this.arc56.sourceInfo?.find((s) =>
        s?.pc?.includes(pc)
      )?.errorMessage;

      if (errorMessage) {
        throw Error(
          `Runtime error when executing ${this.arc56.name} (appId: ${this.appId}) in transaction ${txId}: ${errorMessage}`
        );
      }

      throw e;
    }
  }

  private getABITypeFromStructFields(structFields: any): string {
    const typesArray: any[] = [];

    for (const key in structFields) {
      if (typeof structFields[key] === "object") {
        typesArray.push(this.getABITypeFromStructFields(structFields[key]));
      } else {
        typesArray.push(structFields[key]);
      }
    }

    return JSON.stringify(typesArray)
      .replace(/"/g, "")
      .replace(/\]/g, ")")
      .replace(/\[/g, "(");
  }

  private getABIType(type: string) {
    if (this.arc56.structs[type]) {
      return this.getABITypeFromStructFields(this.arc56.structs[type]);
    }

    return type;
  }

  private getABIEncodedValue(value: any, type: string): Uint8Array {
    if (type === "bytes") return Buffer.from(value as string);
    const abiType = this.getABIType(type);

    return algosdk.ABIType.from(abiType).encode(this.getABIValue(type, value));
  }

  private getObjectFromStructFieldsAndArray(
    structFields: any,
    valuesArray: any[]
  ): any {
    const obj: any = {};

    for (const key in structFields) {
      if (
        typeof structFields[key] === "object" &&
        !Array.isArray(structFields[key])
      ) {
        obj[key] = this.getObjectFromStructFieldsAndArray(
          structFields[key],
          valuesArray.shift()
        );
      } else {
        obj[key] = valuesArray.shift();
      }
    }

    return obj;
  }

  /** Get the typescript value, which may be the ABIValue or the struct */
  private getTypeScriptValue(type: string, value: Uint8Array): any {
    if (type === "bytes") return Buffer.from(value).toString();
    const abiType = this.getABIType(type);

    const abiValue = algosdk.ABIType.from(abiType).decode(value);

    if (this.arc56.structs[type]) {
      return this.getObjectFromStructFieldsAndArray(
        this.arc56.structs[type],
        abiValue as algosdk.ABIValue[]
      );
    }

    return abiValue;
  }

  private async getLocalStateValue(
    address: string,
    b64Key: string,
    type: string
  ): Promise<any> {
    const result = await this.algorand.client.algod
      .accountApplicationInformation(address, Number(this.appId))
      .do();

    const keyValue = result["app-local-state"]["key-value"].find(
      (s: any) => s.key === b64Key
    );

    if (keyValue.value.type === 1) {
      return this.getTypeScriptValue(
        type,
        new Uint8Array(Buffer.from(keyValue.value.bytes, "base64"))
      );
    } else {
      return this.getTypeScriptValue(
        type,
        algosdk.encodeUint64(keyValue.value.uint)
      );
    }
  }

  private async getBoxValue(b64Key: string, type: string): Promise<any> {
    const result = await this.algorand.client.algod
      .getApplicationBoxByName(
        Number(this.appId),
        Buffer.from(b64Key, "base64")
      )
      .do();

    return this.getTypeScriptValue(type, result.value);
  }

  private async getGlobalStateValue(
    b64Key: string,
    type: string
  ): Promise<any> {
    const result = await this.algorand.client.algod
      .getApplicationByID(Number(this.appId))
      .do();

    const keyValue = result.params["global-state"].find(
      (s: any) => s.key === b64Key
    );

    if (keyValue.value.type === 1) {
      return this.getTypeScriptValue(
        type,
        new Uint8Array(Buffer.from(keyValue.value.bytes, "base64"))
      );
    } else {
      return this.getTypeScriptValue(
        type,
        algosdk.encodeUint64(keyValue.value.uint)
      );
    }
  }

  private getABIValuesFromStructFieldsAndObject(
    structFields: any,
    obj: any
  ): algosdk.ABIValue[] {
    const valuesArray: any[] = [];

    for (const key in structFields) {
      if (
        typeof structFields[key] === "object" &&
        !Array.isArray(structFields[key])
      ) {
        valuesArray.push(
          this.getABIValuesFromStructFieldsAndObject(
            structFields[key],
            obj[key]
          )
        );
      } else {
        valuesArray.push(obj[key]);
      }
    }

    return valuesArray;
  }

  private getABIValue(type: string, value: any): algosdk.ABIValue {
    if (type === "bytes") return value;
    if (this.arc56.structs[type]) {
      return this.getABIValuesFromStructFieldsAndObject(
        this.arc56.structs[type],
        value
      );
    }

    return value;
  }

  async compileProgram(
    algorand: AlgorandClient,
    program: "clear" | "approval",
    templateVars?: Record<string, string | bigint>
  ) {
    let tealString = Buffer.from(
      this.arc56.source![program],
      "base64"
    ).toString();

    if (
      Object.keys(this.arc56.templateVariables ?? {}).length !==
      Object.keys(templateVars ?? {}).length
    ) {
      throw new Error(
        `${this.arc56.name} expected ${Object.keys(this.arc56.templateVariables ?? {}).length} template variables but got ${Object.keys(templateVars ?? {}).length}`
      );
    }

    Object.keys(templateVars || {}).forEach((name) => {
      const value = templateVars![name];
      const type = this.arc56.templateVariables![name];

      const op = type === "uint64" ? "int" : "byte";

      tealString = tealString.replace(
        new RegExp(`push${op} TMPL_${name}`, "g"),
        `push${op} ${value}`
      );
    });

    const result = await algorand.client.algod.compile(tealString).do();
    return new Uint8Array(Buffer.from(result.result, "base64"));
  }

  getParams(methodName: string, methodParams?: MethodParams) {
    const sender = methodParams?.sender ?? this.defaultSender;

    if (sender === undefined) {
      throw new Error("No sender provided");
    }

    const method = this.contract.getMethodByName(methodName);

    if (method === undefined) {
      throw new Error(
        `Method ${methodName} not found in ${this.arc56.name} ARC56 definition`
      );
    }

    const arc56Method = this.arc56.methods.find((m) => m.name === methodName)!;

    const args = methodParams?.args?.map((a, i) => {
      return this.getABIValue(
        arc56Method.args[i].struct ?? arc56Method.args[i].type,
        a
      );
    });

    return {
      sender,
      appId: this.appId,
      method,
      ...methodParams,
      args: args ?? [],
    };
  }

  private async callWithOC(
    methodName: string,
    onComplete: algosdk.OnApplicationComplete,
    methodParams: MethodParams = {}
  ) {
    const callOrCreate = this.appId === 0n ? "create" : "call";

    const group = this.algorand.newGroup();

    group.addMethodCall({
      ...this.getParams(methodName, methodParams),
      onComplete,
    });

    const ocStrings = [
      "NoOp",
      "OptIn",
      "CloseOut",
      "ClearState",
      "UpdateApplication",
      "DeleteApplication",
    ];

    const method = this.arc56.methods.find((m) => m.name === methodName)!;

    if (!method.actions[callOrCreate].includes(ocStrings[onComplete] as any)) {
      throw Error(
        `${ocStrings[onComplete]} is not supported for ${methodName}`
      );
    }

    const result = await this.executeWithErrorParsing(group);

    let returnValue: any = undefined;

    if (method.returns.struct ?? method.returns.type !== "void") {
      returnValue = this.decodeMethodReturnValue(
        methodName,
        result.returns!.at(-1)?.rawReturnValue!
      );
    }
    return {
      result,
      returnValue,
    };
  }

  async methodCall(methodName: string, methodParams: MethodParams = {}) {
    return await this.callWithOC(
      methodName,
      algosdk.OnApplicationComplete.NoOpOC,
      methodParams
    );
  }

  async optInMethodCall(methodName: string, methodParams: MethodParams = {}) {
    return await this.callWithOC(
      methodName,
      algosdk.OnApplicationComplete.OptInOC,
      methodParams
    );
  }

  async createMethodCall(
    methodName: string,
    methodParams: MethodParams & {
      templateVariables?: Record<string, string | bigint>;
      onComplete?: algosdk.OnApplicationComplete;
    }
  ) {
    if (this.appId !== 0n) {
      throw Error(
        `Create was called but the app has already been created: ${this.appId.toString()}`
      );
    }

    const params = {
      schema: {
        globalByteSlices: this.arc56.state.schema.global.bytes,
        globalUints: this.arc56.state.schema.global.ints,
        localByteSlices: this.arc56.state.schema.local.bytes,
        localUints: this.arc56.state.schema.local.ints,
      },
      approvalProgram: await this.compileProgram(
        this.algorand,
        "approval",
        methodParams.templateVariables
      ),
      clearProgram: await this.compileProgram(
        this.algorand,
        "clear",
        methodParams.templateVariables
      ),
      ...this.getParams(methodName, methodParams),
    };

    const result = await this.callWithOC(
      methodName,
      methodParams.onComplete ?? algosdk.OnApplicationComplete.NoOpOC,
      params
    );

    this.appId = BigInt(result.result.confirmations.at(-1)!.applicationIndex!);
    this.appAddress = algosdk.getApplicationAddress(this.appId);

    return {
      appId: this.appId,
      appAddress: this.appAddress,
      result: result.result,
      returnValue: result.returnValue,
    };
  }

  getState = {
    key: async (key: string, address?: string): Promise<any> => {
      if (this.arc56.state.keys.global[key]) {
        return await this.getGlobalStateValue(
          this.arc56.state.keys.global[key].key,
          this.arc56.state.keys.global[key].valueType
        );
      }

      if (this.arc56.state.keys.local[key]) {
        if (!address) {
          throw new Error(
            `Address must be provided for local key ${key} in ${this.arc56.name} state`
          );
        }
        return await this.getLocalStateValue(
          address,
          this.arc56.state.keys.local[key].key,
          this.arc56.state.keys.local[key].valueType
        );
      }

      if (this.arc56.state.keys.box[key]) {
        return await this.getBoxValue(
          this.arc56.state.keys.box[key].key,
          this.arc56.state.keys.box[key].valueType
        );
      }

      throw new Error(`Key ${key} not found in ${this.arc56.name} state`);
    },

    map: {
      value: async (
        mapName: string,
        key: any,
        address?: string
      ): Promise<any> => {
        let mapObject: StorageMap | undefined;

        if (this.arc56.state.maps.global[mapName]) {
          mapObject = this.arc56.state.maps.global[mapName];
        }

        if (this.arc56.state.maps.local[mapName]) {
          mapObject = this.arc56.state.maps.local[mapName];
        }

        if (this.arc56.state.maps.box[mapName]) {
          mapObject = this.arc56.state.maps.box[mapName];
        }

        if (!mapObject) {
          throw new Error(
            `Map ${mapName} not found in ${this.arc56.name} state`
          );
        }

        const encodedKey = Buffer.concat([
          Buffer.from(mapObject.prefix ?? ""),
          this.getABIEncodedValue(key, mapObject.keyType),
        ]);

        if (this.arc56.state.maps.global[mapName]) {
          return await this.getGlobalStateValue(
            Buffer.from(encodedKey).toString("base64"),
            mapObject.valueType
          );
        }

        if (this.arc56.state.maps.local[mapName]) {
          if (address === undefined) {
            throw new Error(
              `Address must be provided for local map ${mapName} in ${this.arc56.name} state`
            );
          }
          return await this.getLocalStateValue(
            address,
            Buffer.from(encodedKey).toString("base64"),
            mapObject.valueType
          );
        }

        if (this.arc56.state.maps.box[mapName]) {
          return await this.getBoxValue(
            Buffer.from(encodedKey).toString("base64"),
            mapObject.valueType
          );
        }
      },
    },
  };

  decodeMethodReturnValue(methodName: string, rawValue: Uint8Array): any {
    const method = this.arc56.methods.find((m) => m.name === methodName);
    if (!method) {
      throw new Error(`Method ${methodName} not found in ${this.arc56.name}`);
    }
    return this.getTypeScriptValue(
      method.returns.struct ?? method.returns.type,
      rawValue
    );
  }
}
