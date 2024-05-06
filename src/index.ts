import { type ARC56Contract, type StructFields } from "./types/arc56";
import arc56Ref from "../reference/ref.arc56.json";
import algosdk from "algosdk";

function getABITypeLines(arc56: ARC56Contract) {
  const abiTypes: string[] = [];

  const pushType = (type: string) => {
    // If we already have this type, skip
    if (abiTypes.includes(type)) return;

    // void and string are the same types in TS
    if (["void", "string"].includes(type)) return;

    // Skip structs
    if (arc56.structs[type]) return;

    // If this is an array type, push the base type
    if (type.match(/\[\d+\]$/)) {
      pushType(type.replace(/\[\d+\]$/, ""));
    }

    if (type.startsWith("(")) {
      const tupleType = algosdk.ABITupleType.from(type) as algosdk.ABITupleType;

      tupleType.childTypes.forEach((t) => {
        pushType(t.toString());
      });
    } else {
      abiTypes.push(type);
    }
  };

  arc56.templateVariables?.forEach((t) => {
    pushType(t.type);
  });

  arc56.methods.forEach((m) => {
    m.args.forEach((a) => {
      pushType(a.type);
    });

    pushType(m.returns.type);
  });

  (["global", "local", "box"] as ["global", "local", "box"]).forEach(
    (storageType) => {
      arc56.state.keys[storageType].forEach((k) => {
        pushType(k.keyType);
        pushType(k.valueType);
      });

      arc56.state.maps[storageType].forEach((m) => {
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

  Object.values(arc56.structs).forEach((sf) => {
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

function getStructTypeLines(arc56: ARC56Contract) {
  if (Object.keys(arc56.structs).length === 0) return [];

  const lines = ["// Type definitions for ARC56 structs"];

  let customTypeCounter = 0;

  const structLines = Object.keys(arc56.structs).map((structName) => {
    if (structName.includes(" ")) {
      return `export type CustomType${customTypeCounter++} = ${JSON.stringify(
        arc56.structs[structName],
        null,
        2
      )}`.replace(/"/g, "");
    } else {
      return `export type ${structName} = ${JSON.stringify(
        arc56.structs[structName],
        null,
        2
      )}`.replace(/"/g, "");
    }
  });

  return lines.concat(structLines);
}

function getTemplateVariableTypeLines(arc56: ARC56Contract) {
  if (
    arc56.templateVariables === undefined ||
    arc56.templateVariables.length === 0
  ) {
    return [];
  }

  const lines = [
    "/** Compile-time variables */",
    "export type TemplateVariables = {",
  ];

  arc56.templateVariables.forEach((tv) => {
    lines.push(`  ${tv.name}: ${tv.type},`);
  });

  lines.push("}");

  return lines;
}

export default function generate(arc56: ARC56Contract) {
  const content = `
import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import AlgokitComposer, { type MethodCallParams } from "@algorandfoundation/algokit-utils/types/composer";
import algosdk from "algosdk";
import { type SendAtomicTransactionComposerResults } from "@algorandfoundation/algokit-utils/types/transaction";

type MethodParams = Omit<MethodCallParams,"args" | "appId" | "method" | "sender"> & { sender?: string };

${getABITypeLines(arc56).join("\n")}

${getStructTypeLines(arc56).join("\n")}

${getTemplateVariableTypeLines(arc56).join("\n")}

`.trim();
  console.log(content);
}

generate(arc56Ref as ARC56Contract);
