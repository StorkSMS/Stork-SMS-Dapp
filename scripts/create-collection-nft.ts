import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { 
  createNft,
  mplTokenMetadata,
  fetchDigitalAsset,
  verifyCollectionV1,
  findMetadataPda
} from '@metaplex-foundation/mpl-token-metadata'
import { 
  generateSigner, 
  keypairIdentity,
  publicKey,
  percentAmount
} from '@metaplex-foundation/umi'
import { base58 } from '@metaplex-foundation/umi/serializers'
import * as fs from 'fs'
import * as path from 'path'
import dotenv from 'dotenv'

// Load environment variables (try .env.local first, then .env)
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

const COLLECTION_NAME = 'Stork SMS Messages'
const COLLECTION_SYMBOL = 'STORK'
const COLLECTION_DESCRIPTION = 'Official collection for Stork SMS message NFTs'
const COLLECTION_IMAGE_URI = 'https://your-domain.com/collection-image.png' // Update this with your collection image

async function createCollectionNFT() {
  try {
    console.log('🚀 Starting Collection NFT creation...')
    
    // Get company wallet private key from environment
    const privateKey = process.env.COMPANY_WALLET_PRIVATE_KEY
    if (!privateKey) {
      throw new Error('COMPANY_WALLET_PRIVATE_KEY not found in environment variables')
    }

    // Initialize UMI with company wallet - FORCE DEVNET
    const devnetRpcUrl = 'https://api.devnet.solana.com'
    console.log('🌐 Using RPC endpoint:', devnetRpcUrl)
    const umi = createUmi(devnetRpcUrl)
      .use(mplTokenMetadata())
    
    // Create keypair from private key
    const secretKey = base58.serialize(privateKey)
    const companyWallet = umi.eddsa.createKeypairFromSecretKey(secretKey)
    umi.use(keypairIdentity(companyWallet))
    
    console.log('💳 Company wallet public key:', companyWallet.publicKey)
    
    // Generate a new keypair for the collection NFT
    const collectionMint = generateSigner(umi)
    console.log('🏷️ Collection NFT address will be:', collectionMint.publicKey)
    
    // Create the Collection NFT
    console.log('📝 Creating Collection NFT...')
    const { signature } = await createNft(umi, {
      mint: collectionMint,
      name: COLLECTION_NAME,
      symbol: COLLECTION_SYMBOL,
      uri: '', // We'll update this with proper metadata later
      sellerFeeBasisPoints: percentAmount(5), // 5% royalty
      isCollection: true, // This makes it a Collection NFT
      creators: [
        {
          address: companyWallet.publicKey,
          verified: true,
          share: 100
        }
      ]
    }).sendAndConfirm(umi)
    
    console.log('✅ Collection NFT created!')
    console.log('📍 Collection NFT address:', collectionMint.publicKey)
    console.log('🔗 Transaction signature:', signature)
    
    // Save collection NFT address to a file for reference
    const collectionInfo = {
      collectionAddress: collectionMint.publicKey,
      collectionName: COLLECTION_NAME,
      createdAt: new Date().toISOString(),
      transactionSignature: signature,
      updateAuthority: companyWallet.publicKey
    }
    
    const outputPath = path.join(process.cwd(), 'collection-nft-info-devnet.json')
    fs.writeFileSync(outputPath, JSON.stringify(collectionInfo, null, 2))
    
    console.log('\n📁 Collection info saved to:', outputPath)
    console.log('\n🎉 Collection NFT created successfully!')
    console.log('\n⚡ Next steps:')
    console.log('1. Update NEXT_PUBLIC_COLLECTION_NFT_ADDRESS in your .env with:', collectionMint.publicKey)
    console.log('2. This is a DEVNET collection - make sure your app is using devnet')
    console.log('3. Upload collection metadata and image')
    console.log('4. Update the collection NFT URI with the metadata URL')
    console.log('5. Implement verifyCollectionV1 in your NFT minting process')
    
    return collectionMint.publicKey
    
  } catch (error) {
    console.error('❌ Error creating collection NFT:', error)
    throw error
  }
}

// Function to verify an NFT as part of the collection
export async function verifyNFTInCollection(
  nftAddress: string,
  collectionAddress: string,
  companyWalletPrivateKey: string
) {
  try {
    // Initialize UMI - FORCE DEVNET
    const devnetRpcUrl = 'https://api.devnet.solana.com'
    const umi = createUmi(devnetRpcUrl)
      .use(mplTokenMetadata())
    
    // Create keypair from private key
    const secretKey = base58.serialize(companyWalletPrivateKey)
    const companyWallet = umi.eddsa.createKeypairFromSecretKey(secretKey)
    umi.use(keypairIdentity(companyWallet))
    
    // Verify the NFT as part of the collection
    const { signature } = await verifyCollectionV1(umi, {
      metadata: findMetadataPda(umi, { mint: publicKey(nftAddress) }),
      collectionMint: publicKey(collectionAddress),
      authority: companyWallet // Must be collection update authority
    }).sendAndConfirm(umi)
    
    console.log('✅ NFT verified as part of collection!')
    console.log('🔗 Verification transaction:', signature)
    
    return signature
    
  } catch (error) {
    console.error('❌ Error verifying NFT in collection:', error)
    throw error
  }
}

// Run the script if called directly
if (require.main === module) {
  createCollectionNFT()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}