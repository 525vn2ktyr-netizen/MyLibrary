import prisma from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";
import TabsBar from "@/components/TabsBar";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: { q?: string } }) {
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
        <div className="flex-1 flex items-center justify-center bg-gray-50 text-gray-500">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">欢迎来到你的知识库</h2>
            <p>从侧边栏选择一个笔记或创建一个新笔记</p>
          </div>
        </div>
      </div>
    </main>
  );
}
