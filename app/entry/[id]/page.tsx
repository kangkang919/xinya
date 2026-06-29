"use client"
import { useParams } from "next/navigation"
import Editor from "@/components/Editor"
export default function EditEntryPage() {
  const params = useParams()
  const id = params?.id as string
  return <Editor entryId={id} isNew={false} />
}
