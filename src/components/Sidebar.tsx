"use client";

import Link from "next/link";
import { Plus, Search, FileText, Share2 } from "lucide-react";

import { useSearchParams } from "next/navigation";

import SearchBar from "./SearchBar";

interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: Date;
}

export default function Sidebar({ notes }: { notes: Note[] }) {
  const searchParams = useSearchParams();
  const query = searchParams.get("q");

  return (
    <div className="w-64 h-screen bg-gray-50 border-r flex flex-col">
      <div className="p-4 border-b space-y-4">
        <h1 className="text-xl font-bold">个人知识库</h1>
        <Link 
          href="/notes/new"
          className="flex items-center justify-center gap-2 w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          新建笔记
        </Link>
        <Link 
          href="/graph"
          className="flex items-center justify-center gap-2 w-full py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
        >
          <Share2 size={18} />
          知识网状图
        </Link>
        <SearchBar />
      </div>
      <div className="flex-1 overflow-y-auto">
        {notes.length === 0 ? (
          <p className="p-4 text-gray-500 text-sm text-center">
            {query ? "没有找到匹配的笔记" : "暂无笔记"}
          </p>
        ) : (
          <ul className="divide-y">
            {notes.map((note) => (
              <li key={note.id}>
                <Link
                  href={`/notes/${note.id}${query ? `?q=${query}` : ""}`}
                  className="block p-4 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-gray-400 shrink-0" />
                    <span className="font-medium truncate">{note.title || "无标题"}</span>
                  </div>
                  {query && note.content.toLowerCase().includes(query.toLowerCase()) && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 italic">
                      ...{note.content.substring(
                        Math.max(0, note.content.toLowerCase().indexOf(query.toLowerCase()) - 20),
                        note.content.toLowerCase().indexOf(query.toLowerCase()) + query.length + 40
                      )}...
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(note.updatedAt).toLocaleDateString()}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
