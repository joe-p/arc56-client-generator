import arc56Json from "./ref.arc56.json";
import {
  AlgorandClient,
  type SendSingleTransactionResult,
} from "@algorandfoundation/algokit-utils";
import { type MethodCallParams } from "@algorandfoundation/algokit-utils/types/composer";
import algosdk from "algosdk";

const ARC56: typeof arc56Json = JSON.parse(`{
  "name": "ARC56Test",
  "desc": "",
  "methods": [
    {
      "name": "foo",
      "args": [
        {
          "name": "inputs",
          "type": "((uint64,uint64),(uint64,uint64))",
          "struct": "Inputs"
        }
      ],
      "returns": {
        "type": "(uint64,uint64)",
        "struct": "Outputs"
      },
      "actions": {
        "create": [],
        "call": [
          "NoOp"
        ]
      }
    },
    {
      "name": "createApplication",
      "args": [],
      "returns": {
        "type": "void"
      },
      "actions": {
        "create": [
          "NoOp"
        ],
        "call": []
      }
    }
  ],
  "arcs": [
    4,
    56
  ],
  "structs": {
    "{ foo: uint16; bar: uint16 }": {
      "foo": "uint16",
      "bar": "uint16"
    },
    "Outputs": {
      "sum": "uint64",
      "difference": "uint64"
    },
    "Inputs": {
      "add": {
        "a": "uint64",
        "b": "uint64"
      },
      "subtract": {
        "a": "uint64",
        "b": "uint64"
      }
    }
  },
  "state": {
    "schema": {
      "global": {
        "bytes": 37,
        "ints": 1
      },
      "local": {
        "bytes": 13,
        "ints": 1
      }
    },
    "keys": {
      "global": [
        {
          "key": "globalKey",
          "keyType": "bytes",
          "valueType": "uint64"
        }
      ],
      "local": [
        {
          "key": "localKey",
          "keyType": "bytes",
          "valueType": "uint64"
        }
      ],
      "box": [
        {
          "key": "boxKey",
          "keyType": "bytes",
          "valueType": "string"
        }
      ]
    },
    "maps": {
      "global": [
        {
          "keyType": "string",
          "valueType": "{ foo: uint16; bar: uint16 }",
          "prefix": "p"
        }
      ],
      "local": [
        {
          "keyType": "bytes",
          "valueType": "string",
          "prefix": "p"
        }
      ],
      "box": [
        {
          "keyType": "Inputs",
          "valueType": "Outputs",
          "prefix": "p"
        }
      ]
    }
  },
  "bareActions": {
    "create": [],
    "call": []
  },
  "sourceInfo": [
    {
      "teal": 1,
      "source": 6,
      "pc": [
        0,
        1,
        2,
        3
      ]
    },
    {
      "teal": 13,
      "source": 6,
      "pc": [
        4,
        5
      ]
    },
    {
      "teal": 14,
      "source": 6,
      "pc": [
        6
      ]
    },
    {
      "teal": 15,
      "source": 6,
      "pc": [
        7,
        8
      ]
    },
    {
      "teal": 16,
      "source": 6,
      "pc": [
        9
      ]
    },
    {
      "teal": 17,
      "source": 6,
      "pc": [
        10,
        11
      ]
    },
    {
      "teal": 18,
      "source": 6,
      "pc": [
        12
      ]
    },
    {
      "teal": 19,
      "source": 6,
      "pc": [
        13,
        14,
        15,
        16,
        17,
        18,
        19,
        20,
        21,
        22,
        23,
        24,
        25,
        26,
        27,
        28,
        29,
        30,
        31,
        32,
        33,
        34,
        35,
        36,
        37,
        38
      ]
    },
    {
      "teal": 23,
      "source": 6,
      "errorMessage": "The requested action is not implemented in this contract. Are you using the correct OnComplete? Did you set your app ID?",
      "pc": [
        39
      ]
    },
    {
      "teal": 28,
      "source": 19,
      "pc": [
        40,
        41,
        42,
        43,
        44,
        45
      ]
    },
    {
      "teal": 31,
      "source": 19,
      "pc": [
        46,
        47,
        48
      ]
    },
    {
      "teal": 32,
      "source": 19,
      "pc": [
        49
      ]
    },
    {
      "teal": 33,
      "source": 19,
      "pc": [
        50
      ]
    },
    {
      "teal": 34,
      "source": 19,
      "pc": [
        51,
        52
      ]
    },
    {
      "teal": 35,
      "source": 19,
      "pc": [
        53
      ]
    },
    {
      "teal": 38,
      "source": 19,
      "errorMessage": "argument 0 (inputs) for foo must be a ((uint64,uint64),(uint64,uint64))",
      "pc": [
        54
      ]
    },
    {
      "teal": 41,
      "source": 19,
      "pc": [
        55,
        56,
        57
      ]
    },
    {
      "teal": 42,
      "source": 19,
      "pc": [
        58
      ]
    },
    {
      "teal": 43,
      "source": 19,
      "pc": [
        59
      ]
    },
    {
      "teal": 44,
      "source": 19,
      "pc": [
        60
      ]
    },
    {
      "teal": 45,
      "source": 19,
      "pc": [
        61
      ]
    },
    {
      "teal": 49,
      "source": 19,
      "pc": [
        62,
        63,
        64
      ]
    },
    {
      "teal": 54,
      "source": 20,
      "pc": [
        65,
        66
      ]
    },
    {
      "teal": 55,
      "source": 20,
      "pc": [
        67,
        68,
        69
      ]
    },
    {
      "teal": 56,
      "source": 20,
      "pc": [
        70
      ]
    },
    {
      "teal": 57,
      "source": 20,
      "pc": [
        71,
        72
      ]
    },
    {
      "teal": 58,
      "source": 20,
      "pc": [
        73,
        74,
        75
      ]
    },
    {
      "teal": 59,
      "source": 20,
      "pc": [
        76
      ]
    },
    {
      "teal": 60,
      "source": 20,
      "pc": [
        77
      ]
    },
    {
      "teal": 61,
      "source": 20,
      "pc": [
        78,
        79,
        80
      ]
    },
    {
      "teal": 65,
      "source": 20,
      "errorMessage": "subtract.a must be greater than subtract.b",
      "pc": [
        81
      ]
    },
    {
      "teal": 73,
      "source": 22,
      "pc": [
        82,
        83
      ]
    },
    {
      "teal": 74,
      "source": 22,
      "pc": [
        84,
        85,
        86
      ]
    },
    {
      "teal": 75,
      "source": 22,
      "pc": [
        87
      ]
    },
    {
      "teal": 76,
      "source": 22,
      "pc": [
        88,
        89
      ]
    },
    {
      "teal": 77,
      "source": 22,
      "pc": [
        90,
        91,
        92
      ]
    },
    {
      "teal": 78,
      "source": 22,
      "pc": [
        93
      ]
    },
    {
      "teal": 79,
      "source": 22,
      "pc": [
        94
      ]
    },
    {
      "teal": 80,
      "source": 22,
      "pc": [
        95
      ]
    },
    {
      "teal": 81,
      "source": 23,
      "pc": [
        96,
        97
      ]
    },
    {
      "teal": 82,
      "source": 23,
      "pc": [
        98,
        99,
        100
      ]
    },
    {
      "teal": 83,
      "source": 23,
      "pc": [
        101
      ]
    },
    {
      "teal": 84,
      "source": 23,
      "pc": [
        102,
        103
      ]
    },
    {
      "teal": 85,
      "source": 23,
      "pc": [
        104,
        105,
        106
      ]
    },
    {
      "teal": 86,
      "source": 23,
      "pc": [
        107
      ]
    },
    {
      "teal": 87,
      "source": 23,
      "pc": [
        108
      ]
    },
    {
      "teal": 88,
      "source": 23,
      "pc": [
        109
      ]
    },
    {
      "teal": 89,
      "source": 23,
      "pc": [
        110
      ]
    },
    {
      "teal": 90,
      "source": 19,
      "pc": [
        111
      ]
    },
    {
      "teal": 93,
      "source": 6,
      "pc": [
        112
      ]
    },
    {
      "teal": 94,
      "source": 6,
      "pc": [
        113
      ]
    },
    {
      "teal": 97,
      "source": 6,
      "pc": [
        114,
        115,
        116,
        117,
        118,
        119
      ]
    },
    {
      "teal": 98,
      "source": 6,
      "pc": [
        120,
        121,
        122
      ]
    },
    {
      "teal": 99,
      "source": 6,
      "pc": [
        123,
        124,
        125,
        126
      ]
    },
    {
      "teal": 102,
      "source": 6,
      "errorMessage": "this contract does not implement the given ABI method for create NoOp",
      "pc": [
        127
      ]
    },
    {
      "teal": 105,
      "source": 6,
      "pc": [
        128,
        129,
        130,
        131,
        132,
        133
      ]
    },
    {
      "teal": 106,
      "source": 6,
      "pc": [
        134,
        135,
        136
      ]
    },
    {
      "teal": 107,
      "source": 6,
      "pc": [
        137,
        138,
        139,
        140
      ]
    },
    {
      "teal": 110,
      "source": 6,
      "errorMessage": "this contract does not implement the given ABI method for call NoOp",
      "pc": [
        141
      ]
    }
  ]
}`);

type MethodParams = Omit<
  Omit<Omit<Omit<MethodCallParams, "args">, "appId">, "method">,
  "sender"
> & { sender?: string };

/* Aliases for non-encoded ABI values */
type uint64 = bigint;

/* Type definitions for ARC56 structs */
export type Inputs = {
  add: { a: uint64; b: uint64 };
  subtract: { a: uint64; b: uint64 };
};
export type Outputs = { sum: uint64; difference: uint64 };

/* Structs To Arrays */
export function InputsToArray(
  inputs: Inputs
): [[uint64, uint64], [uint64, uint64]] {
  return [
    [inputs.add.a, inputs.add.b],
    [inputs.subtract.a, inputs.subtract.b],
  ];
}

/** Binary To Structs */
export function rawValueToOutputs(rawValue: Uint8Array): Outputs {
  const decoded = algosdk.ABITupleType.from("(uint64,uint64)")
    .decode(rawValue)
    .valueOf() as [uint64, uint64];

  return { sum: decoded[0], difference: decoded[1] };
}

export class ReferenceClient {
  appId: bigint;
  algorand: AlgorandClient;
  contract: algosdk.ABIContract;
  defaultSender?: string;

  call = (methodParams?: MethodParams) => {
    return {
      foo: async (
        inputs: Inputs
      ): Promise<{
        result: SendSingleTransactionResult;
        returnValue: Outputs;
      }> => {
        const sender = methodParams?.sender ?? this.defaultSender;

        if (sender === undefined) {
          throw new Error("No sender provided");
        }

        const result = await this.algorand.send.methodCall({
          ...methodParams,
          sender,
          appId: this.appId,
          method: this.contract.getMethodByName("foo")!,
          args: [InputsToArray(inputs)],
        });

        return {
          result,
          returnValue: rawValueToOutputs(result.returns![0].rawReturnValue!),
        };
      },
    };
  };

  params = (methodParams?: MethodParams) => {
    return {
      foo: (inputs: Inputs): MethodCallParams => {
        const sender = methodParams?.sender ?? this.defaultSender;

        if (sender === undefined) {
          throw new Error("No sender provided");
        }

        return {
          ...methodParams,
          sender,
          appId: this.appId,
          method: this.contract.getMethodByName("foo")!,
          args: [InputsToArray(inputs)],
        };
      },
    };
  };

  // TODO: Modify AlgorandClient to take in a (rawValue: Uint8Array) => DecodedType that we can use here to not have to manually expose decoders
  decodeReturnValue = {
    foo(rawValue: Uint8Array): Outputs {
      return rawValueToOutputs(rawValue);
    },
  };

  constructor(p: {
    appId: bigint;
    algorand: AlgorandClient;
    defaultSender?: string;
  }) {
    this.appId = p.appId;
    this.algorand = p.algorand;
    this.contract = new algosdk.ABIContract({
      name: ARC56.name,
      methods: ARC56.methods,
    });
    this.defaultSender = p.defaultSender;
  }
}

export default ReferenceClient;
