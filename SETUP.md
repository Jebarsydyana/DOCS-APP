# Phase 5: Document import (rebuilt from scratch)

Supports .txt, .md and .docx. Creates a new document for the logged-in user.

## Step 1: Install the one package (VS Code terminal, inside docs-app)
    npm i mammoth
    npm ls mammoth        # must print a version, not "(empty)"

## Step 2: Clean up old attempts (VS Code editor)
- Delete the folder `lib/import-docx/` if it exists (replaced by `lib/import/`).
- Press Ctrl+P and look for `convert.ts`, `process.ts`, `constraints.ts` and
  `ImportDocumentButton.tsx` from earlier phase 5 tries. Delete any copy that is
  NOT inside the paths listed in Step 3.
- If an `app/api/import/route.ts` already exists, this zip overwrites it. That is intended.

## Step 3: Extract this zip into docs-app (overwrite when asked)
Adds:
    lib/import/constraints.ts        allowed types, size limits, error messages (shared by browser + server)
    lib/import/text-to-doc.ts        .txt  -> editor JSON
    lib/import/markdown-to-doc.ts    .md   -> editor JSON
    lib/import/html-to-doc.ts        helper for .docx output
    lib/import/zip-check.ts          .docx safety checks
    lib/import/docx.ts               .docx -> editor JSON (mammoth)
    lib/import/process.ts            validate -> read -> convert -> title (no database)
    lib/import/__tests__/*           tests
    app/api/import/route.ts          POST: auth, process, create document in the database
    components/documents/ImportDocumentButton.tsx
    app/docs/import/page.tsx         a page at /docs/import that works with no other edits

## Step 4: Put the button in the sidebar (VS Code editor)
1. Press Ctrl+Shift+F and search `NewDocumentButton`.
   It is most likely in `components/layout/DashboardShell.tsx`.
2. At the top of that file add:
       import ImportDocumentButton from "@/components/documents/ImportDocumentButton";
3. Directly under `<NewDocumentButton />` add (inside the same wrapper, so they stack):
       <ImportDocumentButton />
If you skip this step you can still import at http://localhost:3000/docs/import

## Step 5: Run (VS Code terminal)
    npm test
    npm run build
    npm run dev

## Step 6: Check by hand (browser)
Make three small files first: `a.txt` (a few lines), `b.md` (a # heading, **bold**, a - list,
a 1. list) and an empty `empty.txt`.
 1. The sidebar shows "Import file" and "Supported: .txt, .md, .docx. Max 1 MB (.docx: 4 MB)."
 2. Import a.txt: you see "Reading and converting…", then the new document opens. Title = file name.
 3. Import b.md: heading, bold and both list types appear in the editor. Reload: still there.
 4. Import empty.txt: "This file is empty."
 5. A file with only spaces: "This file has no text to import."
 6. Pick a .pdf or .png: rejected with the supported list, nothing is created.
 7. Pick a text file over 1 MB: "This file is too large (...)".
 8. Rename a .pdf to .txt: rejected ("isn't valid UTF-8" or "binary").
 9. A .docx with a heading, lists and bold: imports with formatting. One with an image or table
    shows an amber note listing what changed, with an "Open document" button.
10. Prisma Studio (npx prisma studio): the new row has your user as owner_id, version 1,
    content as JSON.
11. Log out and POST to /api/import: 401.

## What each layer protects
- Browser: type + size checked before upload (fast feedback).
- Server: everything is checked again using the real bytes, never the client's claims.
- Owner always comes from the session. The request cannot choose it.
- Output only uses node types the editor allows (paragraph, heading 1-3, lists, bold/italic/underline).

## Known limits
- Links, images, code blocks, block quotes, tables and strikethrough are flattened to text, with a
  visible note. Headings deeper than 3 become level 3.
- .txt: each non-blank line becomes a paragraph. .md: wrapped lines join into one paragraph.
- .doc (old Word) and password-protected .docx are rejected with an explanation.
- Verified in my workspace: the converters, validation and pipeline (34 tests, run through a small
  stand-in for vitest). NOT verified there: the build / type-check, the mammoth call, the route,
  and the UI, because there was no network or database.
