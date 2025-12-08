import { Compiler, createMemoryCompilerIoApi } from '@harmoniclabs/pebble';
import { Script, ScriptType, Address, Credential } from "@harmoniclabs/buildooor";
import { fromUtf8 } from "@harmoniclabs/uint8array-utils";

const CONTRACT_NAME = 'contracts/minting.pebble'

const CONTRACT = `contract AllowAnyMint {
    mint allowMintAndBurn() {
        // no conditions: always succeed

        assert true;
    }
}`

async function compileContract(): Promise<Uint8Array> {
  const ioApi = createMemoryCompilerIoApi({
    sources: new Map([
      [CONTRACT_NAME, fromUtf8(CONTRACT)],
    ]),
    useConsoleAsOutput: true,
  });

  const compiler = new Compiler(ioApi);

  const compiled = await compiler.compile({ entry: CONTRACT_NAME });

  return compiled || new Uint8Array();
}

export const compiledContract = await compileContract();

export const script = new Script(
  ScriptType.PlutusV3,
  compiledContract
);

export const scriptTestnetAddr = new Address(
  'testnet', Credential.script(script.hash),
);