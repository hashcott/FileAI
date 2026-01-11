"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, FileText, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function FilesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{
    content: string;
    score: number;
    metadata: { filename?: string };
    document?: { createdAt: string };
  }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const searchMutation = trpc.document.search.useMutation({
    onSuccess: (data) => {
      setSearchResults(data);
      setIsSearching(false);
      setHasSearched(true);
    },
    onError: () => {
      setIsSearching(false);
      setHasSearched(true);
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

  const exampleQueries = [
    "financial reports",
    "user agreements",
    "technical docs",
    "meeting notes",
  ];

  return (
    <div className="h-full overflow-y-auto p-6 lg:p-8 space-y-6 max-w-5xl mx-auto custom-scrollbar">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Semantic Search</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Find documents by meaning, not just keywords.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-primary">AI-Powered</span>
        </div>
      </div>

      {/* Search Form */}
      <Card className="bg-card border-border">
        <CardContent className="p-5">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Describe what you're looking for..."
                className="bg-accent border-border pl-11 h-12 text-base rounded-lg"
                disabled={isSearching}
              />
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Try:</span>
                {exampleQueries.map((query, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSearchQuery(query)}
                    className="px-3 py-1 rounded-md bg-accent text-xs font-medium hover:bg-primary/10 hover:text-primary transition-colors border border-border"
                  >
                    {query}
                  </button>
                ))}
              </div>
              <Button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="bg-primary rounded-lg h-10 px-5 font-medium w-full sm:w-auto"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Searching
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {hasSearched && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">
              Results
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {searchResults.length} found
              </span>
            </h2>
          </div>

          <div className="space-y-3">
            {searchResults.length > 0 ? (
              searchResults.map((result, index) => (
                <Card
                  key={index}
                  className="bg-card border-border hover:border-primary/30 transition-colors"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-4 mb-2">
                          <h3 className="font-medium truncate">
                            {result.metadata.filename}
                          </h3>
                          <span className="text-xs font-medium text-chart-2 bg-chart-2/10 px-2 py-0.5 rounded flex-shrink-0">
                            {(result.score * 100).toFixed(0)}% match
                          </span>
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {result.content}
                        </p>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {result.document ? formatDate(result.document.createdAt) : 'Unknown date'}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary hover:bg-primary/10 rounded-md h-7 text-xs"
                          >
                            View
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="p-12 text-center">
                  <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center mx-auto mb-3">
                    <Search className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium mb-1">No results found</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Try different keywords or upload more documents to expand your knowledge base.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Initial State */}
      {!hasSearched && (
        <Card className="bg-card border-border">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-primary-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">
              Semantic Search
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Search by meaning instead of exact keywords. Describe what you&apos;re looking for and let AI find the most relevant documents.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
