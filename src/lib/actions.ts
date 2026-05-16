"use server";

import prisma from "./prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createNote(title: string, content: string) {
  const note = await prisma.note.create({
    data: { title, content },
  });
  revalidatePath("/");
  redirect(`/notes/${note.id}`);
}

export async function updateNote(id: string, title: string, content: string) {
  await prisma.note.update({
    where: { id },
    data: { title, content },
  });
  revalidatePath("/");
  revalidatePath(`/notes/${id}`);
}

export async function deleteNote(id: string) {
  try {
    await prisma.note.delete({
      where: { id },
    });
  } catch (error) {
    console.error("Delete error:", error);
    throw new Error("删除失败");
  }
  revalidatePath("/");
  redirect("/");
}
