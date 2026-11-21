import ImportDocumentButton from "@/components/documents/ImportDocumentButton";
import { SUPPORTED_FORMATS } from "@/lib/import/constraints";

export const metadata = { title: "Import" };

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Import a document</h1>
      <p className="mt-1 text-sm text-gray-600">
        Choose a file and it becomes a new, editable document in your account.
      </p>

      <ul className="mt-6 divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white text-sm">
        {SUPPORTED_FORMATS.map((f) => (
          <li key={f.ext} className="flex items-center justify-between px-4 py-2">
            <span>
              <span className="font-mono font-medium">{f.ext}</span>
              <span className="ml-2 text-gray-600">{f.label}</span>
            </span>
            <span className="text-xs text-gray-500">up to {f.maxBytes / 1024 / 1024} MB</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 max-w-xs">
        <ImportDocumentButton />
      </div>
    </div>
  );
}
