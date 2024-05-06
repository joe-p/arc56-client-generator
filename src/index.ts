import nunjucks from "nunjucks";
import path from "path";
import { type ARC56Contract, type StructFields } from "./types/arc56";
import arc56Ref from "../reference/ref.arc56.json";
import algosdk from "algosdk";

/** Get all of the base ABI types used in this contract */
function getABITypes(arc56: ARC56Contract) {
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

  abiTypes.forEach((t) => {
    if (t.match(/^uint/)) typeMap.push({ abiType: t, tsType: "bigint" });
    if (t === "bytes") typeMap.push({ abiType: t, tsType: "string" }); // TODO: Also support Uint8Array
  });

  return typeMap;
}

export default function generate(arc56: ARC56Contract) {
  const abiTypes = getABITypes(arc56);

  console.log(abiTypes);

  const content = nunjucks.render(
    path.join(
      path.dirname(import.meta.url.replace("file:", "")),
      "..",
      "templates",
      "arc56_client.ts.njk"
    ),
    { typeMapping: abiTypes }
  );

  console.log(content);
}

generate(arc56Ref as ARC56Contract);
