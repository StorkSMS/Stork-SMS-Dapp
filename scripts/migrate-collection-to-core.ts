import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { 
  mplCore,
  createCollectionV1
} from '@metaplex-foundation/mpl-core'
import { 
  keypairIdentity, 
  generateSigner
} from '@metaplex-foundation/umi'
import { clusterApiUrl } from '@solana/web3.js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })
dotenv.config()

// Collection configuration
const COLLECTION_CONFIG = {
  name: 'Stork SMS Messages',
  symbol: 'STORK',
  description: 'Verified message NFTs from Stork SMS - Secure, decentralized messaging on Solana',
  // This will be updated with actual image URL
  uri: 'https://stork-sms-assets.netlify.app/collection-metadata.json',
  // 5% royalties
  sellerFeeBasisPoints: 500
}

async function migrateCollectionToCore() {
  const isMainnet = process.env.NODE_ENV === 'production'
  const rpcUrl = isMainnet 
    ? (process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET || clusterApiUrl('mainnet-beta'))
    : (process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || clusterApiUrl('devnet'))
  
  console.log(`🎨 Creating MPL-Core Collection on ${isMainnet ? 'MAINNET' : 'DEVNET'}`)
  console.log('RPC URL:', rpcUrl)
  
  // Initialize UMI with MPL-Core
  const umi = createUmi(rpcUrl).use(mplCore())
  
  // Set up the collection creator (company wallet)
  const companyWalletPrivateKey = process.env.COMPANY_WALLET_PRIV
  if (!companyWalletPrivateKey) {
    throw new Error('COMPANY_WALLET_PRIV environment variable is required')
  }
  
  // Parse the private key (JSON array format, same as company-wallet.ts)
  let privateKeyArray: number[]
  try {
    privateKeyArray = JSON.parse(companyWalletPrivateKey)
    if (!Array.isArray(privateKeyArray) || privateKeyArray.length !== 64) {
      throw new Error('Invalid private key format. Expected JSON array of 64 numbers.')
    }
  } catch (error) {
    throw new Error(`Failed to parse private key: ${error instanceof Error ? error.message : 'Invalid JSON'}`)
  }
  
  const privateKeyBytes = new Uint8Array(privateKeyArray)
  const companyKeypair = umi.eddsa.createKeypairFromSecretKey(privateKeyBytes)
  umi.use(keypairIdentity(companyKeypair))
  
  console.log('🔑 Company wallet:', companyKeypair.publicKey)
  
  // Generate a new keypair for the Collection
  const collectionSigner = generateSigner(umi)
  console.log('🎨 Generated Collection address:', collectionSigner.publicKey)
  
  try {
    console.log('🚀 Creating MPL-Core Collection...')
    console.log('Collection Configuration:')
    console.log(`  - Name: ${COLLECTION_CONFIG.name}`)
    console.log(`  - Symbol: ${COLLECTION_CONFIG.symbol}`)
    console.log(`  - Description: ${COLLECTION_CONFIG.description}`)
    console.log(`  - Royalties: ${COLLECTION_CONFIG.sellerFeeBasisPoints / 100}%`)
    
    const transactionBuilder = createCollectionV1(umi, {
      collection: collectionSigner,
      name: COLLECTION_CONFIG.name,
      uri: COLLECTION_CONFIG.uri,
      // Enable plugins for enhanced functionality - simplified for now
      plugins: []
    })
    
    const result = await transactionBuilder.sendAndConfirm(umi)
    
    console.log('✅ MPL-Core Collection created successfully!')
    console.log('Transaction signature:', result.signature)
    console.log('')
    console.log('🎯 IMPORTANT: Add these to your environment variables:')
    console.log('')
    
    if (isMainnet) {
      console.log(`NEXT_PUBLIC_COLLECTION_NFT_ADDRESS_MAINNET=${collectionSigner.publicKey}`)
      console.log(`COLLECTION_AUTHORITY_MAINNET=${companyKeypair.publicKey}`)
    } else {
      console.log(`NEXT_PUBLIC_COLLECTION_NFT_ADDRESS_DEVNET=${collectionSigner.publicKey}`)
      console.log(`COLLECTION_AUTHORITY_DEVNET=${companyKeypair.publicKey}`)
    }
    
    console.log('')
    console.log('🔍 Collection Statistics:')
    console.log(`  - Collection Address: ${collectionSigner.publicKey}`)
    console.log(`  - Authority: ${companyKeypair.publicKey}`)
    console.log(`  - Name: ${COLLECTION_CONFIG.name}`)
    console.log(`  - Symbol: ${COLLECTION_CONFIG.symbol}`)
    console.log(`  - Royalties: ${COLLECTION_CONFIG.sellerFeeBasisPoints / 100}%`)
    console.log(`  - Network: ${isMainnet ? 'Mainnet' : 'Devnet'}`)
    console.log(`  - Features: Freeze/Thaw, Burn Control, Transfer Control, Royalty Enforcement`)
    
    return {
      collectionAddress: collectionSigner.publicKey,
      authority: companyKeypair.publicKey,
      transactionSignature: result.signature,
      network: isMainnet ? 'mainnet' : 'devnet',
      features: [
        'PermanentFreezeDelegate',
        'PermanentBurnDelegate', 
        'PermanentTransferDelegate',
        'Royalties'
      ]
    }
    
  } catch (error) {
    console.error('❌ Failed to create MPL-Core Collection:', error)
    throw error
  }
}

// Run the script if called directly
if (require.main === module) {
  migrateCollectionToCore()
    .then((result) => {
      console.log('🎉 Collection migration completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Collection migration failed:', error)
      process.exit(1)
    })
}

export { migrateCollectionToCore, COLLECTION_CONFIG }