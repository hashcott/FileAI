"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, FileText } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function FilesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchMutation = trpc.document.search.useMutation({
    onSuccess: (data) => {
      setSearchResults(data);
      setIsSearching(false);
    },
    onError: () => {
      setIsSearching(false);
    },
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    searchMutation.mutate({
      query: searchQuery,
      topK: 20,
    });
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Search Files</h1>
        <p className="text-gray-600 mt-2">
          Use semantic search to find documents by meaning, not just keywords
        </p>
      </div>

      <Card className="mb-6">
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents by content... (e.g., 'financial reports', 'user agreements')"
              className="flex-1"
              disabled={isSearching}
            />
            <Button type="submit" disabled={isSearching || !searchQuery.trim()}>
              <Search className="h-4 w-4 mr-2" />
              {isSearching ? "Searching..." : "Search"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {searchResults.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            Found {searchResults.length} results
          </h2>
          {searchResults.map((result, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <FileText className="h-8 w-8 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg mb-2">
                      {result.metadata.filename}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mb-2">
                      Relevance: {(result.score * 100).toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-700 line-clamp-3">
                      {result.content}
                    </p>
                    {result.document && (
                      <p className="text-xs text-gray-500 mt-2">
                        Uploaded: {formatDate(result.document.createdAt)}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {searchQuery && searchResults.length === 0 && !isSearching && (
        <div className="text-center py-12">
          <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            No results found for "{searchQuery}"
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Try different keywords or upload more documents
          </p>
        </div>
      )}
    </div>
  );
}

