"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

export default function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(searchParams.get("q") || "");

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    startTransition(() => {
      if (value) {
        router.push(`/?q=${encodeURIComponent(value)}`);
      } else {
        router.push("/");
      }
    });
  };

  return (
    <div className="relative">
      <Search className={`absolute left-2 top-2.5 ${isPending ? "text-blue-400 animate-pulse" : "text-gray-400"}`} size={18} />
      <input
        type="text"
        placeholder="搜索笔记..."
        value={query}
        onChange={handleSearch}
        className="w-full pl-8 pr-4 py-2 bg-white border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
