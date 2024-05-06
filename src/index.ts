import { type ARC56Contract, type StructFields } from "./types/arc56";
import arc56Ref from "../reference/ref.arc56.json";
import algosdk from "algosdk";
import { format } from "prettier";
import type { Struct } from "@algorandfoundation/algokit-utils/types/app-spec";

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

  async generate() {
    const content = `
  import { AlgorandClient } from "@algorandfoundation/algokit-utils";
  import AlgokitComposer, { type MethodCallParams } from "@algorandfoundation/algokit-utils/types/composer";
  import algosdk from "algosdk";
  import { type SendAtomicTransactionComposerResults } from "@algorandfoundation/algokit-utils/types/transaction";
  
  type MethodParams = Omit<MethodCallParams,"args" | "appId" | "method" | "sender"> & { sender?: string };
  
  ${this.getABITypeLines().join("\n")}
  
  ${this.getStructTypeLines().join("\n")}
  
  ${this.getTemplateVariableTypeLines().join("\n")}

  ${this.getStructToArrayLines().join("\n")}
  
  `.trim();
    console.log(await format(content, { parser: "typescript" }));
  }
}

new ARC56Generator(arc56Ref as ARC56Contract).generate();
