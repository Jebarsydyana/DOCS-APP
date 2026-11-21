# DOCS APP — Collaborative Document Workspace

A collaborative document workspace submitted for the Ajaia AI-Native Full Stack Developer Assessment.

## Links
- **Live application:** https://docs-app-three-blush.vercel.app
- **Source repository:** https://github.com/Jebarsydyana/DOCS-APP
- **Walkthrough video:** https://youtu.be/mpSzjLmFuIA


## Reviewer Access

Reviewers can create an account using the application's sign-up flow. Alternatively, they can use the provided demo accounts to explore document creation, editing, importing, and sharing functionality.

**Live application:** https://docs-app-three-blush.vercel.app

### Demo Accounts

| User | Email | Password |
|---|---|---|
| User 1 | test@gmail.com | test1234 |
| User 2 | test2@gmail.com | test1234 |

See `REVIEWER_GUIDE.md` for the suggested review flow and account usage.

---

## Local Setup

### Prerequisites
- Node.js 20 or newer
- npm
- PostgreSQL database (Neon recommended)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/Jebarsydyana/DOCS-APP.git
   cd DOCS-APP
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure environment variables by creating a `.env` file in the project root:

   ```env
   DATABASE_URL="your-postgresql-pooled-connection-string"
   DIRECT_URL="your-postgresql-direct-connection-string"
   AUTH_SECRET="your-secret-key"
   NEXT_PUBLIC_APP_NAME="Docs-App"
   ```

4. Initialize the database:

   ```bash
   npx prisma migrate dev --name init
   ```

   Alternatively, use Prisma's database synchronization command if required:

   ```bash
   npx prisma db push
   ```

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open the application in your browser:

   ```text
   http://localhost:3000
   ```

---

## Technology Stack

| Technology | Purpose |
|---|---|
| Next.js 15 | Full-stack application framework and API routes |
| React 19 | UI development |
| TypeScript | Type safety |
| Tailwind CSS v4 | Styling |
| PostgreSQL (Neon) | Persistent database |
| Prisma 6 | ORM and database management |
| Auth.js / NextAuth v5 | Authentication and session management |
| bcryptjs | Password hashing |
| Zod | Input validation |
| Tiptap | Rich-text editor |
| ProseMirror | Editor document structure |
| Mammoth | DOCX file processing |
| Vitest | Unit testing |
| jsdom | Test environment |
| Vercel | Deployment and hosting |
| GitHub | Source control |

---

## Testing

Unit tests are implemented using Vitest and jsdom for core application logic, including:

- Rich-text editor formatting and document serialization
- Autosave queue, retry logic, and conflict handling
- File import validation and supported file conversion
- Sharing-related input validation

Testing of document creation, editing, autosave, importing, and sharing workflows was also performed manually through the application.

Automated API and end-to-end tests are not currently implemented.

The live application is available for review:

https://docs-app-three-blush.vercel.app

Reviewers can create their own account or use the demo accounts to explore the main features.