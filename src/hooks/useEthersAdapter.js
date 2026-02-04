import { BrowserProvider, JsonRpcSigner } from 'ethers'
import { useMemo } from 'react'
import { useWalletClient } from 'wagmi'

export function clientToSigner(client) {
  const { account, chain, transport } = client
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  }
  const provider = new BrowserProvider(transport, network)
  const signer = new JsonRpcSigner(provider, account.address)
  return signer
}

/**
 * Hook to convert Wagmi Client to Ethers Signer
 * Required for libraries that depend on Ethers.js (like Flashbots)
 */
export function useEthersSigner({ chainId } = {}) {
  const { data: client } = useWalletClient({ chainId })
  return useMemo(() => (client ? clientToSigner(client) : undefined), [client])
}
