# ARC56 Client Generator

This repo contains a proof of concept for taking an ARC56 JSON spec and using it to interact with an app. The contents of this repo are intended to be integrated into algokit-utils and the algokit client generator.

Full example of the generic untyped client and generated typed client can be found in [example/](./example)

## Source Contract

To see the TEALScript contract that is being used in the examples, see [examples/arc56_test.algo.ts](./example/arc56_test.algo.ts)

## ARC56AppClient

The [ARC56AppClient](src/arc56_client.ts) is intended to be integrated into `algokit-utils-ts`. This is a generic non-typed app client for interacting with a contract that has an ARC56 JSON definition.

### Type Encoding/Decoding

The headline feature for ARC56 is proper struct support across all inputs and outputs including methods and state key/values. For example, you can pass objects (ARC56 struct) directly to a method and get the return value without any manual encoding or decoding

```ts
const inputs = { add: { a: 1n, b: 2n }, subtract: { a: 10n, b: 5n } };
const outputs = await appClient.methodCall("foo", { args: [inputs] });
const { sum, difference } = outputs.returnValue;
console.log("sum:", sum, "difference:", difference);
```

```
sum: 3n difference: 5n
```

This also works for state keys and values

```ts
console.log("boxKey", await appClient.getState.key("boxKey"));
console.log(
  "boxMap",
  await appClient.getState.map.value("boxMap", {
    add: { a: 1n, b: 2n },
    subtract: { a: 4n, b: 3n },
  })
);
```

```
boxKey baz
boxMap {
  sum: 3n,
  difference: 1n,
}
```

### AlgokitComposer

The ARC56AppClient inherits the method params from the underlying `AlgokitComposer`. This means the way to modify transactions fields is the same as forming non-app transactions without the appclient. The ARC56AppClient itself is a thin wrapper around `AlgokitComposer`, meaning that any features and maintenance all take place within `AlgokitComposer`, reducing the overhead of maintaining the app client.

```ts
await appClient.methodCall("foo", {
  // The number of rounds between firstValid and lastValid will be 50
  // This is also used to determine how long the client should wait for confirmation
  validityWindow: 50,
  note: "Hello world",
  args: [inputs],
});
```

### Composability

Because we are leveraging the `AlgokitComposer`, we can trivially compose together app calls from multiple clients.

The decoding will eventually be integrated as a callback to `AlgokitComposer`, so manual decoding will not be necessary.

```ts
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
```

### Error Messages

ARC56 also adds the ability to add error messages to any line of TEAL in the smart contract. For example the following line of TEALScript code

```ts
if (inputs.subtract.a < inputs.subtract.b)
  throw Error("subtract.a must be greater than subtract.b");
```

Will throw the following error

```
Runtime error when executing ARC56Test (appId: 9164) in transaction WTH7ALLC6O3HBD3T56TM5IRHC2WMQ2GT75XEUW3GIEHFNC3V46XA: subtract.a must be greater than subtract.b
```

Because ARC56 contais the full source information, complete stack traces in the high-level langauge are also possible via simulate.

## Generated Client

The generated client is a very thin wrapper on top of the generic client. The typed clients offers a slightly more intuitive typesafe interface for all of the actions supported by the underlying `ARC56AppClient`. Because the typed client does not offer any functionality not found in the generic client, [the generator](./src/index.ts) is trivial to maintain.

### Untyped Client

```ts
const inputs = { add: { a: 1n, b: 2n }, subtract: { a: 10n, b: 5n } };
const outputs = await appClient.methodCall("foo", { args: [inputs] });
const { sum, difference } = outputs.returnValue;
console.log("sum:", sum, "difference:", difference);
```

### Typed Client

```ts
import ARC56TestClient, { type Inputs } from "./ARC56TestClient";
...
const inputs: Inputs = { add: { a: 1n, b: 2n }, subtract: { a: 10n, b: 5n } };
const outputs = await appClient.call().foo(inputs);
const { sum, difference } = outputs.returnValue;
console.log("sum:", sum, "difference:", difference);
```

## TODO

These are features that need to be implemented prior to release

- [ ] JSDoc comments from ARC56
- [ ] Testing
- [ ] Debug error parsing not working with resource population

## Future Features

The are features that are not currently supported by the existing appclient, but would be good to have with ARC56

- [ ] Stack trace with simulate and high-level language mapping
- [ ] Support events
- [ ] Support readonly
