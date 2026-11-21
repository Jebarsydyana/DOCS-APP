// Demo accounts + a sample shared document.  Run:  npm run db:seed
// Safe to run many times: it never duplicates users or the sample document.
import fs from "node:fs";
import bcrypt from "bcryptjs";
import pkg from "@prisma/client";

// Load .env without extra packages (Node does not read it by itself)
if (fs.existsSync(".env")) {
  for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const { PrismaClient } = pkg;
const prisma = new PrismaClient();

const PASSWORD = "Demo@1234";
const DEMO = [
  { email: "alice@example.com", name: "Alice Demo" },
  { email: "bob@example.com", name: "Bob Demo" },
  { email: "carol@example.com", name: "Carol Demo" },
];

const p = (text) => ({ type: "paragraph", content: [{ type: "text", text }] });
const SAMPLE = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Welcome to Docs" }] },
    p("This sample document is owned by Alice. Bob can only view it. Carol can edit it."),
    { type: "bulletList", content: [
      { type: "listItem", content: [p("Log in as Bob: the editor is read-only.")] },
      { type: "listItem", content: [p("Log in as Carol: you can type and it autosaves.")] },
    ] },
  ],
};

try {
  const hash = await bcrypt.hash(PASSWORD, 10);
  const users = {};
  for (const d of DEMO) {
    users[d.email] = await prisma.user.upsert({
      where: { email: d.email },
      create: { email: d.email, name: d.name, passwordHash: hash },
      update: {},
    });
  }

  const alice = users["alice@example.com"];
  const title = "Welcome to Docs (demo)";
  let doc = await prisma.document.findFirst({ where: { ownerId: alice.id, title } });
  if (!doc) doc = await prisma.document.create({ data: { ownerId: alice.id, title, content: SAMPLE } });

  const grants = [
    [users["bob@example.com"].id, "VIEWER"],
    [users["carol@example.com"].id, "EDITOR"],
  ];
  for (const [userId, role] of grants) {
    await prisma.documentShare.upsert({
      where: { documentId_userId: { documentId: doc.id, userId } },
      create: { documentId: doc.id, userId, role },
      update: { role },
    });
  }

  console.log("Demo data ready. Log in with any of these (password: " + PASSWORD + "):");
  for (const d of DEMO) console.log("  " + d.email);
} finally {
  await prisma.$disconnect();
}
