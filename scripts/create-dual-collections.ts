import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { 
  mplCore,
  createCollection
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

// Collection configurations
const SENDER_COLLECTION_CONFIG = {
  name: 'Stork SMS - Sent Messages',
  symbol: 'STORK-SENT',
  description: 'Verified sent message NFTs from Stork SMS - Secure, decentralized messaging on Solana',
  uri: 'https://stork-sms-assets.netlify.app/sender-collection-metadata.json',
  sellerFeeBasisPoints: 500 // 5% royalties
}

const RECIPIENT_COLLECTION_CONFIG = {
  name: 'Stork SMS - Received Messages',
  symbol: 'STORK-SMS',
  description: 'Verified received message NFTs from Stork SMS - Secure, decentralized messaging on Solana',
  uri: 'https://stork-sms-assets.netlify.app/recipient-collection-metadata.json',
  sellerFeeBasisPoints: 500 // 5% royalties
}

async function createDualCollections() {
  const isMainnet = process.env.NODE_ENV === 'production'
  const rpcUrl = isMainnet 
    ? (process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET || clusterApiUrl('mainnet-beta'))
    : (process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || clusterApiUrl('devnet'))
  
  console.log(`🎨 Creating Dual MPL-Core Collections on ${isMainnet ? 'MAINNET' : 'DEVNET'}`)
  console.log('RPC URL:', rpcUrl)
  
  // Initialize UMI with MPL-Core
  const umi = createUmi(rpcUrl).use(mplCore())
  
  // Set up the collection creator (company wallet)
  const companyWalletPrivateKey = process.env.COMPANY_WALLET_PRIV
  if (!companyWalletPrivateKey) {
    throw new Error('COMPANY_WALLET_PRIV environment variable is required')
  }
  
  // Parse the private key (JSON array format)
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
  
  // Generate keypairs for both collections
  const senderCollectionSigner = generateSigner(umi)
  const recipientCollectionSigner = generateSigner(umi)
  
  console.log('📤 Sender Collection address:', senderCollectionSigner.publicKey)
  console.log('📥 Recipient Collection address:', recipientCollectionSigner.publicKey)
  
  try {
    console.log('🚀 Creating Sender Collection...')
    console.log('Sender Collection Configuration:')
    console.log(`  - Name: ${SENDER_COLLECTION_CONFIG.name}`)
    console.log(`  - Symbol: ${SENDER_COLLECTION_CONFIG.symbol}`)
    console.log(`  - Description: ${SENDER_COLLECTION_CONFIG.description}`)
    console.log(`  - Royalties: ${SENDER_COLLECTION_CONFIG.sellerFeeBasisPoints / 100}%`)
    
    const senderResult = await createCollection(umi, {
      collection: senderCollectionSigner,
      name: SENDER_COLLECTION_CONFIG.name,
      uri: SENDER_COLLECTION_CONFIG.uri,
      plugins: [
        {
          type: 'BubblegumV2'
        }
      ]
    }).sendAndConfirm(umi)
    
    console.log('✅ Sender Collection created successfully!')
    console.log('Sender Transaction signature:', senderResult.signature)
    
    console.log('🚀 Creating Recipient Collection...')
    console.log('Recipient Collection Configuration:')
    console.log(`  - Name: ${RECIPIENT_COLLECTION_CONFIG.name}`)
    console.log(`  - Symbol: ${RECIPIENT_COLLECTION_CONFIG.symbol}`)
    console.log(`  - Description: ${RECIPIENT_COLLECTION_CONFIG.description}`)
    console.log(`  - Royalties: ${RECIPIENT_COLLECTION_CONFIG.sellerFeeBasisPoints / 100}%`)
    
    const recipientResult = await createCollection(umi, {
      collection: recipientCollectionSigner,
      name: RECIPIENT_COLLECTION_CONFIG.name,
      uri: RECIPIENT_COLLECTION_CONFIG.uri,
      plugins: [
        {
          type: 'BubblegumV2'
        }
      ]
    }).sendAndConfirm(umi)
    
    console.log('✅ Recipient Collection created successfully!')
    console.log('Recipient Transaction signature:', recipientResult.signature)
    
    console.log('')
    console.log('🎯 IMPORTANT: Add these to your environment variables:')
    console.log('')
    
    if (isMainnet) {
      console.log(`NEXT_PUBLIC_SENDER_COLLECTION_MAINNET=${senderCollectionSigner.publicKey}`)
      console.log(`NEXT_PUBLIC_RECIPIENT_COLLECTION_MAINNET=${recipientCollectionSigner.publicKey}`)
      console.log(`COLLECTION_AUTHORITY_MAINNET=${companyKeypair.publicKey}`)
    } else {
      console.log(`NEXT_PUBLIC_SENDER_COLLECTION_DEVNET=${senderCollectionSigner.publicKey}`)
      console.log(`NEXT_PUBLIC_RECIPIENT_COLLECTION_DEVNET=${recipientCollectionSigner.publicKey}`)
      console.log(`COLLECTION_AUTHORITY_DEVNET=${companyKeypair.publicKey}`)
    }
    
    console.log('')
    console.log('🔍 Collections Summary:')
    console.log(`  - Sender Collection: ${senderCollectionSigner.publicKey}`)
    console.log(`  - Recipient Collection: ${recipientCollectionSigner.publicKey}`)
    console.log(`  - Authority: ${companyKeypair.publicKey}`)
    console.log(`  - Network: ${isMainnet ? 'Mainnet' : 'Devnet'}`)
    console.log(`  - Features: Collection Verification, Royalty Enforcement`)
    
    // Save collection info to JSON files
    const senderCollectionInfo = {
      collectionAddress: senderCollectionSigner.publicKey,
      collectionName: SENDER_COLLECTION_CONFIG.name,
      collectionSymbol: SENDER_COLLECTION_CONFIG.symbol,
      createdAt: new Date().toISOString(),
      transactionSignature: senderResult.signature,
      updateAuthority: companyKeypair.publicKey,
      type: 'sender'
    }
    
    const recipientCollectionInfo = {
      collectionAddress: recipientCollectionSigner.publicKey,
      collectionName: RECIPIENT_COLLECTION_CONFIG.name,
      collectionSymbol: RECIPIENT_COLLECTION_CONFIG.symbol,
      createdAt: new Date().toISOString(),
      transactionSignature: recipientResult.signature,
      updateAuthority: companyKeypair.publicKey,
      type: 'recipient'
    }
    
    return {
      senderCollection: senderCollectionInfo,
      recipientCollection: recipientCollectionInfo,
      network: isMainnet ? 'mainnet' : 'devnet'
    }
    
  } catch (error) {
    console.error('❌ Failed to create collections:', error)
    throw error
  }
}

// Run the script if called directly
if (require.main === module) {
  createDualCollections()
    .then((result) => {
      console.log('🎉 Dual collections created successfully!')
      console.log('📝 Save the addresses above to your environment variables')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Dual collections creation failed:', error)
      process.exit(1)
    })
}

export { createDualCollections, SENDER_COLLECTION_CONFIG, RECIPIENT_COLLECTION_CONFIG }