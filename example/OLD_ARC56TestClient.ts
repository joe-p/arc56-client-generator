import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import AlgokitComposer, {
  type MethodCallParams,
} from "@algorandfoundation/algokit-utils/types/composer";
import algosdk from "algosdk";
import { type SendAtomicTransactionComposerResults } from "@algorandfoundation/algokit-utils/types/transaction";

type MethodParams = Omit<
  MethodCallParams,
  "args" | "appId" | "method" | "sender"
> & { sender?: string };

const ARC56_JSON = `{"name":"ARC56Test","desc":"","methods":[{"name":"foo","args":[{"name":"inputs","type":"((uint64,uint64),(uint64,uint64))","struct":"Inputs"}],"returns":{"type":"(uint64,uint64)","struct":"Outputs"},"actions":{"create":[],"call":["NoOp"]}},{"name":"optInToApplication","args":[],"returns":{"type":"void"},"actions":{"create":[],"call":["OptIn"]}},{"name":"createApplication","args":[],"returns":{"type":"void"},"actions":{"create":["NoOp"],"call":[]}}],"arcs":[4,56],"structs":{"{ foo: uint16; bar: uint16 }":{"foo":"uint16","bar":"uint16"},"Outputs":{"sum":"uint64","difference":"uint64"},"Inputs":{"add":{"a":"uint64","b":"uint64"},"subtract":{"a":"uint64","b":"uint64"}}},"state":{"schema":{"global":{"bytes":37,"ints":1},"local":{"bytes":13,"ints":1}},"keys":{"global":{"globalKey":{"key":"Z2xvYmFsS2V5","keyType":"bytes","valueType":"uint64"}},"local":{"localKey":{"key":"bG9jYWxLZXk=","keyType":"bytes","valueType":"uint64"}},"box":{"boxKey":{"key":"Ym94S2V5","keyType":"bytes","valueType":"string"}}},"maps":{"global":{"globalMap":{"keyType":"string","valueType":"{ foo: uint16; bar: uint16 }","prefix":"p"}},"local":{"localMap":{"keyType":"bytes","valueType":"string","prefix":"p"}},"box":{"boxMap":{"keyType":"Inputs","valueType":"Outputs","prefix":"p"}}}},"bareActions":{"create":[],"call":[]},"sourceInfo":[{"teal":1,"source":6,"pc":[0,1,2,3]},{"teal":13,"source":6,"pc":[4,5]},{"teal":14,"source":6,"pc":[6]},{"teal":15,"source":6,"pc":[7,8]},{"teal":16,"source":6,"pc":[9]},{"teal":17,"source":6,"pc":[10,11]},{"teal":18,"source":6,"pc":[12]},{"teal":19,"source":6,"pc":[13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38]},{"teal":23,"source":6,"errorMessage":"The requested action is not implemented in this contract. Are you using the correct OnComplete? Did you set your app ID?","pc":[39]},{"teal":28,"source":21,"pc":[40,41,42,43,44,45]},{"teal":31,"source":21,"pc":[46,47,48]},{"teal":32,"source":21,"pc":[49]},{"teal":33,"source":21,"pc":[50]},{"teal":34,"source":21,"pc":[51,52]},{"teal":35,"source":21,"pc":[53]},{"teal":38,"source":21,"errorMessage":"argument 0 (inputs) for foo must be a ((uint64,uint64),(uint64,uint64))","pc":[54]},{"teal":41,"source":21,"pc":[55,56,57]},{"teal":42,"source":21,"pc":[58]},{"teal":43,"source":21,"pc":[59]},{"teal":44,"source":21,"pc":[60]},{"teal":45,"source":21,"pc":[61]},{"teal":49,"source":21,"pc":[62,63,64]},{"teal":54,"source":22,"pc":[65,66]},{"teal":55,"source":22,"pc":[67,68,69]},{"teal":56,"source":22,"pc":[70]},{"teal":57,"source":22,"pc":[71,72]},{"teal":58,"source":22,"pc":[73,74,75]},{"teal":59,"source":22,"pc":[76]},{"teal":60,"source":22,"pc":[77]},{"teal":61,"source":22,"pc":[78,79,80]},{"teal":65,"source":22,"errorMessage":"subtract.a must be greater than subtract.b","pc":[81]},{"teal":70,"source":24,"pc":[82,83,84,85,86,87,88,89,90,91,92]},{"teal":71,"source":24,"pc":[93,94]},{"teal":72,"source":24,"pc":[95]},{"teal":76,"source":25,"pc":[96,97,98,99,100,101,102,103]},{"teal":77,"source":25,"pc":[104,105,106,107,108,109]},{"teal":78,"source":25,"pc":[110]},{"teal":85,"source":28,"pc":[111,112]},{"teal":86,"source":28,"pc":[113,114,115]},{"teal":87,"source":28,"pc":[116]},{"teal":88,"source":28,"pc":[117,118]},{"teal":89,"source":28,"pc":[119,120,121]},{"teal":90,"source":28,"pc":[122]},{"teal":91,"source":28,"pc":[123]},{"teal":92,"source":28,"pc":[124]},{"teal":93,"source":29,"pc":[125,126]},{"teal":94,"source":29,"pc":[127,128,129]},{"teal":95,"source":29,"pc":[130]},{"teal":96,"source":29,"pc":[131,132]},{"teal":97,"source":29,"pc":[133,134,135]},{"teal":98,"source":29,"pc":[136]},{"teal":99,"source":29,"pc":[137]},{"teal":100,"source":29,"pc":[138]},{"teal":101,"source":29,"pc":[139]},{"teal":102,"source":21,"pc":[140]},{"teal":107,"source":33,"pc":[141,142,143]},{"teal":108,"source":33,"pc":[144]},{"teal":109,"source":33,"pc":[145]},{"teal":113,"source":33,"pc":[146,147,148]},{"teal":117,"source":34,"pc":[149,150]},{"teal":118,"source":34,"pc":[151,152,153,154,155,156,157,158,159,160]},{"teal":119,"source":34,"pc":[161,162]},{"teal":120,"source":34,"pc":[163]},{"teal":124,"source":35,"pc":[164,165]},{"teal":125,"source":35,"pc":[166,167,168,169,170,171]},{"teal":126,"source":35,"pc":[172,173,174,175,176,177,178]},{"teal":127,"source":35,"pc":[179]},{"teal":131,"source":36,"pc":[180,181,182,183,184,185,186,187]},{"teal":132,"source":36,"pc":[188]},{"teal":133,"source":36,"pc":[189]},{"teal":134,"source":36,"pc":[190]},{"teal":135,"source":36,"pc":[191,192,193,194,195,196,197]},{"teal":136,"source":36,"pc":[198]},{"teal":140,"source":37,"pc":[199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233]},{"teal":141,"source":37,"pc":[234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251]},{"teal":142,"source":37,"pc":[252]},{"teal":143,"source":33,"pc":[253]},{"teal":146,"source":6,"pc":[254]},{"teal":147,"source":6,"pc":[255]},{"teal":150,"source":6,"pc":[256,257,258,259,260,261]},{"teal":151,"source":6,"pc":[262,263,264]},{"teal":152,"source":6,"pc":[265,266,267,268]},{"teal":155,"source":6,"errorMessage":"this contract does not implement the given ABI method for create NoOp","pc":[269]},{"teal":158,"source":6,"pc":[270,271,272,273,274,275]},{"teal":159,"source":6,"pc":[276,277,278]},{"teal":160,"source":6,"pc":[279,280,281,282]},{"teal":163,"source":6,"errorMessage":"this contract does not implement the given ABI method for call NoOp","pc":[283]},{"teal":166,"source":6,"pc":[284,285,286,287,288,289]},{"teal":167,"source":6,"pc":[290,291,292]},{"teal":168,"source":6,"pc":[293,294,295,296]},{"teal":171,"source":6,"errorMessage":"this contract does not implement the given ABI method for call OptIn","pc":[297]}],"source":{"approval":"I3ByYWdtYSB2ZXJzaW9uIDEwCgovLyBUaGlzIFRFQUwgd2FzIGdlbmVyYXRlZCBieSBURUFMU2NyaXB0IHYwLjkyLjAKLy8gaHR0cHM6Ly9naXRodWIuY29tL2FsZ29yYW5kZm91bmRhdGlvbi9URUFMU2NyaXB0CgovLyBUaGlzIGNvbnRyYWN0IGlzIGNvbXBsaWFudCB3aXRoIGFuZC9vciBpbXBsZW1lbnRzIHRoZSBmb2xsb3dpbmcgQVJDczogWyBBUkM0IF0KCi8vIFRoZSBmb2xsb3dpbmcgdGVuIGxpbmVzIG9mIFRFQUwgaGFuZGxlIGluaXRpYWwgcHJvZ3JhbSBmbG93Ci8vIFRoaXMgcGF0dGVybiBpcyB1c2VkIHRvIG1ha2UgaXQgZWFzeSBmb3IgYW55b25lIHRvIHBhcnNlIHRoZSBzdGFydCBvZiB0aGUgcHJvZ3JhbSBhbmQgZGV0ZXJtaW5lIGlmIGEgc3BlY2lmaWMgYWN0aW9uIGlzIGFsbG93ZWQKLy8gSGVyZSwgYWN0aW9uIHJlZmVycyB0byB0aGUgT25Db21wbGV0ZSBpbiBjb21iaW5hdGlvbiB3aXRoIHdoZXRoZXIgdGhlIGFwcCBpcyBiZWluZyBjcmVhdGVkIG9yIGNhbGxlZAovLyBFdmVyeSBwb3NzaWJsZSBhY3Rpb24gZm9yIHRoaXMgY29udHJhY3QgaXMgcmVwcmVzZW50ZWQgaW4gdGhlIHN3aXRjaCBzdGF0ZW1lbnQKLy8gSWYgdGhlIGFjdGlvbiBpcyBub3QgaW1wbGVtZW50ZWQgaW4gdGhlIGNvbnRyYWN0LCBpdHMgcmVzcGVjdGl2ZSBicmFuY2ggd2lsbCBiZSAiKk5PVF9JTVBMRU1FTlRFRCIgd2hpY2gganVzdCBjb250YWlucyAiZXJyIgp0eG4gQXBwbGljYXRpb25JRAohCmludCA2CioKdHhuIE9uQ29tcGxldGlvbgorCnN3aXRjaCAqY2FsbF9Ob09wICpjYWxsX09wdEluICpOT1RfSU1QTEVNRU5URUQgKk5PVF9JTVBMRU1FTlRFRCAqTk9UX0lNUExFTUVOVEVEICpOT1RfSU1QTEVNRU5URUQgKmNyZWF0ZV9Ob09wICpOT1RfSU1QTEVNRU5URUQgKk5PVF9JTVBMRU1FTlRFRCAqTk9UX0lNUExFTUVOVEVEICpOT1RfSU1QTEVNRU5URUQgKk5PVF9JTVBMRU1FTlRFRAoKKk5PVF9JTVBMRU1FTlRFRDoKCS8vIFRoZSByZXF1ZXN0ZWQgYWN0aW9uIGlzIG5vdCBpbXBsZW1lbnRlZCBpbiB0aGlzIGNvbnRyYWN0LiBBcmUgeW91IHVzaW5nIHRoZSBjb3JyZWN0IE9uQ29tcGxldGU/IERpZCB5b3Ugc2V0IHlvdXIgYXBwIElEPwoJZXJyCgovLyBmb28oKCh1aW50NjQsdWludDY0KSwodWludDY0LHVpbnQ2NCkpKSh1aW50NjQsdWludDY0KQoqYWJpX3JvdXRlX2ZvbzoKCS8vIFRoZSBBQkkgcmV0dXJuIHByZWZpeAoJYnl0ZSAweDE1MWY3Yzc1CgoJLy8gaW5wdXRzOiAoKHVpbnQ2NCx1aW50NjQpLCh1aW50NjQsdWludDY0KSkKCXR4bmEgQXBwbGljYXRpb25BcmdzIDEKCWR1cAoJbGVuCglpbnQgMzIKCT09CgoJLy8gYXJndW1lbnQgMCAoaW5wdXRzKSBmb3IgZm9vIG11c3QgYmUgYSAoKHVpbnQ2NCx1aW50NjQpLCh1aW50NjQsdWludDY0KSkKCWFzc2VydAoKCS8vIGV4ZWN1dGUgZm9vKCgodWludDY0LHVpbnQ2NCksKHVpbnQ2NCx1aW50NjQpKSkodWludDY0LHVpbnQ2NCkKCWNhbGxzdWIgZm9vCgljb25jYXQKCWxvZwoJaW50IDEKCXJldHVybgoKLy8gZm9vKGlucHV0czogSW5wdXRzKTogT3V0cHV0cwpmb286Cglwcm90byAxIDEKCgkvLyAqaWYwX2NvbmRpdGlvbgoJLy8gdGVzdHMvY29udHJhY3RzL2FyYzU2LmFsZ28udHM6MjIKCS8vIGlucHV0cy5zdWJ0cmFjdC5hIDwgaW5wdXRzLnN1YnRyYWN0LmIKCWZyYW1lX2RpZyAtMSAvLyBpbnB1dHM6IElucHV0cwoJZXh0cmFjdCAxNiA4CglidG9pCglmcmFtZV9kaWcgLTEgLy8gaW5wdXRzOiBJbnB1dHMKCWV4dHJhY3QgMjQgOAoJYnRvaQoJPAoJYnogKmlmMF9lbmQKCgkvLyAqaWYwX2NvbnNlcXVlbnQKCS8vIHN1YnRyYWN0LmEgbXVzdCBiZSBncmVhdGVyIHRoYW4gc3VidHJhY3QuYgoJZXJyCgoqaWYwX2VuZDoKCS8vIHRlc3RzL2NvbnRyYWN0cy9hcmM1Ni5hbGdvLnRzOjI0CgkvLyB0aGlzLmdsb2JhbEtleS52YWx1ZSA9IHRoaXMuc29tZU51bWJlcgoJYnl0ZSAweDY3NmM2ZjYyNjE2YzRiNjU3OSAvLyAiZ2xvYmFsS2V5IgoJcHVzaGludCBUTVBMX3NvbWVOdW1iZXIKCWFwcF9nbG9iYWxfcHV0CgoJLy8gdGVzdHMvY29udHJhY3RzL2FyYzU2LmFsZ28udHM6MjUKCS8vIHRoaXMuZ2xvYmFsTWFwKCdmb28nKS52YWx1ZSA9IHsgZm9vOiAxMywgYmFyOiAzNyB9CglieXRlIDB4NzAwMDAzNjY2ZjZmCglieXRlIDB4MDAwZDAwMjUKCWFwcF9nbG9iYWxfcHV0CgoJLy8gdGVzdHMvY29udHJhY3RzL2FyYzU2LmFsZ28udHM6MjcKCS8vIHJldHVybiB7CgkvLyAgICAgICBzdW06IGlucHV0cy5hZGQuYSArIGlucHV0cy5hZGQuYiwKCS8vICAgICAgIGRpZmZlcmVuY2U6IGlucHV0cy5zdWJ0cmFjdC5hIC0gaW5wdXRzLnN1YnRyYWN0LmIsCgkvLyAgICAgfTsKCWZyYW1lX2RpZyAtMSAvLyBpbnB1dHM6IElucHV0cwoJZXh0cmFjdCAwIDgKCWJ0b2kKCWZyYW1lX2RpZyAtMSAvLyBpbnB1dHM6IElucHV0cwoJZXh0cmFjdCA4IDgKCWJ0b2kKCSsKCWl0b2IKCWZyYW1lX2RpZyAtMSAvLyBpbnB1dHM6IElucHV0cwoJZXh0cmFjdCAxNiA4CglidG9pCglmcmFtZV9kaWcgLTEgLy8gaW5wdXRzOiBJbnB1dHMKCWV4dHJhY3QgMjQgOAoJYnRvaQoJLQoJaXRvYgoJY29uY2F0CglyZXRzdWIKCi8vIG9wdEluVG9BcHBsaWNhdGlvbigpdm9pZAoqYWJpX3JvdXRlX29wdEluVG9BcHBsaWNhdGlvbjoKCS8vIGV4ZWN1dGUgb3B0SW5Ub0FwcGxpY2F0aW9uKCl2b2lkCgljYWxsc3ViIG9wdEluVG9BcHBsaWNhdGlvbgoJaW50IDEKCXJldHVybgoKLy8gb3B0SW5Ub0FwcGxpY2F0aW9uKCk6IHZvaWQKb3B0SW5Ub0FwcGxpY2F0aW9uOgoJcHJvdG8gMCAwCgoJLy8gdGVzdHMvY29udHJhY3RzL2FyYzU2LmFsZ28udHM6MzQKCS8vIHRoaXMubG9jYWxLZXkodGhpcy50eG4uc2VuZGVyKS52YWx1ZSA9IHRoaXMuc29tZU51bWJlcgoJdHhuIFNlbmRlcgoJYnl0ZSAweDZjNmY2MzYxNmM0YjY1NzkgLy8gImxvY2FsS2V5IgoJcHVzaGludCBUTVBMX3NvbWVOdW1iZXIKCWFwcF9sb2NhbF9wdXQKCgkvLyB0ZXN0cy9jb250cmFjdHMvYXJjNTYuYWxnby50czozNQoJLy8gdGhpcy5sb2NhbE1hcCh0aGlzLnR4bi5zZW5kZXIsICdmb28nKS52YWx1ZSA9ICdiYXInCgl0eG4gU2VuZGVyCglieXRlIDB4NzA2NjZmNmYKCWJ5dGUgMHgwMDAzNjI2MTcyCglhcHBfbG9jYWxfcHV0CgoJLy8gdGVzdHMvY29udHJhY3RzL2FyYzU2LmFsZ28udHM6MzYKCS8vIHRoaXMuYm94S2V5LnZhbHVlID0gJ2JheicKCWJ5dGUgMHg2MjZmNzg0YjY1NzkgLy8gImJveEtleSIKCWR1cAoJYm94X2RlbAoJcG9wCglieXRlIDB4MDAwMzYyNjE3YQoJYm94X3B1dAoKCS8vIHRlc3RzL2NvbnRyYWN0cy9hcmM1Ni5hbGdvLnRzOjM3CgkvLyB0aGlzLmJveE1hcCh7IGFkZDogeyBhOiAxLCBiOiAyIH0sIHN1YnRyYWN0OiB7IGE6IDQsIGI6IDMgfSB9KS52YWx1ZSA9IHsgc3VtOiAzLCBkaWZmZXJlbmNlOiAxIH0KCWJ5dGUgMHg3MDAwMDAwMDAwMDAwMDAwMDEwMDAwMDAwMDAwMDAwMDAyMDAwMDAwMDAwMDAwMDAwNDAwMDAwMDAwMDAwMDAwMDMKCWJ5dGUgMHgwMDAwMDAwMDAwMDAwMDAzMDAwMDAwMDAwMDAwMDAwMQoJYm94X3B1dAoJcmV0c3ViCgoqYWJpX3JvdXRlX2NyZWF0ZUFwcGxpY2F0aW9uOgoJaW50IDEKCXJldHVybgoKKmNyZWF0ZV9Ob09wOgoJbWV0aG9kICJjcmVhdGVBcHBsaWNhdGlvbigpdm9pZCIKCXR4bmEgQXBwbGljYXRpb25BcmdzIDAKCW1hdGNoICphYmlfcm91dGVfY3JlYXRlQXBwbGljYXRpb24KCgkvLyB0aGlzIGNvbnRyYWN0IGRvZXMgbm90IGltcGxlbWVudCB0aGUgZ2l2ZW4gQUJJIG1ldGhvZCBmb3IgY3JlYXRlIE5vT3AKCWVycgoKKmNhbGxfTm9PcDoKCW1ldGhvZCAiZm9vKCgodWludDY0LHVpbnQ2NCksKHVpbnQ2NCx1aW50NjQpKSkodWludDY0LHVpbnQ2NCkiCgl0eG5hIEFwcGxpY2F0aW9uQXJncyAwCgltYXRjaCAqYWJpX3JvdXRlX2ZvbwoKCS8vIHRoaXMgY29udHJhY3QgZG9lcyBub3QgaW1wbGVtZW50IHRoZSBnaXZlbiBBQkkgbWV0aG9kIGZvciBjYWxsIE5vT3AKCWVycgoKKmNhbGxfT3B0SW46CgltZXRob2QgIm9wdEluVG9BcHBsaWNhdGlvbigpdm9pZCIKCXR4bmEgQXBwbGljYXRpb25BcmdzIDAKCW1hdGNoICphYmlfcm91dGVfb3B0SW5Ub0FwcGxpY2F0aW9uCgoJLy8gdGhpcyBjb250cmFjdCBkb2VzIG5vdCBpbXBsZW1lbnQgdGhlIGdpdmVuIEFCSSBtZXRob2QgZm9yIGNhbGwgT3B0SW4KCWVycg==","clear":"I3ByYWdtYSB2ZXJzaW9uIDEw"},"templateVariables":{"someNumber":"uint64"}}`;

/** An ABI-encoded type */
type ABIType = string;

/** The name of a defined struct */
type StructName = string;

/** Raw byteslice without the length prefixed that is specified in ARC-4 */
type AVMBytes = "bytes";

/** Mapping of named structs to the ABI type of their fields */
interface StructFields {
  [fieldName: string]: ABIType | StructFields;
}

/** Describes a single key in app storage */
interface StorageKey {
  /** Description of what this storage key holds */
  desc?: string;
  /** The type of the key */
  keyType: ABIType | AVMBytes | StructName;
  /** The type of the value */
  valueType: ABIType | AVMBytes | StructName;
  /** The bytes of the key encoded as base64 */
  key: string;
}

interface StorageMap {
  /** Description of what the key-value pairs in this mapping hold */
  desc?: string;
  /** The type of the keys in the map */
  keyType: ABIType | AVMBytes | StructName;
  /** The type of the values in the map */
  valueType: ABIType | AVMBytes | StructName;
  /** The prefix of the map, encoded as a utf-8 string */
  prefix?: string;
}

interface SourceInfo {
  /** The line of pre-compiled TEAL */
  teal: number;
  /** The program counter offset(s) that correspond to this line of TEAL */
  pc?: Array<number>;
  /** A human-readable string that describes the error when the program fails at this given line of TEAL */
  errorMessage?: string;
}

interface Event {
  /** The name of the event */
  name: string;
  /** Optional, user-friendly description for the event */
  desc?: string;
  /** The arguments of the event, in order */
  args: Array<{
    /** The type of the argument */
    type: ABIType;
    /** Optional, user-friendly name for the argument */
    name?: string;
    /** Optional, user-friendly description for the argument */
    desc?: string;
    /** If the type is a struct, the name of the struct */
    struct?: StructName;
  }>;
}

/** Describes a method in the contract. This interface is an extension of the interface described in ARC-4 */
interface Method {
  /** The name of the method */
  name: string;
  /** Optional, user-friendly description for the method */
  desc?: string;
  /** The arguments of the method, in order */
  args: Array<{
    /** The type of the argument */
    type: ABIType;
    /** If the type is a struct, the name of the struct */
    struct?: StructName;
    /** Optional, user-friendly name for the argument */
    name?: string;
    /** Optional, user-friendly description for the argument */
    desc?: string;
    /** The default value that clients should use. MUST be base64 encoded bytes */
    defaultValue?: string;
  }>;
  /** Information about the method's return value */
  returns: {
    /** The type of the return value, or "void" to indicate no return value. */
    type: ABIType;
    /** If the type is a struct, the name of the struct */
    struct?: StructName;
    /** Optional, user-friendly description for the return value */
    desc?: string;
  };
  /** an action is a combination of call/create and an OnComplete */
  actions: {
    /** OnCompletes this method allows when appID === 0 */
    create: ("NoOp" | "OptIn" | "DeleteApplication")[];
    /** OnCompletes this method allows when appID !== 0 */
    call: (
      | "NoOp"
      | "OptIn"
      | "CloseOut"
      | "ClearState"
      | "UpdateApplication"
      | "DeleteApplication"
    )[];
  };
  /** If this method does not write anything to the ledger (ARC-22) */
  readonly: boolean;
  /** ARC-28 events that MAY be emitted by this method */
  events?: Array<Event>;
  /** Information that clients can use when calling the method */
  recommendations?: {
    /** The number of inner transactions the caller should cover the fees for */
    innerTransactionCount?: number;
    /** Recommended box references to include */
    boxes?: {
      /** The app ID for the box */
      app?: number;
      /** The base64 encoded box key */
      key: string;
      /** The number of bytes being read from the box */
      readBytes: number;
      /** The number of bytes being written to the box */
      writeBytes: number;
    };
    /** Recommended foreign accounts */
    accounts?: string[];
    /** Recommended foreign apps */
    apps?: number[];
    /** Recommended foreign assets */
    assets?: number[];
  };
}

/** Describes the entire contract. This interface is an extension of the interface described in ARC-4 */
export interface ARC56Contract {
  /** The ARCs used and/or supported by this contract. All contracts implicity support ARC4 and ARC56 */
  arcs: number[];
  /** A user-friendly name for the contract */
  name: string;
  /** Optional, user-friendly description for the interface */
  desc?: string;
  /**
   * Optional object listing the contract instances across different networks
   */
  networks?: {
    /**
     * The key is the base64 genesis hash of the network, and the value contains
     * information about the deployed contract in the network indicated by the
     * key. A key containing the human-readable name of the network MAY be
     * included, but the corresponding genesis hash key MUST also be defined
     */
    [network: string]: {
      /** The app ID of the deployed contract in this network */
      appID: number;
    };
  };
  /** Named structs use by the application */
  structs: { [structName: StructName]: StructFields };
  /** All of the methods that the contract implements */
  methods: Method[];
  state: {
    /** Defines the values that should be used for GlobalNumUint, GlobalNumByteSlice, LocalNumUint, and LocalNumByteSlice when creating the application  */
    schema: {
      global: {
        ints: number;
        bytes: number;
      };
      local: {
        ints: number;
        bytes: number;
      };
    };
    /** Mapping of human-readable names to StorageKey objects */
    keys: {
      global: { [name: string]: StorageKey };
      local: { [name: string]: StorageKey };
      box: { [name: string]: StorageKey };
    };
    /** Mapping of human-readable names to StorageMap objects */
    maps: {
      global: { [name: string]: StorageMap };
      local: { [name: string]: StorageMap };
      box: { [name: string]: StorageMap };
    };
  };
  /** Supported bare actions for the contract. An action is a combination of call/create and an OnComplete */
  bareActions: {
    /** OnCompletes this method allows when appID === 0 */
    create: ("NoOp" | "OptIn" | "DeleteApplication")[];
    /** OnCompletes this method allows when appID !== 0 */
    call: (
      | "NoOp"
      | "OptIn"
      | "CloseOut"
      | "ClearState"
      | "UpdateApplication"
      | "DeleteApplication"
    )[];
  };
  /** Information about the TEAL */
  sourceInfo?: SourceInfo[];
  /** The pre-compiled TEAL that may contain template variables. MUST be omitted if included as part of ARC23, but otherwise MUST be defined. */
  source?: {
    /** The approval program */
    approval: string;
    /** The clear program */
    clear: string;
  };
  /** ARC-28 events that MAY be emitted by this contract */
  events?: Array<Event>;
  /** A mapping of template variable names as they appear in the teal (not including TMPL_ prefix) and their respecive types */
  templateVariables?: {
    [name: string]: ABIType | AVMBytes | StructName;
  };
}

// Aliases for non-encoded ABI values
type uint64 = bigint;
type bytes = string;
type uint16 = bigint;

// Type definitions for ARC56 structs

export type Outputs = {
  sum: uint64;
  difference: uint64;
};
export type Inputs = {
  add: {
    a: uint64;
    b: uint64;
  };
  subtract: {
    a: uint64;
    b: uint64;
  };
};

/** Compile-time variables */
export type TemplateVariables = {
  someNumber: uint64;
};

export class ARC56TestClient {
  appId: bigint;
  algorand: AlgorandClient;
  contract: algosdk.ABIContract;
  defaultSender?: string;
  appAddress: string;
  arc56: ARC56Contract = JSON.parse(ARC56_JSON) as ARC56Contract;

  constructor(p: {
    appId: bigint;
    algorand: AlgorandClient;
    defaultSender?: string;
  }) {
    this.appId = p.appId;
    this.appAddress = algosdk.getApplicationAddress(p.appId);
    this.algorand = p.algorand;
    this.contract = new algosdk.ABIContract({
      name: this.arc56.name,
      methods: this.arc56.methods,
    });
    this.defaultSender = p.defaultSender;
  }

  // TOOD: Allow addMethodCall to pass in a callback function to handle errors
  private async executeWithErrorParsing(group: AlgokitComposer) {
    try {
      return await group.execute();
    } catch (e) {
      const txId = JSON.stringify(e).match(
        /(?<=TransactionPool.Remember: transaction )S+(?=:)/,
      )?.[0];

      const appId = BigInt(
        JSON.stringify(e).match(/(?<=Details: app=)d+/)?.[0] || "",
      );

      const pc = Number(JSON.stringify(e).match(/(?<=pc=)d+/)?.[0] || "");

      if (appId !== this.appId) {
        throw e;
      }

      // TODO: Use our own source map we got during create if we have one
      const errorMessage = this.arc56.sourceInfo?.find((s) =>
        s?.pc?.includes(pc),
      )?.errorMessage;

      if (errorMessage) {
        throw Error(
          `Runtime error when executing ${this.arc56.name} (appId: ${this.appId}) in transaction ${txId}: ${errorMessage}`,
        );
      }

      throw e;
    }
  }

  private getABITypeFromStructFields(structFields: any): string {
    const typesArray: any[] = [];

    for (const key in structFields) {
      if (typeof structFields[key] === "object") {
        typesArray.push(this.getABITypeFromStructFields(structFields[key]));
      } else {
        typesArray.push(structFields[key]);
      }
    }

    return JSON.stringify(typesArray)
      .replace(/"/g, "")
      .replace(/\]/g, ")")
      .replace(/\[/g, "(");
  }

  private getABIType(type: string) {
    if (this.arc56.structs[type]) {
      return this.getABITypeFromStructFields(this.arc56.structs[type]);
    }

    return type;
  }

  private getABIEncodedValue(value: any, type: string): Uint8Array {
    if (type === "bytes") return Buffer.from(value as string);
    const abiType = this.getABIType(type);

    return algosdk.ABIType.from(abiType).encode(this.getABIValue(type, value));
  }

  private getObjectFromStructFieldsAndArray(
    structFields: any,
    valuesArray: any[],
  ): any {
    const obj: any = {};

    for (const key in structFields) {
      if (
        typeof structFields[key] === "object" &&
        !Array.isArray(structFields[key])
      ) {
        obj[key] = this.getObjectFromStructFieldsAndArray(
          structFields[key],
          valuesArray.shift(),
        );
      } else {
        obj[key] = valuesArray.shift();
      }
    }

    return obj;
  }

  /** Get the typescript value, which may be the ABIValue or the struct */
  private getTypeScriptValue(type: string, value: Uint8Array): any {
    if (type === "bytes") return Buffer.from(value).toString();
    const abiType = this.getABIType(type);

    const abiValue = algosdk.ABIType.from(abiType).decode(value);

    if (this.arc56.structs[type]) {
      return this.getObjectFromStructFieldsAndArray(
        this.arc56.structs[type],
        abiValue as algosdk.ABIValue[],
      );
    }

    return abiValue;
  }

  private async getLocalStateValue(
    address: string,
    b64Key: string,
    type: string,
  ): Promise<any> {
    const result = await this.algorand.client.algod
      .accountApplicationInformation(address, Number(this.appId))
      .do();

    const keyValue = result["app-local-state"]["key-value"].find(
      (s: any) => s.key === b64Key,
    );

    if (keyValue.value.type === 1) {
      return this.getTypeScriptValue(
        type,
        new Uint8Array(Buffer.from(keyValue.value.bytes, "base64")),
      );
    } else {
      return this.getTypeScriptValue(
        type,
        algosdk.encodeUint64(keyValue.value.uint),
      );
    }
  }

  private async getBoxValue(b64Key: string, type: string): Promise<any> {
    const result = await this.algorand.client.algod
      .getApplicationBoxByName(
        Number(this.appId),
        Buffer.from(b64Key, "base64"),
      )
      .do();

    return this.getTypeScriptValue(type, result.value);
  }

  private async getGlobalStateValue(
    b64Key: string,
    type: string,
  ): Promise<any> {
    const result = await this.algorand.client.algod
      .getApplicationByID(Number(this.appId))
      .do();

    const keyValue = result.params["global-state"].find(
      (s: any) => s.key === b64Key,
    );

    if (keyValue.value.type === 1) {
      return this.getTypeScriptValue(
        type,
        new Uint8Array(Buffer.from(keyValue.value.bytes, "base64")),
      );
    } else {
      return this.getTypeScriptValue(
        type,
        algosdk.encodeUint64(keyValue.value.uint),
      );
    }
  }

  private getABIValuesFromStructFieldsAndObject(
    structFields: any,
    obj: any,
  ): algosdk.ABIValue[] {
    const valuesArray: any[] = [];

    for (const key in structFields) {
      if (
        typeof structFields[key] === "object" &&
        !Array.isArray(structFields[key])
      ) {
        valuesArray.push(
          this.getABIValuesFromStructFieldsAndObject(
            structFields[key],
            obj[key],
          ),
        );
      } else {
        valuesArray.push(obj[key]);
      }
    }

    return valuesArray;
  }

  private getABIValue(type: string, value: any): algosdk.ABIValue {
    if (type === "bytes") return value;
    if (this.arc56.structs[type]) {
      return this.getABIValuesFromStructFieldsAndObject(
        this.arc56.structs[type],
        value,
      );
    }

    return value;
  }

  async compileProgram(
    algorand: AlgorandClient,
    program: "clear" | "approval",
    templateVars: TemplateVariables,
  ) {
    let tealString = Buffer.from(
      this.arc56.source![program],
      "base64",
    ).toString();
    tealString = tealString.replace(
      /pushint TMPL_someNumber/g,
      `pushint ${templateVars["someNumber"].toString()}`,
    );
    const result = await algorand.client.algod.compile(tealString).do();
    return new Uint8Array(Buffer.from(result.result, "base64"));
  }

  params = (methodParams?: MethodParams) => {
    return {
      foo: (inputs: Inputs): MethodCallParams => {
        const sender = methodParams?.sender ?? this.defaultSender;

        if (sender === undefined) {
          throw new Error("No sender provided");
        }

        return {
          sender,
          appId: this.appId,
          method: this.contract.getMethodByName("foo")!,
          args: [this.getABIValue("Inputs", inputs)],
          ...methodParams,
        };
      },
      optInToApplication: (): MethodCallParams => {
        const sender = methodParams?.sender ?? this.defaultSender;

        if (sender === undefined) {
          throw new Error("No sender provided");
        }

        return {
          sender,
          appId: this.appId,
          method: this.contract.getMethodByName("optInToApplication")!,
          args: [],
          ...methodParams,
        };
      },
      createApplication: (): MethodCallParams => {
        const sender = methodParams?.sender ?? this.defaultSender;

        if (sender === undefined) {
          throw new Error("No sender provided");
        }

        return {
          sender,
          appId: this.appId,
          method: this.contract.getMethodByName("createApplication")!,
          args: [],
          ...methodParams,
        };
      },
    };
  };

  call = (methodParams: MethodParams = {}) => {
    return {
      foo: async (
        inputs: Inputs,
      ): Promise<{
        result: SendAtomicTransactionComposerResults;
        returnValue: Outputs;
      }> => {
        const group = this.algorand.newGroup();
        group.addMethodCall({
          ...this.params(methodParams).foo(inputs),
          onComplete: algosdk.OnApplicationComplete.NoOpOC,
        });

        const result = await this.executeWithErrorParsing(group);

        return {
          result,
          returnValue: this.getTypeScriptValue(
            "Outputs",
            result.returns![0].rawReturnValue!,
          ),
        };
      },
    };
  };
  optIn = (methodParams: MethodParams = {}) => {
    return {
      optInToApplication: async (): Promise<{
        result: SendAtomicTransactionComposerResults;
        returnValue: void;
      }> => {
        const group = this.algorand.newGroup();
        group.addMethodCall({
          ...this.params(methodParams).optInToApplication(),
          onComplete: algosdk.OnApplicationComplete.OptInOC,
        });

        const result = await this.executeWithErrorParsing(group);

        return {
          result,
          returnValue: undefined,
        };
      },
    };
  };

  create = (
    methodParams: MethodParams & {
      templateVariables: TemplateVariables;
      onComplete?: algosdk.OnApplicationComplete;
    },
  ) => {
    return {
      createApplication: async (): Promise<{
        result: SendAtomicTransactionComposerResults;
        returnValue: void;
        appId: bigint;
        appAddress: string;
      }> => {
        if (this.appId !== 0n) {
          throw Error(
            `Create was called but the app has already been created: ${this.appId.toString()}`,
          );
        }

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
            methodParams.templateVariables,
          ),
          clearProgram: await this.compileProgram(
            this.algorand,
            "clear",
            methodParams.templateVariables,
          ),
          ...this.params(methodParams).createApplication(),
        });

        const result = await this.executeWithErrorParsing(group);

        this.appId = BigInt(result.confirmations.at(-1)!.applicationIndex!);
        this.appAddress = algosdk.getApplicationAddress(this.appId);

        return {
          appId: this.appId,
          appAddress: this.appAddress,
          result,
          returnValue: undefined,
        };
      },
    };
  };

  state = {
    keys: {
      globalKey: async (): Promise<uint64> => {
        return await this.getGlobalStateValue("Z2xvYmFsS2V5", "uint64");
      },
      localKey: async (address: string): Promise<uint64> => {
        return await this.getLocalStateValue(address, "bG9jYWxLZXk=", "uint64");
      },
      boxKey: async (): Promise<string> => {
        return await this.getBoxValue("Ym94S2V5", "string");
      },
    },
    maps: {
      globalMap: {
        value: async (key: string): Promise<{ foo: uint16; bar: uint16 }> => {
          const encodedKey = Buffer.concat([
            Buffer.from("p"),
            this.getABIEncodedValue(key, "string"),
          ]);
          return await this.getGlobalStateValue(
            Buffer.from(encodedKey).toString("base64"),
            "{ foo: uint16; bar: uint16 }",
          );
        },
      },
      localMap: {
        value: async (address: string, key: bytes): Promise<string> => {
          const encodedKey = Buffer.concat([
            Buffer.from("p"),
            this.getABIEncodedValue(key, "bytes"),
          ]);
          return await this.getLocalStateValue(
            address,
            Buffer.from(encodedKey).toString("base64"),
            "string",
          );
        },
      },
      boxMap: {
        value: async (key: Inputs): Promise<Outputs> => {
          const encodedKey = Buffer.concat([
            Buffer.from("p"),
            this.getABIEncodedValue(key, "Inputs"),
          ]);
          return await this.getBoxValue(
            Buffer.from(encodedKey).toString("base64"),
            "Outputs",
          );
        },
      },
    },
  };

  decodeReturnValue = {
    foo: (rawValue: Uint8Array): Outputs => {
      return this.getTypeScriptValue("Outputs", rawValue);
    },
  };
}
export default ARC56TestClient;

