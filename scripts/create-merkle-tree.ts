import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { 
  mplBubblegum, 
  createTreeV2, 
  findTreeConfigPda 
} from '@metaplex-foundation/mpl-bubblegum'
import { 
  keypairIdentity, 
  generateSigner,
  createSignerFromKeypair
} from '@metaplex-foundation/umi'
import { clusterApiUrl } from '@solana/web3.js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })
dotenv.config()

// Configuration for the Merkle Tree
// Using standard configurations that are supported by Bubblegum
const TREE_CONFIG = {
  // Maximum number of cNFTs this tree can hold
  // 14 = ~16,384 cNFTs (2^14 = 16,384) - good for initial deployment
  maxDepth: 14,
  
  // Maximum number of concurrent updates
  // 64 is a standard buffer size that's supported
  maxBufferSize: 64,
  
  // Canopy depth for proof compression
  // 0 for minimal cost, can upgrade later if needed
  canopyDepth: 0
}

async function createMerkleTree() {
  const isMainnet = process.env.NODE_ENV === 'production'
  const rpcUrl = isMainnet 
    ? (process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET || clusterApiUrl('mainnet-beta'))
    : (process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || clusterApiUrl('devnet'))
  
  console.log(`🌳 Creating Merkle Tree on ${isMainnet ? 'MAINNET' : 'DEVNET'}`)
  console.log('RPC URL:', rpcUrl)
  
  // Initialize UMI
  const umi = createUmi(rpcUrl).use(mplBubblegum())
  
  // Set up the tree creator (company wallet)
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
  
  // Check balance (devnet only)
  if (!isMainnet) {
    try {
      const balance = await umi.rpc.getBalance(companyKeypair.publicKey)
      const balanceSOL = Number(balance.basisPoints) / 1_000_000_000
      console.log(`💰 Current balance: ${balanceSOL.toFixed(4)} SOL`)
      
      if (balanceSOL < 2) {
        console.log('⚠️ Low balance detected. You may need to fund your devnet wallet.')
        console.log('💡 Get devnet SOL from: https://faucet.solana.com/')
      }
    } catch (balanceError) {
      console.warn('⚠️ Could not check balance:', balanceError)
    }
  }
  
  // Generate a new keypair for the Merkle Tree
  const merkleTree = generateSigner(umi)
  console.log('🌳 Generated Merkle Tree address:', merkleTree.publicKey)
  
  // Find the tree config PDA
  const [treeConfig] = findTreeConfigPda(umi, { merkleTree: merkleTree.publicKey })
  console.log('⚙️  Tree Config PDA:', treeConfig)
  
  try {
    console.log('🚀 Creating V2 Merkle Tree...')
    console.log('Tree Configuration:')
    console.log(`  - Max Depth: ${TREE_CONFIG.maxDepth} (supports ~${Math.pow(2, TREE_CONFIG.maxDepth).toLocaleString()} cNFTs)`)
    console.log(`  - Max Buffer Size: ${TREE_CONFIG.maxBufferSize}`)
    console.log(`  - Canopy Depth: ${TREE_CONFIG.canopyDepth}`)
    
    const transactionBuilder = await createTreeV2(umi, {
      merkleTree,
      maxDepth: TREE_CONFIG.maxDepth,
      maxBufferSize: TREE_CONFIG.maxBufferSize,
      canopyDepth: TREE_CONFIG.canopyDepth,
      // Allow tree creator to mint cNFTs
      treeCreator: createSignerFromKeypair(umi, companyKeypair),
      // Public tree (anyone can mint if they have authority)
      public: false, // Set to false for controlled minting
    })
    
    const result = await transactionBuilder.sendAndConfirm(umi)
    
    console.log('✅ Merkle Tree created successfully!')
    console.log('Transaction signature:', result.signature)
    console.log('')
    console.log('🎯 IMPORTANT: Add these to your environment variables:')
    console.log('')
    
    if (isMainnet) {
      console.log(`MERKLE_TREE_ADDRESS_MAINNET=${merkleTree.publicKey}`)
      console.log(`TREE_CONFIG_PDA_MAINNET=${treeConfig}`)
    } else {
      console.log(`MERKLE_TREE_ADDRESS_DEVNET=${merkleTree.publicKey}`)
      console.log(`TREE_CONFIG_PDA_DEVNET=${treeConfig}`)
    }
    
    console.log('')
    console.log('🔍 Tree Statistics:')
    console.log(`  - Tree Address: ${merkleTree.publicKey}`)
    console.log(`  - Tree Config: ${treeConfig}`)
    console.log(`  - Creator: ${companyKeypair.publicKey}`)
    console.log(`  - Capacity: ${Math.pow(2, TREE_CONFIG.maxDepth).toLocaleString()} cNFTs`)
    console.log(`  - Network: ${isMainnet ? 'Mainnet' : 'Devnet'}`)
    
    return {
      merkleTreeAddress: merkleTree.publicKey,
      treeConfigPda: treeConfig,
      transactionSignature: result.signature,
      network: isMainnet ? 'mainnet' : 'devnet'
    }
    
  } catch (error) {
    console.error('❌ Failed to create Merkle Tree:', error)
    throw error
  }
}

// Run the script if called directly
if (require.main === module) {
  createMerkleTree()
    .then(() => {
      console.log('🎉 Merkle Tree setup completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Merkle Tree setup failed:', error)
      process.exit(1)
    })
}

export { createMerkleTree, TREE_CONFIG }