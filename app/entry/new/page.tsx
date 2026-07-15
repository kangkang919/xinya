import { Suspense } from "react"
import Editor from "@/components/Editor"
export default function NewEntryPage() {
  return <Suspense fallback={<div className="p-4 text-center text-sm text-gray-400">加载中…</div>}><Editor isNew={true} /></Suspense>
}
