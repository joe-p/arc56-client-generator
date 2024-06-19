import { type ARC56Contract, type StructFields } from "./types/arc56";
import algosdk from "algosdk";
import { format } from "prettier";
import * as staticContent from "./static_content";

export default class ARC56Generator {
  arc56: ARC56Contract;

  customTypes: string[] = [];

  constructor(arc56: ARC56Contract) {
    this.arc56 = arc56;
  }

  getTypeScriptType(type: string): string {
    // TODO: Fix imported types in TEALScript ARC56 generation
    return type
      .split(".")
      .at(-1)!
      .replace(/\[\d+\]/, "[]")
      .replaceAll("(", "[")
      .replaceAll(")", "]");
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
      if (type.match(/\[\d*\]$/)) {
        pushType(type.replace(/\[\d*\]$/, ""));
        return;
      }

      if (type.startsWith("(")) {
        const tupleType = algosdk.ABITupleType.from(
          type
        ) as algosdk.ABITupleType;

        tupleType.childTypes.forEach((t) => {
          pushType(t.toString());
        });

        return;
      }

      abiTypes.push(type);
    };

    Object.values(this.arc56.templateVariables ?? {}).forEach((t) => {
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
        Object.values(this.arc56.state.keys[storageType]).forEach((k) => {
          pushType(k.keyType);
          pushType(k.valueType);
        });

        Object.values(this.arc56.state.maps[storageType]).forEach((m) => {
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
      if (t.match(/^uint/)) {
        typeMap.push({ abiType: t, tsType: "bigint" });
      } else if (t === "bytes" || t === "byte") {
        // TODO: Also support Uint8Array
        typeMap.push({ abiType: t, tsType: "string" });
      } else if (t === "address") {
        typeMap.push({ abiType: t, tsType: "string" });
      } else if (t === "bool") {
        typeMap.push({ abiType: t, tsType: "boolean" });
      } else if (
        ["pay", "axfer", "afrz", "keyreg", "appl", "acfg"].includes(t)
      ) {
        typeMap.push({ abiType: t, tsType: "algosdk.Transaction" });
      } else {
        throw Error(`Unknown ABI type: ${t}`);
      }
    });

    const abiTypeLines = typeMap.map(
      (typeMap) => `type ${typeMap.abiType} = ${typeMap.tsType};`
    );

    return lines.concat(abiTypeLines);
  }

  getStructTypeLines() {
    if (Object.keys(this.arc56.structs).length === 0) return [];

    const structLines = Object.keys(this.arc56.structs).map((structName) => {
      if (structName.includes(" ")) {
        return "";
      } else {
        // TODO: Fix imported types in TEALScript ARC56 generation
        return `export type ${structName.split(".").at(-1)} = ${JSON.stringify(
          this.arc56.structs[structName],
          null,
          2
        )}`
          .replace(/"/g, "")
          .replaceAll("(", "[")
          .replaceAll(")", "]")
          .replace(/\[\d+\]/g, "[]");
      }
    });

    return ["// Type definitions for ARC56 structs"].concat(structLines);
  }

  getTemplateVariableTypeLines() {
    if (Object.keys(this.arc56.templateVariables ?? {}).length === 0) {
      return [];
    }

    const lines = [
      "/** Compile-time variables */",
      "export type TemplateVariables = {",
    ];

    Object.keys(this.arc56.templateVariables ?? {}).forEach((name) => {
      lines.push(`  ${name}: ${this.arc56.templateVariables![name].type},`);
    });

    lines.push("}");

    return lines;
  }

  getCallLines() {
    const lines: string[] = [];

    const ocMap = {
      NoOp: "call",
      OptIn: "optIn",
      CloseOut: "closeOut",
      ClearState: "clearState",
      UpdateApplication: "update",
      DeleteApplication: "delete",
    };

    (Object.keys(ocMap) as (keyof typeof ocMap)[]).forEach((oc) => {
      const numMethods = this.arc56.methods.filter((m) =>
        m.actions.call.includes(oc)
      ).length;

      if (numMethods === 0) return;

      lines.push(
        `${ocMap[oc]} = {`,
      );

      this.arc56.methods.forEach((m) => {
        if (!m.actions.call.includes(oc)) return;

        if (m.args.length === 0) {
          lines.push(
            `${m.name}: async (params?: MethodParams): Promise<{ result: SendAtomicTransactionComposerResults; returnValue: ${this.getTypeScriptType(m.returns.struct ?? m.returns.type)}}> => {`
          );
        } else {
          lines.push(
            `${m.name}: async (params: MethodParams & {args: { ${m.args.map((a) => `${a.name}: ${this.getTypeScriptType(a.struct ?? a.type)}`)}}}): Promise<{ result: SendAtomicTransactionComposerResults; returnValue: ${this.getTypeScriptType(m.returns.struct ?? m.returns.type)}}> => {`
          );
        }
      

        let methodName = `${ocMap[oc]}MethodCall`;
        if (oc === "NoOp") methodName = "methodCall";
        lines.push(
          `return this.${methodName}("${m.name}", { ...params, args: [${m.args.map((a) => "params.args." + a.name).join(",")}] });`
        );
        lines.push("},");
      });

      lines.push("};");

    });

    return lines;
  }

  getCreateLines() {
    const lines: string[] = [];

    lines.push(
      `create = {`
    );

    this.arc56.methods.forEach((m) => {
      if (m.actions.create.length === 0) return;
      lines.push(
        `${m.name}: async (params${m.args.length === 0 ? '?' : ''}: MethodParams & {
          ${ m.args.length > 0 ? `args: { ${m.args.map((a) => `${a.name}: ${this.getTypeScriptType(a.struct ?? a.type)}`)}},` : ''} 
          ${ this.arc56.templateVariables !== undefined ? `templateVariables: TemplateVariables` : ''}, 
          onComplete?: algosdk.OnApplicationComplete}
        ): Promise<{ result: SendAtomicTransactionComposerResults; returnValue: ${m.returns.struct ?? m.returns.type}; appId: bigint; appAddress: string}> => {`
      );

      lines.push(
        `return this.createMethodCall("${m.name}", { ...params, args: [${m.args.map((a) => "params.args." + a.name).join(",")}] });`
      );

      lines.push("},");
    });
    lines.push("};");

    return lines;
  }

  getParamsLines() {
    const lines = ["params = {"];

    this.arc56.methods.forEach((m) => {
      lines.push(
        `${m.name}: (
          params${m.args.length === 0 ? '?' : ''}: MethodParams & {
          ${ m.args.length > 0 ? `args: { ${m.args.map((a) => `${a.name}: ${this.getTypeScriptType(a.struct ?? a.type)}`)}},` : ''} 
          onComplete?: algosdk.OnApplicationComplete}
        ): MethodCallParams => {`
      );

      lines.push(
        `return this.getParams("${m.name}", { ...params, args: [${m.args.map((a) => "params.args." + a.name).join(",")}] });`
      );
      lines.push("},");
    });

    lines.push("};");

    return lines;
  }

  getStateLines(): string[] {
    if (Object.keys(this.arc56.state).length === 0) return [];
    const lines = ["state = {"];

    if (Object.keys(this.arc56.state.keys).length > 0) {
      lines.push("keys: {");

      (["global", "local", "box"] as ("global" | "local" | "box")[]).forEach(
        (storageType) => {
          Object.keys(this.arc56.state.keys[storageType]).forEach((name) => {
            const k = this.arc56.state.keys[storageType][name];
            if (storageType === "local") {
              lines.push(
                `${name}: async (address: string): Promise<${this.getTypeScriptType(k.valueType)}> => { return this.getState.key("${name}", address) },`
              );
            } else {
              lines.push(
                `${name}: async (): Promise<${this.getTypeScriptType(k.valueType)}> => { return this.getState.key("${name}") },`
              );
            }
          });
        }
      );

      lines.push("},");
    }

    if (Object.keys(this.arc56.state.maps).length > 0) {
      lines.push("maps: {");

      (["global", "local", "box"] as ("global" | "local" | "box")[]).forEach(
        (storageType) => {
          Object.keys(this.arc56.state.maps[storageType]).forEach((name) => {
            const m = this.arc56.state.maps[storageType][name];
            lines.push(`${name}: {`);

            if (storageType === "local") {
              lines.push(
                `value: async (address: string, key: ${this.getTypeScriptType(m.keyType)}): Promise<${this.getTypeScriptType(m.valueType)}> => { return this.getState.map.value("${name}", key, address) },`
              );
            } else {
              lines.push(
                `value: async (key: ${this.getTypeScriptType(m.keyType)}): Promise<${this.getTypeScriptType(m.valueType)}> => { return this.getState.map.value("${name}", key) },`
              );
            }

            lines.push("},");
          });
        }
      );
    }
    lines.push("},");
    lines.push("};");

    return lines;
  }

  getDecodeReturnValueLines() {
    if (this.arc56.methods.every((m) => m.returns.type === "void")) return [];

    const lines = ["decodeReturnValue = {"];

    this.arc56.methods.forEach((m) => {
      if (m.returns.type === "void") return;

      lines.push(
        `${m.name}: (rawValue: Uint8Array): ${this.getTypeScriptType(m.returns.struct ?? m.returns.type)} => {`
      );

      lines.push(`return this.decodeMethodReturnValue("${m.name}", rawValue);`);

      lines.push("},");
    });

    lines.push("};");

    return lines;
  }

  async generate() {
    const content = `
  ${staticContent.importsAndMethodParams}

  const ARC56_JSON = \`${JSON.stringify(this.arc56)}\`
  
  ${this.getABITypeLines().join("\n")}

  ${this.getStructTypeLines().join("\n")}
  
  ${this.getTemplateVariableTypeLines().join("\n")}

  export class ${this.arc56.name}Client extends ARC56AppClient {

  ${staticContent.consructor}

  ${this.getParamsLines().join("\n")}

  ${this.getCallLines().join("\n")}

  ${this.getCreateLines().join("\n")}

  ${this.getStateLines().join("\n")}

  ${this.getDecodeReturnValueLines().join("\n")}
  }

  export default ${this.arc56.name}Client;

  `.trim();

    // console.log(content);
    try {
      return await format(content, { parser: "typescript" });
    } catch (e) {
      console.debug(content);
      throw Error(`Error formatting generated code: ${e}`);
    }
  }
}
