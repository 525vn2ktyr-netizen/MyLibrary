"use client";

import Link from "next/link";
import { Plus, Search, FileText, Share2, ChevronLeft, ChevronRight, Menu } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import SearchBar from "./SearchBar";

interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: Date;
}

export default function Sidebar({ notes }: { notes: Note[] }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const searchParams = useSearchParams();
  const query = searchParams.get("q");

  return (
    <motion.div 
      initial={false}
      animate={{ width: isCollapsed ? 64 : 256 }}
      className="h-screen bg-gray-50 border-r flex flex-col relative group shrink-0"
    >
      {/* 收起/展开按钮 */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-10 bg-white border rounded-full p-1 shadow-sm z-50 hover:bg-gray-50 transition-colors"
        title={isCollapsed ? "展开侧边栏" : "收起侧边栏"}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className="p-4 border-b space-y-4 overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-1.5 rounded-lg text-white shrink-0">
            <Menu size={20} />
          </div>
          {!isCollapsed && (
            <motion.h1 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xl font-bold whitespace-nowrap"
            >
              个人知识库
            </motion.h1>
          )}
        </div>
        
        <Link 
          href="/notes/new"
          className={`flex items-center gap-2 w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ${isCollapsed ? 'justify-center' : 'px-3'}`}
          title="新建笔记"
        >
          <Plus size={18} className="shrink-0" />
          {!isCollapsed && <span className="whitespace-nowrap">新建笔记</span>}
        </Link>
        
        <Link 
          href="/graph"
          className={`flex items-center gap-2 w-full py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors ${isCollapsed ? 'justify-center' : 'px-3'}`}
          title="知识网状图"
        >
          <Share2 size={18} className="shrink-0" />
          {!isCollapsed && <span className="whitespace-nowrap">知识网状图</span>}
        </Link>
        
        {!isCollapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <SearchBar />
          </motion.div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {notes.length === 0 ? (
          !isCollapsed && (
            <p className="p-4 text-gray-500 text-sm text-center">
              {query ? "没有找到匹配的笔记" : "暂无笔记"}
            </p>
          )
        ) : (
          <ul className="divide-y">
            {notes.map((note) => (
              <li key={note.id}>
                <Link
                  href={`/notes/${note.id}${query ? `?q=${query}` : ""}`}
                  className={`block p-4 hover:bg-gray-100 transition-colors ${isCollapsed ? 'px-0 flex justify-center' : ''}`}
                  title={note.title || "无标题"}
                >
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-gray-400 shrink-0" />
                    {!isCollapsed && (
                      <span className="font-medium truncate">{note.title || "无标题"}</span>
                    )}
                  </div>
                  {!isCollapsed && (
                    <>
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
                    </>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  );
}
