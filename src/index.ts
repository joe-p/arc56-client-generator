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
        returnValue: this.getTypeScriptValue("${m.returns.struct ?? m.returns.type}", result.returns![0].rawReturnValue!),
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
        `${m.name}: async (${m.args.map((a) => `${a.name}: ${a.struct || a.type}`)}): Promise<{ result: SendAtomicTransactionComposerResults; returnValue: ${m.returns.struct ?? m.returns.type}; appId: bigint; appAddress: string}> => {`
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
          `returnValue: this.getTypeScriptValue("${m.returns.struct ?? m.returns.type}", result.returns![0].rawReturnValue!)`
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
          return `this.getABIValue("${a.struct ?? a.type}", ${a.name})`;
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

  getStateLines(): string[] {
    if (Object.keys(this.arc56.state).length === 0) return [];
    const lines = ["state = {"];

    if (Object.keys(this.arc56.state.keys).length > 0) {
      lines.push("keys: {");

      // TODO: Box and Local
      (["global"] as "global"[]).forEach((storageType) => {
        this.arc56.state.keys[storageType].forEach((k) => {
          lines.push(`${k.name}: async (): Promise<${k.valueType}> => {`);

          lines.push(`return await this.getGlobalStateValue(
            "${k.key}",
            this.algorand.client.algod,
            this.appId,
            "${k.valueType}"
          );`);
          lines.push("},");
        });
      });

      lines.push("},");
    }

    if (Object.keys(this.arc56.state.maps).length > 0) {
      lines.push("maps: {");

      // TODO: Box and Local
      (["global"] as "global"[]).forEach((storageType) => {
        this.arc56.state.maps[storageType].forEach((m) => {
          lines.push(`${m.name}: {`);

          lines.push(
            `value: async (key: ${m.keyType}): Promise<${m.valueType}> => {`
          );

          if (m.prefix) {
            lines.push(
              `const encodedKey = Buffer.concat([Buffer.from("${m.prefix}"), this.getABIEncodedValue(key, "${m.keyType}")]);`
            );
          } else {
            lines.push(
              `const encodedKey = this.getABIEncodedValue(key, "${m.keyType}");`
            );
          }

          lines.push(`return await this.getGlobalStateValue(
            Buffer.from(encodedKey).toString("base64"),
            this.algorand.client.algod,
            this.appId,
            "${m.valueType}"
          );`);

          lines.push("},");
          lines.push("},");
        });
      });
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

      lines.push(
        `return this.getTypeScriptValue("${m.returns.struct ?? m.returns.type}", rawValue);`
      );

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

  export class ${this.arc56.name} {

  ${staticContent.classContent}

  ${this.getCompileProgramLines().join("\n")}

  ${this.getParamsLines().join("\n")}

  ${this.getCallLines().join("\n")}

  ${this.getCreateLines().join("\n")}

  ${this.getStateLines().join("\n")}

  ${this.getDecodeReturnValueLines().join("\n")}
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
