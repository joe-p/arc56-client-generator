import ARC56TestClient, { type Inputs } from "./ARC56TestClient";
import {
  AlgorandClient,
  microAlgos,
  Config,
} from "@algorandfoundation/algokit-utils";

Config.configure({ populateAppCallResources: true });

async function main() {
  const algorand = AlgorandClient.defaultLocalNet();
  const defaultSender = (await algorand.account.localNetDispenser()).addr;

  const appClient = new ARC56TestClient({
    algorand,
    appId: 0n,
    defaultSender,
  });

  const { appId, appAddress } = await appClient
    .create
    .createApplication({ templateVariables: { someNumber: 1337n } });
  console.log("App ID:", appId, "App Address:", appAddress);

  const inputs: Inputs = { add: { a: 1n, b: 2n }, subtract: { a: 10n, b: 5n } };

  // Call the app with default sender
  const outputs = await appClient.call.foo({args: {inputs}});
  const { sum, difference } = outputs.returnValue;
  console.log("sum:", sum, "difference:", difference);

  // Call the app with a different sender
  const bob = algorand.account.random().addr;

  await algorand.send.payment({
    sender: defaultSender,
    receiver: bob,
    amount: microAlgos(10_000_000),
  });

  const bobOutputs = await appClient.call.foo({ args: { inputs }, sender: bob });
  const { sum: bobSum, difference: bobDifference } = bobOutputs.returnValue;
  console.log("bobSum:", bobSum, "bobDifference:", bobDifference);

  // Overwrite some of the transaction fields
  await appClient
    .call
    .foo({
      args: { inputs },
      // The number of rounds between firstValid and lastValid will be 50
      // This is also used to determine how long the client should wait for confirmation
      validityWindow: 50,
      note: "Hello world",
    });

  const anotherAppClient = new ARC56TestClient({
    algorand,
    appId: 0n,
    defaultSender: bob,
  });

  const { appId: anoterAppId, appAddress: anotherAppAddress } =
    await anotherAppClient
      .create
      .createApplication({ templateVariables: { someNumber: 1337n } });
  console.log("App ID:", anoterAppId, "App Address:", anotherAppAddress);

  // Composer together multiple appClients
  const result = await algorand
    .newGroup()
    .addMethodCall(
      appClient.paramsForComposer.foo({ args: { inputs }, extraFee: microAlgos(1_000) })
    )
    .addMethodCall(
      anotherAppClient.paramsForComposer.foo({ args: { inputs }, staticFee: microAlgos(0) })
    )
    .execute();

  const { sum: firstSum } = appClient.decodeReturnValue.foo(
    result.returns![0].rawReturnValue!
  );

  const { sum: secondSum } = appClient.decodeReturnValue.foo(
    result.returns![1].rawReturnValue!
  );

  console.log("first sum:", firstSum, "second sum:", secondSum);

  try {
    // This will throw an error
    await appClient
      .call
      .foo({args: { inputs: { subtract: { a: 1n, b: 100n }, add: { a: 1n, b: 2n } } }});
  } catch (e) {
    // We got a human error message! Error: Runtime error when executing ARC56Test (appId: 6814) in transaction DEFDPU2NOGXPMNKTHJLRI5CWLDRYRHQDBMF5HXPJ3E74GWOVKNSA: subtract.a must be greater than subtract.b
    console.log(`We got a human error message! ${e}`);
  }

  console.log("globalKey", await appClient.state.keys.globalKey());

  console.log(
    "globalMap -> foo",
    await appClient.state.maps.globalMap.value("foo")
  );

  await algorand.send.payment({
    sender: defaultSender,
    receiver: appAddress,
    amount: microAlgos(1_000_000),
  });

  await appClient.optIn.optInToApplication();

  console.log("localKey", await appClient.state.keys.localKey(defaultSender));

  console.log(
    "localMap",
    await appClient.state.maps.localMap.value(defaultSender, "foo")
  );

  console.log("boxKey", await appClient.state.keys.boxKey());
  console.log(
    "boxMap",
    await appClient.state.maps.boxMap.value({
      add: { a: 1n, b: 2n },
      subtract: { a: 4n, b: 3n },
    })
  );
}

await main();
