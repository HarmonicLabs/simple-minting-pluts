import { BrowserWallet, IWallet } from "@meshsdk/core";
import { Value, Address, Tx } from "@harmoniclabs/plu-ts";
import { BlockfrostPluts } from "@harmoniclabs/blockfrost-pluts";
import { scriptTestnetAddr, script } from "../../contracts/minting";
import { vkeyWitnessFromSignData } from "./commons";
import getTxBuilder from "./getTxBuilder";
import { Emulator } from "@harmoniclabs/pluts-emulator";

export async function mintNft(wallet: BrowserWallet | IWallet, provider: Emulator | BlockfrostPluts | null, isEmulator: boolean): Promise<string> {

  if (!provider) {
    throw new Error("no Emulator/Blockfrost provider");
  }

  const address = Address.fromString(
    await wallet.getChangeAddress()
  );


  const txBuilder = await getTxBuilder(provider);
  const utxos = await provider.getUtxos(address);
  if (utxos.length === 0) {
    throw new Error(isEmulator ? "No UTxOs have been found at this address on the emulated ledger" : "Have you requested funds from the faucet?");
  }  
  const utxo = utxos.find(u => u.resolved.value.lovelaces >= 15_000_000n);

  if (!utxo) {
    throw new Error("not enough ada");
  }

  const unsignedTx = await txBuilder.buildSync({
    inputs: [{ utxo }],
    changeAddress: address,
    collaterals: [utxo],
    collateralReturn: {
      address: utxo.resolved.address,
      value: Value.sub(utxo.resolved.value, Value.lovelaces(5_000_000))
    },
    mints: [{
      value: Value.singleAsset(
        scriptTestnetAddr.paymentCreds.hash,
        new Uint8Array(Buffer.from('Test Token')),
        1
      ),
      script: {
        inline: script,
        policyId: scriptTestnetAddr.paymentCreds.hash,
        redeemer: address.toData()
      }
    }]
  });

  // Sign the tx body hash
  const txHashHex = unsignedTx.body.hash.toString();
  // Build the witness set data
  const {key, signature} = await wallet.signData(txHashHex, address.toString());
  const witness = vkeyWitnessFromSignData(key, signature);

  // inject it to the unsigned tx
  unsignedTx.addVKeyWitness(witness);

  const txHash = await provider.submitTx(unsignedTx);
  console.log("Transaction Hash:", txHash);

  if (isEmulator && provider instanceof Emulator) {
    provider.awaitBlock(1);
    const ledgerState = provider.prettyPrintLedgerState(true);
    console.log("Ledger State:", ledgerState);
  }

  return txHash;
}
