# Wealth Ledger

A personal portfolio and money tracker app built with Next.js. Track your savings account balance and money lent out across different categories.

## Getting Started

First, install the dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features

- **Savings Account Tracking**: View your current bank balance
- **Lent Out Money Management**: Track money lent out organized by categories (Friends, Family, Investments, etc.)
- **Total Portfolio View**: See your complete financial picture (Savings + Lent Out)
- **PWA Support**: Install as an app on your phone for quick access
- Modern, responsive UI with Tailwind CSS
- Dark mode support
- TypeScript for type safety

## Data Structure

Currently using JSON file (`data/portfolio.json`) for dummy data. Structure:

```json
{
  "savingsAccount": 45000,
  "lentOut": [
    {
      "category": "Friends",
      "entries": [
        {
          "id": "1",
          "name": "John Doe",
          "amount": 5000,
          "date": "2024-01-15",
          "notes": "Emergency loan"
        }
      ]
    }
  ]
}
```

Future migration to PostgreSQL is planned.

## PWA Setup

The app is configured as a Progressive Web App. To use on your phone:

1. Deploy to Vercel (see below)
2. Open the deployed URL on your phone
3. Use "Add to Home Screen" option in your browser

**Note**: For full PWA functionality, you'll need to add app icons:
- Create `public/icon-192x192.png` (192x192 px)
- Create `public/icon-512x512.png` (512x512 px)

You can use a tool like [Favicon Generator](https://realfavicongenerator.net/) to create these icons.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new).

Simply connect your repository to Vercel and it will automatically deploy on every push to your main branch.

## Tech Stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- next-pwa for Progressive Web App support
