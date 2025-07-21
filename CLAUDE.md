# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Stork SMS is a decentralized messaging application built on Solana blockchain technology. The project uses Next.js 15 with TypeScript and integrates Solana wallet adapters for Web3 functionality.

## Core Architecture

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Blockchain**: Solana Web3.js integration
- **Wallet Integration**: @solana/wallet-adapter-react with support for Phantom, Solflare, Torus, and Ledger wallets

### Key Components

- `src/components/wallet-provider.tsx`: Configures Solana wallet adapters and connection provider (currently set to Devnet)
- `src/components/wallet-button.tsx`: Main wallet connection interface with dropdown selection
- `src/components/ui/`: shadcn/ui component library for consistent UI patterns
- `src/app/layout.tsx`: Root layout wrapping the app with WalletContextProvider

### Development Configuration

- **UI Framework**: shadcn/ui with "new-york" style variant
- **CSS Variables**: Enabled for theme customization
- **Path Aliases**: 
  - `@/components` → `src/components`
  - `@/lib` → `src/lib`
  - `@/hooks` → `src/hooks`

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run ESLint
npm run lint
```

## Important Notes

- The wallet provider is currently configured for Solana Devnet. Change `WalletAdapterNetwork.Devnet` to `WalletAdapterNetwork.Mainnet` in `wallet-provider.tsx` when ready for production.
- The application uses Tailwind CSS with custom color scheme and design tokens defined in `tailwind.config.ts`.
- All UI components follow shadcn/ui patterns and should maintain consistency with existing design system.