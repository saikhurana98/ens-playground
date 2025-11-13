import { ethers } from "ethers";

async function main() {
  const ALCHEMY_API_KEY = "9b83e52a2eeb933c78e95723a92b37207a03adbf341c8629b1b01902b6152fa9";

  // Mainnet RPC using Alchemy
  const provider = new ethers.JsonRpcProvider(
    `https://eth.llamarpc.com`
  );

  const ensName = "vitalik.eth";

  console.log(`Looking up ENS: ${ensName}\n`);

  try {
    const address = await provider.resolveName(ensName);
    const resolver = await provider.getResolver(ensName);

    const result = {
      ens: ensName,
      address,
    };

    if (resolver) {
      result.records = {
        text: {
          avatar: await resolver.getText("avatar").catch(() => null),
          email: await resolver.getText("email").catch(() => null),
          url: await resolver.getText("url").catch(() => null),
          description: await resolver.getText("description").catch(() => null),
        },
        addr: {
          ETH: await resolver.getAddress(60).catch(() => null),
        },
        contentHash: await resolver.getContentHash().catch(() => null),
      };
    }

    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Error looking up ENS:", err);
  }
}

main();
