import prisma from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";
import Editor from "@/components/Editor";
import TabsBar from "@/components/TabsBar";
import { createNote } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function NewNotePage({ searchParams }: { searchParams: { q?: string } }) {
  const query = searchParams.q;

  const notes = await prisma.note.findMany({
    where: query ? {
      OR: [
        { title: { contains: query } },
        { content: { contains: query } },
      ],
    } : undefined,
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true, content: true },
  });

  return (
    <main className="flex h-screen overflow-hidden bg-white text-black">
      <Sidebar notes={notes} />
      <div className="flex-1 flex flex-col min-w-0">
        <TabsBar />
        <div className="flex-1 overflow-auto">
          <Editor onSave={createNote} />
        </div>
      </div>
    </main>
  );
}
