import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { title, content } = await request.json();
    const note = await prisma.note.create({
      data: {
        title,
        content,
      },
    });
    return NextResponse.json(note);
  } catch (error) {
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    const notes = await prisma.note.findMany({
      where: query ? {
        OR: [
          { title: { contains: query } },
          { content: { contains: query } },
        ],
      } : undefined,
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(notes);
  } catch (error) {
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
