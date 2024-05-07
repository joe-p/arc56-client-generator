import { type ARC56Contract, type StructFields } from "./types/arc56";
import arc56Ref from "../reference/ref.arc56.json";
import algosdk from "algosdk";
import { format } from "prettier";
import * as staticContent from "./static_content";

class ARC56Generator {
  arc56: ARC56Contract;

  customTypes: string[] = [];

  constructor(arc56: ARC56Contract) {
    this.arc56 = arc56;
  }

  getABITypeLines() {
    const abiTypes: string[] = [];

    const pushType = (type: string) => {
      // If we already have this type, skip
      if (abiTypes.includes(type)) return;

      // void and string are the same types in TS
      if (["void", "string"].includes(type)) return;

      // Skip structs
      if (this.arc56.structs[type]) return;

      // If this is an array type, push the base type
      if (type.match(/\[\d+\]$/)) {
        pushType(type.replace(/\[\d+\]$/, ""));
      }

      if (type.startsWith("(")) {
        const tupleType = algosdk.ABITupleType.from(
          type
        ) as algosdk.ABITupleType;

        tupleType.childTypes.forEach((t) => {
          pushType(t.toString());
        });
      } else {
        abiTypes.push(type);
      }
    };

    this.arc56.templateVariables?.forEach((t) => {
      pushType(t.type);
    });

    this.arc56.methods.forEach((m) => {
      m.args.forEach((a) => {
        pushType(a.type);
      });

      pushType(m.returns.type);
    });

    (["global", "local", "box"] as ["global", "local", "box"]).forEach(
      (storageType) => {
        this.arc56.state.keys[storageType].forEach((k) => {
          pushType(k.keyType);
          pushType(k.valueType);
        });

        this.arc56.state.maps[storageType].forEach((m) => {
          pushType(m.keyType);
          pushType(m.valueType);
        });
      }
    );

    const pushStructFields = (fields: StructFields) => {
      Object.values(fields).forEach((sf) => {
        if (typeof sf === "string") pushType(sf);
        else pushStructFields(sf);
      });
    };

    Object.values(this.arc56.structs).forEach((sf) => {
      pushStructFields(sf);
    });

    const typeMap: { abiType: string; tsType: string }[] = [];

    const lines = ["// Aliases for non-encoded ABI values"];
    abiTypes.forEach((t) => {
      if (t.match(/^uint/)) typeMap.push({ abiType: t, tsType: "bigint" });
      if (t === "bytes") typeMap.push({ abiType: t, tsType: "string" }); // TODO: Also support Uint8Array
    });

    const abiTypeLines = typeMap.map(
      (typeMap) => `type ${typeMap.abiType} = ${typeMap.tsType};`
    );

    return lines.concat(abiTypeLines);
  }

  getStructTypeLines() {
    if (Object.keys(this.arc56.structs).length === 0) return [];

    const lines = ["// Type definitions for ARC56 structs"];

    let customTypeCounter = 0;

    const structLines = Object.keys(this.arc56.structs).map((structName) => {
      if (structName.includes(" ")) {
        this.customTypes.push(structName);
        return `export type CustomType${customTypeCounter++} = ${JSON.stringify(
          this.arc56.structs[structName],
          null,
          2
        )}`.replace(/"/g, "");
      } else {
        return `export type ${structName} = ${JSON.stringify(
          this.arc56.structs[structName],
          null,
          2
        )}`.replace(/"/g, "");
      }
    });

    return lines.concat(structLines);
  }

  getTemplateVariableTypeLines() {
    if (
      this.arc56.templateVariables === undefined ||
      this.arc56.templateVariables.length === 0
    ) {
      return [];
    }

    const lines = [
      "/** Compile-time variables */",
      "export type TemplateVariables = {",
    ];

    this.arc56.templateVariables.forEach((tv) => {
      lines.push(`  ${tv.name}: ${tv.type},`);
    });

    lines.push("}");

    return lines;
  }

  structFieldsToTypeScriptType(fields: StructFields): string {
    const types: string[] = [];
    Object.values(fields).forEach((sf) => {
      if (typeof sf === "string") types.push(sf);
      else types.push(this.structFieldsToTypeScriptType(sf));
    });

    return `[${types.join(",")}]`;
  }

  structFieldsToABIType(fields: StructFields): string {
    return this.structFieldsToTypeScriptType(fields)
      .replace(/ /g, "")
      .replace(/\[/g, "(")
      .replace(/]/g, ")");
  }

  // Thanks to Claude 3 Opus...
  structFieldsToNestedArray(fields: StructFields, prefix: string = ""): string {
    function processObject(obj: StructFields, currentPrefix: string): string {
      const keys = Object.keys(obj);
      if (keys.length === 0) {
        return "";
      }

      let result = "";
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const value = obj[key];

        const newPrefix = currentPrefix ? `${currentPrefix}.${key}` : key;

        if (typeof value === "object" && value !== null) {
          result += `[${processObject(value, newPrefix)}]`;
        } else {
          result += newPrefix;
        }

        if (i < keys.length - 1) {
          result += ",";
        }
      }

      return result;
    }

    return `[${processObject(fields, prefix)}]`;
  }

  getStructToArrayLines() {
    const lines: string[] = [
      "// Convert ARC56 structs to arrays primarily for passing as methodArgs",
    ];

    Object.keys(this.arc56.structs).forEach((structName) => {
      let typeName = structName;
      if (structName.includes(" ")) {
        typeName = `CustomType${this.customTypes.findIndex((ct) => ct === structName)}`;
      }

      lines.push(
        `export function ${typeName}ToArray(${typeName.toLowerCase()}: ${typeName}): ${this.structFieldsToTypeScriptType(
          this.arc56.structs[structName]
        )} {`
      );

      lines.push(
        `return ${this.structFieldsToNestedArray(
          this.arc56.structs[structName],
          typeName.toLocaleLowerCase()
        )}`
      );
      lines.push("}\n");
    });

    return lines;
  }

  getLinesForArrayToStruct(
    structFields: StructFields,
    lines: string[],
    prefix = ""
  ) {
    let index = 0;

    if (prefix === "") lines.push("return {");
    Object.keys(structFields).forEach((sf) => {
      if (typeof structFields[sf] === "string") {
        lines.push(`${sf}: decoded${prefix}[${index}],`);
      } else {
        lines.push(`${sf}: {`);
        this.getLinesForArrayToStruct(
          // @ts-expect-error TODO: Fix this
          structFields[sf],
          lines,
          `${prefix}[${index}]`
        );
      }
      index++;
    });
    if (prefix) lines.push("},");
    else lines.push("}");
  }

  getBinaryToStructLines() {
    if (Object.keys(this.arc56.structs).length === 0) return [];

    const lines = ["// Binary To Structs"];

    Object.keys(this.arc56.structs).forEach((structName) => {
      let typeName = structName;
      if (structName.includes(" ")) {
        typeName = `CustomType${this.customTypes.findIndex((ct) => ct === structName)}`;
      }

      lines.push(
        `export function rawValueTo${typeName}(rawValue: Uint8Array): ${typeName} {`
      );

      const abiType = this.structFieldsToABIType(
        this.arc56.structs[structName]
      );

      const tsType = this.structFieldsToTypeScriptType(
        this.arc56.structs[structName]
      );

      lines.push(
        `const decoded = algosdk.ABITupleType.from("${abiType}").decode(rawValue).valueOf() as ${tsType}\n`
      );

      this.getLinesForArrayToStruct(this.arc56.structs[structName], lines);

      lines.push("}\n");
    });

    return lines;
  }

  getCompileProgramLines() {
    if (this.arc56.source === undefined) return [];

    if (this.arc56.templateVariables?.length === 0) {
      return staticContent.noTemplateVarsCompileProgram.split("\n");
    }

    const lines = [
      `async compileProgram(algorand: AlgorandClient, program: "clear" | "approval", templateVars: TemplateVariables) {`,
      `let tealString = Buffer.from(this.arc56.source![program], "base64").toString();`,
    ];

    this.arc56.templateVariables?.forEach((tv) => {
      lines.push(
        `tealString = tealString.replace(/pushint TMPL_${tv.name}/g, \`pushint \${templateVars["${tv.name}"].toString()}\`)`
      );
    });

    lines.push(
      `const result = await algorand.client.algod.compile(tealString).do();`,
      `return new Uint8Array(Buffer.from(result.result, "base64"));`,
      `}`
    );

    return lines;
  }

  getCallLines() {
    const lines = ["call = (methodParams: MethodParams = {}) => {", "return {"];

    this.arc56.methods.forEach((m) => {
      if (m.actions.call.length === 0) return;
      lines.push(
        `${m.name}: async (${m.args.map((a) => `${a.name}: ${a.struct || a.type}`)}): Promise<{ result: SendAtomicTransactionComposerResults; returnValue: ${m.returns.struct || m.returns.type}}> => {`
      );

      const logic = `
      const group = this.algorand.newGroup();
      group.addMethodCall({
        ...this.params(methodParams).${m.name}(${m.args.map((a) => a.name).join(",")}),
      });

      const result = await this.executeWithErrorParsing(group);

      return {
        result,
        returnValue: rawValueToOutputs(result.returns![0].rawReturnValue!),
      };`;

      lines.push(...logic.split("\n"));
      lines.push("},");
    });

    lines.push("};");

    lines.push("};");
    return lines;
  }

  getCreateLines() {
    const lines: string[] = [];

    if (this.arc56.templateVariables !== undefined) {
      lines.push(
        `create = (methodParams: MethodParams & { templateVariables: TemplateVariables }) => {`
      );
    } else {
      lines.push(`create = (methodParams: MethodParams = {}) => {`);
    }

    lines.push(`return {`);

    this.arc56.methods.forEach((m) => {
      if (m.actions.create.length === 0) return;
      lines.push(
        `${m.name}: async (${m.args.map((a) => `${a.name}: ${a.struct || a.type}`)}): Promise<{ result: SendAtomicTransactionComposerResults; returnValue: ${m.returns.struct || m.returns.type}; appId: bigint; appAddress: string}> => {`
      );

      const logic = `
      if (this.appId !== 0n) {
        throw Error(
          \`Create was called but the app has already been created: \${this.appId.toString()}\`
        );
      }

      // TODO: fix bug in AlgorandClient with schema
      const group = this.algorand.newGroup();
      group.addMethodCall({
        schema: {
          globalByteSlices: this.arc56.state.schema.global.bytes,
          globalUints: this.arc56.state.schema.global.ints,
          localByteSlices: this.arc56.state.schema.local.bytes,
          localUints: this.arc56.state.schema.local.ints,
        },
        approvalProgram: await this.compileProgram(
          this.algorand,
          "approval",
          ${this.arc56.templateVariables === undefined ? "" : "methodParams.templateVariables"}
        ),
        clearProgram: await this.compileProgram(
          this.algorand,
          "clear",
          ${this.arc56.templateVariables === undefined ? "" : "methodParams.templateVariables"}
        ),
        ...this.params(methodParams).${m.name}(${m.args.map((a) => a.name).join(",")}),
      });

      const result = await this.executeWithErrorParsing(group);

      this.appId = BigInt(result.confirmations.at(-1)!.applicationIndex!);
      this.appAddress = algosdk.getApplicationAddress(this.appId);

      return {
        appId: this.appId,
        appAddress: this.appAddress,
        result,
        `.trim();

      lines.push(...logic.split("\n"));

      if (m.returns.type !== "void") {
        lines.push(
          "returnValue: rawValueToOutputs(result.returns![0].rawReturnValue!),"
        );
      } else {
        lines.push("returnValue: undefined,");
      }

      lines.push("};");

      lines.push("},");
    });
    lines.push("};");
    lines.push("};");

    return lines;
  }

  getParamsLines() {
    const lines = ["params = (methodParams?: MethodParams) => {", "return {"];

    this.arc56.methods.forEach((m) => {
      lines.push(
        `${m.name}: (${m.args.map((a) => `${a.name}: ${a.struct || a.type}`)}): MethodCallParams => {`
      );

      const args = m.args
        .map((a) => {
          if (a.struct) {
            return `${a.struct}ToArray(${a.name})`;
          } else {
            return a.name;
          }
        })
        .join(", ");

      const logic = `
      const sender = methodParams?.sender ?? this.defaultSender;

      if (sender === undefined) {
        throw new Error("No sender provided");
      }

      return {
        sender,
        appId: this.appId,
        method: this.contract.getMethodByName("${m.name}")!,
        args: [${args}],
        ...methodParams,
      };`;

      lines.push(...logic.split("\n"));
      lines.push("},");
    });

    lines.push("};");

    lines.push("};");
    return lines;
  }

  getTypeScriptType(type: string): string {
    if (this.arc56.structs[type]) {
      if (type.includes(" ")) {
        return `CustomType${this.customTypes.findIndex((ct) => ct === type)}`;
      }

      return type;
    }

    return type;
  }

  getABIType(type: string): string {
    if (this.arc56.structs[type]) {
      return this.structFieldsToABIType(this.arc56.structs[type]);
    }

    return type;
  }

  getStateLines(): string[] {
    if (Object.keys(this.arc56.state).length === 0) return [];
    const lines = ["state = {"];

    if (Object.keys(this.arc56.state.keys).length > 0) {
      lines.push("keys: {");

      // TODO: Box and Local
      // TODO: Custom key/value types
      (["global"] as "global"[]).forEach((storageType) => {
        this.arc56.state.keys[storageType].forEach((k) => {
          lines.push(
            `${k.name}: async (): Promise<${this.getTypeScriptType(k.valueType)}> => {`
          );

          lines.push(`return getGlobalStateValue(
            "${k.key}", 
            this.algorand.client.algod,
            this.appId
          ) as Promise<${this.getTypeScriptType(k.valueType)}>;`);
          lines.push("},");
        });
      });

      lines.push("},");
    }

    if (Object.keys(this.arc56.state.maps).length > 0) {
      lines.push("maps: {");

      // TODO: Box and Local
      // TODO: Custom key/value types
      (["global"] as "global"[]).forEach((storageType) => {
        this.arc56.state.maps[storageType].forEach((m) => {
          lines.push(`${m.name}: {`);

          lines.push(
            `value: async (key: ${this.getTypeScriptType(m.keyType)}): Promise<${this.getTypeScriptType(m.valueType)}> => {`
          );

          lines.push(
            `const encodedKey = algosdk.ABIType.from("${this.getABIType(m.keyType)}").encode(key);`
          );

          if (m.prefix) {
            lines.push(
              `const fullKey = Buffer.concat([Buffer.from("${m.prefix}"), Buffer.from(encodedKey)]);`
            );
          }

          // TODO: Non-struct value
          if (this.arc56.structs[m.valueType]) {
            lines.push(
              `return rawValueTo${this.getTypeScriptType(m.valueType)}(
                (await getGlobalStateValue(
                  Buffer.from(${m.prefix ? "fullKey" : "encodedKey"}).toString("base64"),
                  this.algorand.client.algod,
                  this.appId
                )) as Uint8Array
              );`
            );
          }

          lines.push("},");
          lines.push("},");
        });
      });
    }
    lines.push("},");
    lines.push("};");

    return lines;
  }

  async generate() {
    const content = `
  ${staticContent.importsAndMethodParams}

  const ARC56_JSON = \`${JSON.stringify(this.arc56)}\`

  ${staticContent.arc56TypeDefinitions}

  ${staticContent.getGlobalStateValue}
  
  ${this.getABITypeLines().join("\n")}
  
  ${this.getStructTypeLines().join("\n")}
  
  ${this.getTemplateVariableTypeLines().join("\n")}

  ${this.getStructToArrayLines().join("\n")}

  ${this.getBinaryToStructLines().join("\n")}

  export class ${this.arc56.name} {

  ${staticContent.classContent}

  ${this.getCompileProgramLines().join("\n")}

  ${this.getParamsLines().join("\n")}

  ${this.getCallLines().join("\n")}

  ${this.getCreateLines().join("\n")}

  ${this.getStateLines().join("\n")}
  }
  `.trim();

    // console.log(content);
    try {
      console.log(await format(content, { parser: "typescript" }));
    } catch (e) {
      console.log(content);
      throw e;
    }
  }
}

new ARC56Generator(arc56Ref as ARC56Contract).generate();
