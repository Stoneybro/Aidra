# Monorepo with Next.js and Foundry

This is a monorepo containing:

- `apps/web`: Next.js application
- `packages/contracts`: Foundry smart contracts

## Getting Started

1. Install pnpm:

   ```bash
   npm install -g pnpm
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Start the development server:
   ```bash
   cd apps/web
   pnpm dev
   ```

## Project Structure

- `/apps/web` - Next.js application
- `/packages/contracts` - Smart contracts and tests

## Available Scripts

- `pnpm dev` - Start the Next.js development server
- `pnpm build` - Build the Next.js application
- `pnpm test` - Run tests
- `pnpm lint` - Run linter
