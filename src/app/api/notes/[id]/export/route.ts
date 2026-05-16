import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const note = await prisma.note.findUnique({
      where: { id: params.id },
    });

    if (!note) {
      return NextResponse.json({ error: "笔记不存在" }, { status: 404 });
    }

    // 将 Markdown 内容按行分割并进行简单处理
    const lines = note.content.split("\n");
    const children = [
      new Paragraph({
        text: note.title,
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 400 },
      }),
    ];

    for (const line of lines) {
      if (line.startsWith("# ")) {
        children.push(new Paragraph({ text: line.replace("# ", ""), heading: HeadingLevel.HEADING_1 }));
      } else if (line.startsWith("## ")) {
        children.push(new Paragraph({ text: line.replace("## ", ""), heading: HeadingLevel.HEADING_2 }));
      } else if (line.startsWith("### ")) {
        children.push(new Paragraph({ text: line.replace("### ", ""), heading: HeadingLevel.HEADING_3 }));
      } else if (line.trim() === "") {
        children.push(new Paragraph({ text: "" }));
      } else {
        // 简单处理加粗
        const parts = line.split(/(\*\*.*?\*\*)/g);
        const textRuns = parts.map((part: string) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return new TextRun({ text: part.slice(2, -2), bold: true });
          }
          return new TextRun(part);
        });
        children.push(new Paragraph({ children: textRuns }));
      }
    }

    const doc = new Document({
      sections: [{ children }],
    });

    const buffer = await Packer.toBuffer(doc);

    return new NextResponse(buffer as any, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(note.title || "note")}.docx"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "导出失败" }, { status: 500 });
  }
}
