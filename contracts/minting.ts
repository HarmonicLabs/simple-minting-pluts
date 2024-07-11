import { Address, PScriptContext, PaymentCredentials, Script, bool, bs, compile, makeRedeemerValidator, pfn, pBool, data } from "@harmoniclabs/plu-ts";

const minting = pfn([
  data,
  PScriptContext.type
], bool)
((redeemer, ctx) => {
  return pBool(true);
});

///////////////////////////////////////////////////////////////////
// ------------------------------------------------------------- //
// ------------------------- utilities ------------------------- //
// ------------------------------------------------------------- //
///////////////////////////////////////////////////////////////////

export const untypedValidator = makeRedeemerValidator(minting);

export const compiledContract = compile(untypedValidator);

export const script = new Script(
  "PlutusScriptV2",
  compiledContract
);

export const scriptTestnetAddr = new Address(
  "testnet",
  PaymentCredentials.script(script.hash)
);
