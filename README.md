# IDX Ownership Visualizer

Visualization tool for IDX stock ownership data. Browse and search 1% shareholder data from monthly IDX reports.

## Prerequisites

- **Node.js 18+** - [Download](https://nodejs.org/)
- **Neon account** - [Free tier available](https://console.neon.tech/)
- **Git** - [Download](https://git-scm.com/)

## Quick Start

```bash
# Install dependencies
npm install

# Create .env from example
cp .env.example .env

# Edit .env and add your DATABASE_URL from Neon console
# Open https://console.neon.tech/ → copy connection string

# Push database schema
npm run db:push

# Start development server
npm run dev
```

Visit `http://localhost:3000` to view the application.

## Environment Setup

### Get DATABASE_URL from Neon

1. Go to [Neon Console](https://console.neon.tech/)
2. Create a project or select existing
3. Copy connection string from Dashboard
4. Paste into `.env` file

**Connection string format:**
```
postgresql://[user]:[password]@[neon-host]/[dbname]?sslmode=require
```

**Note:** The same `DATABASE_URL` works for both local development and production (Vercel).

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run db:push` | Push schema changes to database |
| `npm run db:generate` | Generate migration files |
| `npm run import-pdf` | Import PDF data (for testing) |

## Troubleshooting

### Q: "No database connection string was provided" error
**A:** Create `.env` file from `.env.example` and add `DATABASE_URL` from Neon console.

### Q: Database connection timeout
**A:** Verify `DATABASE_URL` has `?sslmode=require` parameter at the end.

### Q: drizzle-kit command not found
**A:** Run `npm install` to install devDependencies.

## Project Structure

```
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   ├── lib/
│   │   ├── db/          # Database client and schema
│   │   ├── repositories/ # Data access layer
│   │   └── services/    # PDF extraction, validation
│   └── types/           # TypeScript types
├── scripts/             # Import and maintenance scripts
└── drizzle/             # Generated migration files
```

## Technology Stack

- **Framework:** Next.js 15 with App Router
- **Database:** Neon PostgreSQL with Drizzle ORM
- **Styling:** Tailwind CSS
- **PDF Processing:** pdf-parse
- **Validation:** Zod
- **Tables:** TanStack Table

## License

MIT
