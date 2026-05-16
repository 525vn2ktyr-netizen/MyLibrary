import prisma from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";
import Editor from "@/components/Editor";
import TabsBar from "@/components/TabsBar";
import { notFound } from "next/navigation";
import { updateNote, deleteNote } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function NotePage({ params, searchParams }: { params: { id: string }, searchParams: { q?: string } }) {
  const query = searchParams.q;

  const [notes, note] = await Promise.all([
    prisma.note.findMany({
      where: query ? {
        OR: [
          { title: { contains: query } },
          { content: { contains: query } },
        ],
      } : undefined,
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, updatedAt: true, content: true },
    }),
    prisma.note.findUnique({
      where: { id: params.id },
    }),
  ]);

  if (!note) {
    notFound();
  }

  const handleSave = updateNote.bind(null, params.id);
  const handleDelete = deleteNote.bind(null, params.id);

  return (
    <main className="flex h-screen overflow-hidden bg-white text-black">
      <Sidebar notes={notes} />
      <div className="flex-1 flex flex-col min-w-0">
        <TabsBar />
        <div className="flex-1 overflow-auto">
          <Editor 
            id={note.id}
            initialTitle={note.title} 
            initialContent={note.content} 
            onSave={handleSave}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </main>
  );
}
