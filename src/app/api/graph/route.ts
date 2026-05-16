import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const notes = await prisma.note.findMany({
      select: {
        id: true,
        title: true,
        content: true,
      },
    });

    const nodes = notes.map((note: { id: string; title: string }) => ({
      id: note.id,
      title: note.title,
    }));

    const links: { source: string; target: string }[] = [];

    notes.forEach((note: { id: string; content: string }) => {
      // 匹配格式如 /notes/uuid 的链接
      const regex = /\/notes\/([a-f0-9-]{36})/g;
      let match;
      while ((match = regex.exec(note.content)) !== null) {
        const targetId = match[1];
        // 确保目标笔记存在
        if (notes.some((n: { id: string }) => n.id === targetId)) {
          links.push({
            source: note.id,
            target: targetId,
          });
        }
      }
    });

    return NextResponse.json({ nodes, links });
  } catch (error) {
    console.error("Graph data error:", error);
    return NextResponse.json({ error: "获取图谱数据失败" }, { status: 500 });
  }
}
