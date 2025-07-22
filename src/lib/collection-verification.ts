import { Metaplex } from '@metaplex-foundation/js'
import { Connection, PublicKey, Keypair } from '@solana/web3.js'
import bs58 from 'bs58'

/**
 * Verifies an NFT as part of a collection
 * This should be called after minting each NFT
 */
export async function verifyNFTAsCollectionItem(
  connection: Connection,
  nftMintAddress: string,
  collectionMintAddress: string,
  companyWalletPrivateKey: string
): Promise<string> {
  try {
    console.log('🔐 Starting collection verification...')
    console.log('📦 NFT to verify:', nftMintAddress)
    console.log('🏷️ Collection:', collectionMintAddress)
    
    // Create keypair from private key
    const companyWallet = Keypair.fromSecretKey(
      bs58.decode(companyWalletPrivateKey)
    )
    
    // Initialize Metaplex
    const metaplex = new Metaplex(connection)
    metaplex.use({
      identity: () => companyWallet,
      payer: () => companyWallet,
      signMessage: async (message: Uint8Array) => {
        return companyWallet.sign(message)
      },
      signTransaction: async (transaction) => {
        transaction.partialSign(companyWallet)
        return transaction
      },
      signAllTransactions: async (transactions) => {
        return transactions.map(transaction => {
          transaction.partialSign(companyWallet)
          return transaction
        })
      },
      publicKey: companyWallet.publicKey,
      secretKey: companyWallet.secretKey,
    })
    
    // Find the NFT by mint address
    const nft = await metaplex.nfts().findByMint({
      mintAddress: new PublicKey(nftMintAddress)
    })
    
    console.log('📄 Found NFT:', nft.name)
    
    // Verify the NFT as part of the collection
    const { response } = await metaplex.nfts().verifyCollection({
      mintAddress: new PublicKey(nftMintAddress),
      collectionMintAddress: new PublicKey(collectionMintAddress),
      isSizedCollection: true, // Set to true if you want to track collection size
    })
    
    console.log('✅ NFT successfully verified as part of collection!')
    console.log('🔗 Verification transaction:', response.signature)
    
    return response.signature
    
  } catch (error) {
    console.error('❌ Error verifying NFT collection:', error)
    throw error
  }
}

/**
 * Updates the collection NFT size (optional)
 * Call this after verifying NFTs if you want to track collection size
 */
export async function updateCollectionSize(
  connection: Connection,
  collectionMintAddress: string,
  companyWalletPrivateKey: string,
  newSize: number
): Promise<string> {
  try {
    // Create keypair from private key
    const companyWallet = Keypair.fromSecretKey(
      bs58.decode(companyWalletPrivateKey)
    )
    
    // Initialize Metaplex
    const metaplex = new Metaplex(connection)
    metaplex.use({
      identity: () => companyWallet,
      payer: () => companyWallet,
      signMessage: async (message: Uint8Array) => {
        return companyWallet.sign(message)
      },
      signTransaction: async (transaction) => {
        transaction.partialSign(companyWallet)
        return transaction
      },
      signAllTransactions: async (transactions) => {
        return transactions.map(transaction => {
          transaction.partialSign(companyWallet)
          return transaction
        })
      },
      publicKey: companyWallet.publicKey,
      secretKey: companyWallet.secretKey,
    })
    
    // Update collection size
    const { response } = await metaplex.nfts().update({
      nftOrSft: await metaplex.nfts().findByMint({
        mintAddress: new PublicKey(collectionMintAddress)
      }),
      collection: {
        size: newSize
      }
    })
    
    console.log('✅ Collection size updated to:', newSize)
    return response.signature
    
  } catch (error) {
    console.error('❌ Error updating collection size:', error)
    throw error
  }
}