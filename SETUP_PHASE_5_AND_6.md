# Phase 5 (import, fixed) + Phase 6 (sharing)

What changes for a real user:
- /docs now has **+ New document** and **Import file** buttons (with "Supported: .txt, .md, .docx").
- Every document you own has **Share** and **Delete** buttons right in the list.
- **Shared with me** lists documents with your access level (Editor / View only) and who shared them.
- Sharing is enforced in the backend and the database queries, not just hidden in the UI.

## Step 1: Install and extract
Where: VS Code terminal (inside docs-app)
    npm i mammoth          (skip if `npm ls mammoth` already shows a version)
Then extract this zip into docs-app and overwrite when asked. It overwrites ONLY:
    app/docs/page.tsx, app/docs/shared/page.tsx, components/documents/ImportDocumentButton.tsx
and adds everything else (lib/import/*, lib/share-*.ts, app/api/documents/[id]/shares/*,
app/docs/document-actions.ts, app/docs/import/page.tsx, components/documents/*, prisma/seed.mjs).

## Step 2: Add the demo-seed command
Where: VS Code editor, package.json, inside "scripts" (mind the commas):
    "db:seed": "node prisma/seed.mjs"

## Step 3: Create the demo accounts
Where: VS Code terminal
    npm run db:seed
Creates alice@example.com, bob@example.com, carol@example.com (password: Demo@1234)
and a sample document owned by Alice, shared with Bob (Viewer) and Carol (Editor).
Safe to run again.

## Step 4: Run
    npm test
    npm run build
    npm run dev

## Step 5: Test sharing with two separate accounts
Use two browser sessions: a normal window and a private/incognito window (or two browsers).
Window 1 = Alice, Window 2 = Bob. Login: http://localhost:3000/login

 1. Alice: /docs shows "Welcome to Docs (demo)" tagged "Shared with 2".
    Click **+ New document**, type a title and some text (call it "Plan"). Go back to /docs.
 2. Alice: on "Plan" click **Share**. Pick "Bob Demo", choose **Viewer**, click Share.
    Bob appears under "People with access".
 3. Bob: open /docs/shared. "Plan" is listed, badge "View only", "Shared by Alice Demo".
 4. Bob: open it. The editor is read-only with no toolbar.
 5. Bob (backend check): press F12 -> Console and run (it must print 403):
        fetch(location.pathname.replace("/docs/","/api/documents/"),{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:"hacked",version:1})}).then(r=>console.log(r.status))
 6. Alice: change Bob to **Editor** in the Share dialog.
 7. Bob: reload. The toolbar appears. Type text; the status shows Saving, then Saved.
 8. Alice: reload "Plan". Bob's text is there.
 9. Bob: he has no Share or Delete buttons on this document. In the Console run
    (must print 404, because only the owner may manage sharing):
        fetch(location.pathname.replace("/docs/","/api/documents/")+"/shares").then(r=>console.log(r.status))
10. Alice: Share dialog -> **Remove** on Bob.
11. Bob: reload /docs/<id>: the "not found" page. /docs/shared no longer lists it. Re-run the
    step 5 snippet: it prints 404.
12. Third account (Carol, or sign up a new one): paste Alice's "Plan" URL. "Not found".
    Unauthorized users cannot tell the document exists.
13. Logged out: opening /docs or an API call to /api/documents/<id>/shares returns a redirect / 401.

## What is enforced where
- Backend routes: every /api/documents/[id]/shares route first runs requireOwner (lib/share-access.ts):
  must be logged in AND own the document. The owner test is part of the database query.
- Document saves: the existing PATCH route (phase 3/4) returns 403 for viewers and 404 for people with
  no access. Step 5 and 11 prove it. If either does NOT behave as written, paste that route file.
- Lists: "Shared with me" only reads rows from document_shares for YOUR user id.
- Delete: owner only, with the owner test inside the DELETE query. It also removes all shares (cascade).
- The user picker never returns password hashes.

## Optional: Share button inside the editor page (owners only)
In app/docs/[id]/page.tsx, where the page knows the user is the owner, add:
    import ShareDialog from "@/components/documents/ShareDialog";
    {isOwner && <ShareDialog documentId={doc.id} title={doc.title} />}
(`isOwner` and `doc` are whatever your page already calls them.)
Sharing already works from the document list, so this is only a convenience.

## Known limits (honest list for the README)
- The person picker lists other accounts (up to 100) to the document owner. Fine for a demo; a real
  product would search by exact email or an organisation directory.
- Role changes apply on the next request. A viewer promoted to editor must reload; an editor who is
  demoted sees "Couldn't save" on the next autosave.
- Two editors on one document use the phase 4 version check: the second save gets a conflict prompt.
- No email invitations, no real-time collaboration, no sharing with people who have no account.
- Verified in my workspace: the import/conversion code type-checks under strict TypeScript and its
  tests pass. NOT verified there: the build, the database, the routes and the UI (no network).
  Steps 4 and 5 above are the real test.
