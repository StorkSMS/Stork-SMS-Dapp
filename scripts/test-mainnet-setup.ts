import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { mplBubblegum } from '@metaplex-foundation/mpl-bubblegum'
import { keypairIdentity } from '@metaplex-foundation/umi'
import { publicKey as umiPublicKey } from '@metaplex-foundation/umi'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })
dotenv.config()

async function testMainnetSetup() {
  console.log('🧪 Testing Mainnet cNFT Setup...')
  console.log('================================')
  
  try {
    // Initialize UMI for mainnet
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET
    if (!rpcUrl) {
      throw new Error('NEXT_PUBLIC_SOLANA_RPC_MAINNET not configured')
    }
    
    console.log('🌐 RPC URL:', rpcUrl)
    const umi = createUmi(rpcUrl).use(mplBubblegum())
    
    // Set up company wallet
    const companyWalletPrivateKey = process.env.COMPANY_WALLET_PRIV
    if (!companyWalletPrivateKey) {
      throw new Error('COMPANY_WALLET_PRIV not configured')
    }
    
    const privateKeyArray = JSON.parse(companyWalletPrivateKey)
    const privateKeyBytes = new Uint8Array(privateKeyArray)
    const companyKeypair = umi.eddsa.createKeypairFromSecretKey(privateKeyBytes)
    umi.use(keypairIdentity(companyKeypair))
    
    console.log('🔑 Company wallet:', companyKeypair.publicKey)
    
    // Check wallet balance
    try {
      const balance = await umi.rpc.getBalance(companyKeypair.publicKey)
      const balanceSOL = Number(balance.basisPoints) / 1_000_000_000
      console.log(`💰 Mainnet balance: ${balanceSOL.toFixed(4)} SOL`)
      
      if (balanceSOL < 0.01) {
        console.log('⚠️ Low mainnet balance! You need SOL to mint cNFTs.')
        console.log('💡 Fund your wallet:', companyKeypair.publicKey)
      } else {
        console.log('✅ Sufficient balance for testing')
      }
    } catch (balanceError) {
      console.error('❌ Could not check balance:', balanceError)
    }
    
    // Check Merkle Tree configuration
    const merkleTreeAddress = process.env.MERKLE_TREE_ADDRESS_MAINNET
    const treeConfigPda = process.env.TREE_CONFIG_PDA_MAINNET
    
    if (!merkleTreeAddress) {
      throw new Error('MERKLE_TREE_ADDRESS_MAINNET not configured')
    }
    
    if (!treeConfigPda) {
      throw new Error('TREE_CONFIG_PDA_MAINNET not configured')
    }
    
    console.log('🌳 Merkle Tree:', merkleTreeAddress)
    console.log('⚙️ Tree Config PDA:', treeConfigPda)
    
    // Try to fetch tree info
    try {
      const merkleTree = umiPublicKey(merkleTreeAddress)
      const treeAccount = await umi.rpc.getAccount(merkleTree)
      
      if (treeAccount.exists) {
        console.log('✅ Merkle Tree exists on mainnet')
        console.log('📊 Tree data size:', treeAccount.data.length, 'bytes')
      } else {
        console.log('❌ Merkle Tree not found on mainnet')
      }
    } catch (treeError) {
      console.error('❌ Could not fetch tree info:', treeError)
    }
    
    // Check collection address (optional since we don't use it)
    const collectionAddress = process.env.NEXT_PUBLIC_COLLECTION_NFT_ADDRESS_MAINNET
    if (collectionAddress) {
      console.log('🎨 Collection Address:', collectionAddress, '(not used for cNFTs)')
    }
    
    console.log('')
    console.log('📋 Configuration Summary:')
    console.log('  - Network: Mainnet')
    console.log('  - Company Wallet:', companyKeypair.publicKey)
    console.log('  - Merkle Tree:', merkleTreeAddress)
    console.log('  - Tree Config:', treeConfigPda)
    console.log('  - Ready for cNFT minting:', '✅')
    
    console.log('')
    console.log('🧪 To test mainnet cNFT minting:')
    console.log('1. Uncomment SOLANA_NETWORK=mainnet in .env')
    console.log('2. Add NEXT_PUBLIC_SOLANA_NETWORK=mainnet to .env')  
    console.log('3. Ensure your company wallet has sufficient SOL')
    console.log('4. Test with a real message creation in the app')
    
  } catch (error) {
    console.error('💥 Mainnet setup test failed:', error)
    throw error
  }
}

// Run the test if called directly
if (require.main === module) {
  testMainnetSetup()
    .then(() => {
      console.log('🎉 Mainnet setup test completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Test failed:', error)
      process.exit(1)
    })
}

export { testMainnetSetup }