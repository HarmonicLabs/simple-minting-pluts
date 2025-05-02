import { useState, useEffect, ChangeEvent } from "react";
import { Container, Box, Text, Button, Input, useToast } from "@chakra-ui/react";
import { useNetwork, useWallet } from "@meshsdk/react";

import style from "@/styles/Home.module.css";
import ConnectionHandler from "@/components/ConnectionHandler";
import { mintNft } from "@/offchain/mintNft";
import { Address } from "@harmoniclabs/plu-ts";
import { BlockfrostPluts } from "@harmoniclabs/blockfrost-pluts";
import { Emulator, initializeEmulator } from "@harmoniclabs/pluts-emulator";

export default function Home() {
  const [blockfrostApiKey, setBlockfrostApiKey] = useState<string>('');
  const [provider, setProvider] = useState<Emulator | BlockfrostPluts | null>(null);
  const [useEmulator, setUseEmulator] = useState(false);
  const {wallet, connected} = useWallet();
  const network = useNetwork();
  const toast = useToast();

  useEffect(() => {
    setBlockfrostApiKey(window.localStorage.getItem('BLOCKFROST_API_KEY') || '');
    setUseEmulator(process.env.NEXT_PUBLIC_EMULATOR === "true");
  }, []);

  useEffect(() => {
    if (!wallet) return;

    if (useEmulator) {
      if (wallet && connected) {
        (async() => {
          const walletAddress = Address.fromString(await wallet.getChangeAddress()); // Assuming `wallet.address` is a string
          // Initialize emulator with UTxOs directly, not using the faucet
          const addressBalances = new Map<Address, bigint>();
          addressBalances.set(walletAddress, 15_000_000n);
          try {
            const emulator = initializeEmulator(addressBalances);
            setProvider(emulator);
          } catch (error) {
            toast({
              title: "something went wrong",
              status: "error"
            });
            console.error("Error initializing emulator:", error);
          }
        })()
      }
    } else if (blockfrostApiKey) {
      const provider = new BlockfrostPluts({ projectId: blockfrostApiKey });
      setProvider(provider);
    }
  }, [wallet, connected, useEmulator, blockfrostApiKey]);

  if (typeof network === "number" && network !== 0) {
    return (
      <div className={style.root}>
        <Container maxW="container.sm" py={12} centerContent>
          <Box bg="white" w="100%" p={8}>
            <Text fontSize="xl" mb={6}>Make sure to set your wallet in testnet mode;<br/>We are playing with founds here!</Text>
            <Button size="lg" colorScheme="blue" onClick={() => window.location.reload()}>Refresh page</Button>
          </Box>
        </Container>
      </div>
    )
  }

  const onChangeBlockfrostApiKey = (e: ChangeEvent<HTMLInputElement>) => {
    setBlockfrostApiKey(e.target.value);
    window.localStorage.setItem('BLOCKFROST_API_KEY', e.target.value);
  }

  const onMintNft = () => {
    mintNft(wallet, provider, useEmulator)
      // lock transaction created successfully
      .then(txHash => {
        toast({
          title: `tx submitted: ${useEmulator ? `${txHash}` : `https://preprod.cardanoscan.io/transaction/${txHash}` } `,
          status: "success"
        });
        if (useEmulator && provider instanceof Emulator) {
          provider.awaitBlock(1)
        }
      })
      // lock transaction failed
      .catch(e => {
        toast({
          title: "something went wrong",
          status: "error"
        });
        console.error(e);
      });
  }

  return (
    <div className={style.root}>
      <Container maxW="container.sm" py={12} centerContent>
        {!useEmulator && ( <>
          <Box bg="white" w="100%" p={4} mb={4}>
            <Text fontSize="md" mb={4}>
              In order to run this example you need to provide a Blockfrost API Key<br />
              More info on <a href="https://blockfrost.io/" target="_blank" style={{color:'#0BC5EA'}}>blockfrost.io</a>
            </Text>
            <Input
              variant='filled'
              placeholder='Blockfrost API Key'
              size='lg'
              value={blockfrostApiKey}
              onChange={onChangeBlockfrostApiKey}
            />
          </Box>
        </>)}
        <Box bg="white" w="100%" p={4}>
          <ConnectionHandler isDisabled={blockfrostApiKey === ''} />
          {connected && (
            <>
              <Button size="lg" ml={4} colorScheme="teal" isDisabled={blockfrostApiKey === ''} onClick={onMintNft}>Mint NFT</Button>
            </>
          )}
        </Box>
      </Container>
    </div>
  );
}