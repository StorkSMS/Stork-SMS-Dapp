# Collection NFT Setup Guide

## Step 1: Create the Collection NFT

1. **Add environment variable** to your `.env.local`:
   ```
   NEXT_PUBLIC_COLLECTION_NFT_ADDRESS=
   COMPANY_WALLET_PRIVATE_KEY=your_company_wallet_private_key
   ```

2. **Install required dependencies** (if not already installed):
   ```bash
   npm install @metaplex-foundation/umi-bundle-defaults @metaplex-foundation/mpl-token-metadata bs58
   ```

3. **Run the collection creation script**:
   ```bash
   npx tsx scripts/create-collection-nft.ts
   ```

4. **Update your environment** with the generated collection address from `collection-nft-info.json`

## Step 2: Add Collection Verification to NFT Creation

Add this code to your NFT creation process (after minting each NFT):

```typescript
import { verifyNFTAsCollectionItem } from '../lib/collection-verification'

// After creating NFT
const nft = await metaplex.nfts().create({
  // ... your existing NFT creation parameters
  collection: {
    address: new PublicKey(process.env.NEXT_PUBLIC_COLLECTION_NFT_ADDRESS!),
    verified: false // Will be verified in next step
  }
})

// Verify the NFT as part of the collection
try {
  await verifyNFTAsCollectionItem(
    connection,
    nft.address.toBase58(),
    process.env.NEXT_PUBLIC_COLLECTION_NFT_ADDRESS!,
    process.env.COMPANY_WALLET_PRIVATE_KEY!
  )
} catch (error) {
  console.warn('Collection verification failed:', error)
  // Continue with NFT creation even if verification fails
}
```

## Step 3: Update NFT Metadata Structure

Make sure your NFT metadata includes the collection field:

```typescript
const metaplexMetadata = {
  // ... other metadata
  collection: {
    name: 'Stork SMS Messages',
    family: 'Stork SMS'
  }
}
```

## Step 4: Verify Existing NFTs (Optional)

If you have existing NFTs that need to be added to the collection, create a script to verify them:

```typescript
import { verifyNFTAsCollectionItem } from './src/lib/collection-verification'

const existingNFTAddresses = [
  'NFT_ADDRESS_1',
  'NFT_ADDRESS_2',
  // ... more NFT addresses
]

for (const nftAddress of existingNFTAddresses) {
  try {
    await verifyNFTAsCollectionItem(
      connection,
      nftAddress,
      process.env.NEXT_PUBLIC_COLLECTION_NFT_ADDRESS!,
      process.env.COMPANY_WALLET_PRIVATE_KEY!
    )
    console.log('✅ Verified:', nftAddress)
  } catch (error) {
    console.error('❌ Failed to verify:', nftAddress, error)
  }
}
```

## Important Notes

1. **Collection Authority**: Only the collection update authority (your company wallet) can verify NFTs
2. **Transaction Costs**: Each verification requires a separate transaction with gas fees
3. **Batch Processing**: Consider implementing batch verification for cost efficiency
4. **Error Handling**: Always handle verification failures gracefully
5. **Metadata Consistency**: Ensure all NFTs use the same collection name "Stork SMS Messages"

## Troubleshooting

- **"Insufficient funds"**: Make sure your company wallet has enough SOL for transaction fees
- **"Invalid collection authority"**: Verify you're using the correct company wallet private key
- **"Collection not found"**: Ensure the collection NFT was created successfully and the address is correct
- **"NFT already verified"**: This is normal if running verification multiple times

After completing these steps, both sender and recipient NFTs should appear in the verified "Stork SMS Messages" collection!