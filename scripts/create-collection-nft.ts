// This script is deprecated - use migrate-collection-to-core.ts instead
// Left here for backward compatibility

import { migrateCollectionToCore } from './migrate-collection-to-core'

console.log('⚠️  This script is deprecated. Using the new MPL-Core collection system...')
console.log('🔄 Redirecting to migrate-collection-to-core.ts')

// Run the new migration script
if (require.main === module) {
  migrateCollectionToCore()
    .then((result) => {
      console.log('🎉 Collection created successfully!')
      console.log('⚡ Next steps:')
      console.log('1. Update your environment variables with the collection address')
      console.log('2. Update MERKLE_TREE_ADDRESS for cNFT minting')
      console.log('3. Test cNFT minting with the new system')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Collection creation failed:', error)
      process.exit(1)
    })
}