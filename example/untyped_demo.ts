import { ARC56AppClient } from "../src/arc56_client";
import arc56 from "./ARC56Test.arc56.json";
import { type ARC56Contract } from "../src/types/arc56";

import {
  AlgorandClient,
  microAlgos,
  Config,
} from "@algorandfoundation/algokit-utils";

Config.configure({ populateAppCallResources: true });

async function main() {
  const algorand = AlgorandClient.defaultLocalNet();
  const defaultSender = (await algorand.account.localNetDispenser()).addr;

  const appClient = new ARC56AppClient({
    appId: 0n,
    algorand,
    defaultSender,
    arc56: arc56 as ARC56Contract,
  });

  const { appId, appAddress } = await appClient.createMethodCall(
    "createApplication",
    {
      templateVariables: { someNumber: 1337n },
    }
  );
  console.log("App ID:", appId, "App Address:", appAddress);

  const inputs = { add: { a: 1n, b: 2n }, subtract: { a: 10n, b: 5n } };

  // Call the app with default sender
  const outputs = await appClient.methodCall("foo", { args: [inputs] });
  const { sum, difference } = outputs.returnValue;
  console.log("sum:", sum, "difference:", difference);

  // Call the app with a different sender
  const bob = algorand.account.random().addr;

  await algorand.send.payment({
    sender: defaultSender,
    receiver: bob,
    amount: microAlgos(10_000_000),
  });

  const bobOutputs = await appClient.methodCall("foo", {
    sender: bob,
    args: [inputs],
  });

  const { sum: bobSum, difference: bobDifference } = bobOutputs.returnValue;
  console.log("bobSum:", bobSum, "bobDifference:", bobDifference);

  // Overwrite some of the transaction fields
  await appClient.methodCall("foo", {
    // The number of rounds between firstValid and lastValid will be 50
    // This is also used to determine how long the client should wait for confirmation
    validityWindow: 50,
    note: "Hello world",
    args: [inputs],
  });

  const anotherAppClient = new ARC56AppClient({
    appId: 0n,
    algorand,
    defaultSender: bob,
    arc56: arc56 as ARC56Contract,
  });

  const { appId: anoterAppId, appAddress: anotherAppAddress } =
    await anotherAppClient.createMethodCall("createApplication", {
      templateVariables: { someNumber: 1337n },
    });
  console.log("App ID:", anoterAppId, "App Address:", anotherAppAddress);

  // Composer together multiple appClients
  const result = await algorand
    .newGroup()
    .addMethodCall(
      // Use the extraFee on the main client to cover the fee for the other client
      appClient.getParams("foo", {
        extraFee: microAlgos(1_000),
        args: [inputs],
      })
    )
    .addMethodCall(
      anotherAppClient.getParams("foo", {
        staticFee: microAlgos(0),
        args: [inputs],
      })
    )
    .execute();

  const { sum: firstSum } = appClient.decodeMethodReturnValue(
    "foo",
    result.returns![0].rawReturnValue!
  );

  const { sum: secondSum } = appClient.decodeMethodReturnValue(
    "foo",
    result.returns![1].rawReturnValue!
  );

  console.log("first sum:", firstSum, "second sum:", secondSum);

  // TODO: Figure out why this isn't working
  try {
    // This will throw an error
    await appClient.methodCall("foo", {
      args: [{ subtract: { a: 1n, b: 100n }, add: { a: 1n, b: 2n } }],
    });
  } catch (e) {
    // We got a human error message! Error: Runtime error when executing ARC56Test (appId: 6814) in transaction DEFDPU2NOGXPMNKTHJLRI5CWLDRYRHQDBMF5HXPJ3E74GWOVKNSA: subtract.a must be greater than subtract.b
    console.log(`We got a human error message! ${e}`);
  }

  console.log("globalKey", await appClient.getState.key("globalKey"));

  console.log(
    "globalMap -> foo",
    await await appClient.getState.map("globalMap", "foo")
  );

  await algorand.send.payment({
    sender: defaultSender,
    receiver: appAddress,
    amount: microAlgos(1_000_000),
  });

  await appClient.optInMethodCall("optInToApplication");

  console.log(
    "localKey",
    await appClient.getState.key("localKey", defaultSender)
  );

  console.log(
    "localMap",
    await appClient.getState.map("localMap", "foo", defaultSender)
  );

  console.log("boxKey", await appClient.getState.key("boxKey"));
  console.log(
    "boxMap",
    await appClient.getState.map("boxMap", {
      add: { a: 1n, b: 2n },
      subtract: { a: 4n, b: 3n },
    })
  );
}

main();
