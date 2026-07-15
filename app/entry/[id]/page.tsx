"use client"
import { Suspense } from "react"
import { useParams } from "next/navigation"
import Editor from "@/components/Editor"
export default function EditEntryPage() {
  const params = useParams()
  const id = params?.id as string
  return <Suspense fallback={<div className="p-4 text-center text-sm text-gray-400">加载中…</div>}><Editor entryId={id} isNew={false} /></Suspense>
}
