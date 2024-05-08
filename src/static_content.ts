export const importsAndMethodParams = `
import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import AlgokitComposer, { type MethodCallParams } from "@algorandfoundation/algokit-utils/types/composer";
import algosdk from "algosdk";
import { type SendAtomicTransactionComposerResults } from "@algorandfoundation/algokit-utils/types/transaction";

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

export const arc56TypeDefinitions = `
/** An ABI-encoded type */
type ABIType = string;

/** The name of a defined struct */
type StructName = string;

/** Raw byteslice without the length prefixed that is specified in ARC-4 */
type AVMBytes = 'bytes';

/** Mapping of named structs to the ABI type of their fields */
interface StructFields {
  [fieldName: string]: ABIType | StructFields;
}

/** Describes a single key in app storage */
interface StorageKey {
  /** Description of what this storage key holds */
  desc?: string;
  /** The type of the key */
  keyType: ABIType | AVMBytes | StructName;
  /** The type of the value */
  valueType: ABIType | AVMBytes | StructName;
  /** The bytes of the key encoded as base64 */
  key: string;
}

interface StorageMap {
  /** Description of what the key-value pairs in this mapping hold */
  desc?: string;
  /** The type of the keys in the map */
  keyType: ABIType | AVMBytes | StructName;
  /** The type of the values in the map */
  valueType: ABIType | AVMBytes | StructName;
  /** The prefix of the map, encoded as a utf-8 string */
  prefix?: string;
}

interface SourceInfo {
  /** The line of pre-compiled TEAL */
  teal: number;
  /** The program counter offset(s) that correspond to this line of TEAL */
  pc?: Array<number>;
  /** A human-readable string that describes the error when the program fails at this given line of TEAL */
  errorMessage?: string;
}

interface Event {
  /** The name of the event */
  name: string;
  /** Optional, user-friendly description for the event */
  desc?: string;
  /** The arguments of the event, in order */
  args: Array<{
    /** The type of the argument */
    type: ABIType;
    /** Optional, user-friendly name for the argument */
    name?: string;
    /** Optional, user-friendly description for the argument */
    desc?: string;
    /** If the type is a struct, the name of the struct */
    struct?: StructName;
  }>;
}

/** Describes a method in the contract. This interface is an extension of the interface described in ARC-4 */
interface Method {
  /** The name of the method */
  name: string;
  /** Optional, user-friendly description for the method */
  desc?: string;
  /** The arguments of the method, in order */
  args: Array<{
    /** The type of the argument */
    type: ABIType;
    /** If the type is a struct, the name of the struct */
    struct?: StructName;
    /** Optional, user-friendly name for the argument */
    name?: string;
    /** Optional, user-friendly description for the argument */
    desc?: string;
    /** The default value that clients should use. MUST be base64 encoded bytes */
    defaultValue?: string;
  }>;
  /** Information about the method's return value */
  returns: {
    /** The type of the return value, or "void" to indicate no return value. */
    type: ABIType;
    /** If the type is a struct, the name of the struct */
    struct?: StructName;
    /** Optional, user-friendly description for the return value */
    desc?: string;
  };
  /** an action is a combination of call/create and an OnComplete */
  actions: {
    /** OnCompletes this method allows when appID === 0 */
    create: ('NoOp' | 'OptIn' | 'DeleteApplication')[];
    /** OnCompletes this method allows when appID !== 0 */
    call: ('NoOp' | 'OptIn' | 'CloseOut' | 'ClearState' | 'UpdateApplication' | 'DeleteApplication')[];
  };
  /** If this method does not write anything to the ledger (ARC-22) */
  readonly: boolean;
  /** ARC-28 events that MAY be emitted by this method */
  events?: Array<Event>;
  /** Information that clients can use when calling the method */
  recommendations?: {
    /** The number of inner transactions the caller should cover the fees for */
    innerTransactionCount?: number;
    /** Recommended box references to include */
    boxes?: {
      /** The app ID for the box */
      app?: number;
      /** The base64 encoded box key */
      key: string;
      /** The number of bytes being read from the box */
      readBytes: number;
      /** The number of bytes being written to the box */
      writeBytes: number;
    };
    /** Recommended foreign accounts */
    accounts?: string[];
    /** Recommended foreign apps */
    apps?: number[];
    /** Recommended foreign assets */
    assets?: number[];
  };
}

/** Describes the entire contract. This interface is an extension of the interface described in ARC-4 */
export interface ARC56Contract {
  /** The ARCs used and/or supported by this contract. All contracts implicity support ARC4 and ARC56 */
  arcs: number[];
  /** A user-friendly name for the contract */
  name: string;
  /** Optional, user-friendly description for the interface */
  desc?: string;
  /**
   * Optional object listing the contract instances across different networks
   */
  networks?: {
    /**
     * The key is the base64 genesis hash of the network, and the value contains
     * information about the deployed contract in the network indicated by the
     * key. A key containing the human-readable name of the network MAY be
     * included, but the corresponding genesis hash key MUST also be defined
     */
    [network: string]: {
      /** The app ID of the deployed contract in this network */
      appID: number;
    };
  };
  /** Named structs use by the application */
  structs: { [structName: StructName]: StructFields };
  /** All of the methods that the contract implements */
  methods: Method[];
  state: {
    /** Defines the values that should be used for GlobalNumUint, GlobalNumByteSlice, LocalNumUint, and LocalNumByteSlice when creating the application  */
    schema: {
      global: {
        ints: number;
        bytes: number;
      };
      local: {
        ints: number;
        bytes: number;
      };
    };
    /** Mapping of human-readable names to StorageKey objects */
    keys: {
      global: { [name: string]: StorageKey };
      local: { [name: string]: StorageKey };
      box: { [name: string]: StorageKey };
    };
    /** Mapping of human-readable names to StorageMap objects */
    maps: {
      global: { [name: string]: StorageMap };
      local: { [name: string]: StorageMap };
      box: { [name: string]: StorageMap };
    };
  };
  /** Supported bare actions for the contract. An action is a combination of call/create and an OnComplete */
  bareActions: {
    /** OnCompletes this method allows when appID === 0 */
    create: ('NoOp' | 'OptIn' | 'DeleteApplication')[];
    /** OnCompletes this method allows when appID !== 0 */
    call: ('NoOp' | 'OptIn' | 'CloseOut' | 'ClearState' | 'UpdateApplication' | 'DeleteApplication')[];
  };
  /** Information about the TEAL */
  sourceInfo?: SourceInfo[];
  /** The pre-compiled TEAL that may contain template variables. MUST be omitted if included as part of ARC23, but otherwise MUST be defined. */
  source?: {
    /** The approval program */
    approval: string;
    /** The clear program */
    clear: string;
  };
  /** ARC-28 events that MAY be emitted by this contract */
  events?: Array<Event>;
  /** A mapping of template variable names as they appear in the teal (not including TMPL_ prefix) and their respecive types */
  templateVariables?: {
    [name: string]: ABIType | AVMBytes | StructName;
  };
}
`.trim();

export const classContent = `  appId: bigint;
algorand: AlgorandClient;
contract: algosdk.ABIContract;
defaultSender?: string;
appAddress: string;
arc56: ARC56Contract = JSON.parse(ARC56_JSON) as ARC56Contract;

constructor(p: {
  appId: bigint;
  algorand: AlgorandClient;
  defaultSender?: string;
}) {
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
    const errorMessage = this.arc56.sourceInfo?.find((s) =>
        s?.pc?.includes(pc)
    )?.errorMessage;

    if (errorMessage) {
      throw Error(
        \`Runtime error when executing \${this.arc56.name} (appId: \${this.appId}) in transaction \${txId}: \${errorMessage}\`
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
    .replace(/\\]/g, ")")
    .replace(/\\[/g, "(");
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
  const result = await this.algorand.client.algod.getApplicationByID(Number(this.appId)).do();

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
`;
