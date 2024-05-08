import { type ARC56Contract, type StructFields } from "./types/arc56";
import arc56Ref from "../example/ARC56Test.arc56.json";
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

    Object.values(this.arc56.templateVariables ?? {}).forEach((type) => {
      pushType(type);
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

    const structLines = Object.keys(this.arc56.structs).map((structName) => {
      if (structName.includes(" ")) {
        return "";
      } else {
        return `export type ${structName} = ${JSON.stringify(
          this.arc56.structs[structName],
          null,
          2
        )}`.replace(/"/g, "");
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
      lines.push(`  ${name}: ${this.arc56.templateVariables![name]},`);
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
        `${ocMap[oc]} = (methodParams: MethodParams = {}) => {`,
        "return {"
      );

      this.arc56.methods.forEach((m) => {
        if (!m.actions.call.includes(oc)) return;
        lines.push(
          `${m.name}: async (${m.args.map((a) => `${a.name}: ${a.struct ?? a.type}`)}): Promise<{ result: SendAtomicTransactionComposerResults; returnValue: ${m.returns.struct ?? m.returns.type}}> => {`
        );

        // return this.methodCall("foo", { ...methodParams, args: [inputs] });

        let methodName = `${ocMap[oc]}MethodCall`;
        if (oc === "NoOp") methodName = "methodCall";
        lines.push(
          `return this.${methodName}("${m.name}", { ...methodParams, args: [${m.args.map((a) => a.name).join(",")}] });`
        );
        lines.push("},");
      });

      lines.push("};");

      lines.push("};");
    });

    return lines;
  }

  getCreateLines() {
    const lines: string[] = [];

    if (this.arc56.templateVariables !== undefined) {
      lines.push(
        `create = (methodParams: MethodParams & { templateVariables: TemplateVariables; onComplete?: algosdk.OnApplicationComplete }) => {`
      );
    } else {
      lines.push(
        `create = (methodParams: MethodParams & { onComplete?: algosdk.OnApplicationComplete } = {}) => {`
      );
    }

    lines.push(`return {`);

    this.arc56.methods.forEach((m) => {
      if (m.actions.create.length === 0) return;
      lines.push(
        `${m.name}: async (${m.args.map((a) => `${a.name}: ${a.struct ?? a.type}`)}): Promise<{ result: SendAtomicTransactionComposerResults; returnValue: ${m.returns.struct ?? m.returns.type}; appId: bigint; appAddress: string}> => {`
      );

      lines.push(
        `return this.createMethodCall("${m.name}", { ...methodParams, args: [${m.args.map((a) => a.name).join(",")}] });`
      );

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
        `${m.name}: (${m.args.map((a) => `${a.name}: ${a.struct ?? a.type}`)}): MethodCallParams => {`
      );

      lines.push(
        `return this.getParams("${m.name}", { ...methodParams, args: [${m.args.map((a) => a.name).join(",")}] });`
      );
      lines.push("},");
    });

    lines.push("};");

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
                `${name}: async (address: string): Promise<${k.valueType}> => { return this.getState.key("${name}", address) },`
              );
            } else {
              lines.push(
                `${name}: async (): Promise<${k.valueType}> => { return this.getState.key("${name}") },`
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

            // return this.getState.map("localMap", key, address);
            if (storageType === "local") {
              lines.push(
                `value: async (address: string, key: ${m.keyType}): Promise<${m.valueType}> => { return this.getState.map("${name}", key, address) },`
              );
            } else {
              lines.push(
                `value: async (key: ${m.keyType}): Promise<${m.valueType}> => { return this.getState.map("${name}", key) },`
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
        `${m.name}: (rawValue: Uint8Array): ${m.returns.struct ?? m.returns.type} => {`
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

  ${staticContent.arc56TypeDefinitions}
  
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
      console.log(await format(content, { parser: "typescript" }));
    } catch (e) {
      console.log(content);
      throw e;
    }
  }
}

new ARC56Generator(arc56Ref as ARC56Contract).generate();
