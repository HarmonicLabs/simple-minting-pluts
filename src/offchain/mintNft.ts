import { BrowserWallet } from "@meshsdk/core";
import { Value, Address } from "@harmoniclabs/plu-ts";
import { BlockfrostPluts } from "@harmoniclabs/blockfrost-pluts";
import { scriptTestnetAddr, script } from "../../contracts/minting";
import { toPlutsUtxo } from "./mesh-utils";
import getTxBuilder from "./getTxBuilder";

export async function mintNft(wallet: BrowserWallet, projectId: string): Promise<string> {

  const recipient = Address.fromString(
    await wallet.getChangeAddress()
  );

  const Blockfrost = new BlockfrostPluts({ projectId });

  const txBuilder = await getTxBuilder(Blockfrost);
  const myUTxOs = (await wallet.getUtxos()).map(toPlutsUtxo);

  if (myUTxOs.length === 0) {
    throw new Error("have you requested founds from the faucet?");
  }

  const utxo = myUTxOs.find(u => u.resolved.value.lovelaces > 15_000_000);

  if (utxo === undefined) {
    throw new Error("not enough ada");
  }

  const unsignedTx = await txBuilder.buildSync({
    inputs: [{ utxo }],
    changeAddress: recipient,
    collaterals: [utxo],
    collateralReturn: {
      address: utxo.resolved.address,
      value: Value.sub(utxo.resolved.value, Value.lovelaces(5_000_000))
    },
    mints: [{
      value: Value.singleAsset(
        scriptTestnetAddr.paymentCreds.hash,
        Buffer.from('Test Token'),
        1
      ),
      script: {
        inline: script,
        policyId: scriptTestnetAddr.paymentCreds.hash,
        redeemer: recipient.toData()
      }
    }]
  });

  const txStr = await wallet.signTx(unsignedTx.toCbor().toString());

  return await Blockfrost.submitTx(txStr);
}
