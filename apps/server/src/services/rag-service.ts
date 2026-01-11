import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { getLLM } from "./llm-service";
import { searchVectorStore } from "./vector-service";
import { RAGResponse } from "@fileai/shared";

const RAG_PROMPT_TEMPLATE = `You are a helpful AI assistant that answers questions based on the provided context from documents.

Context from documents:
{context}

Question: {question}

Please provide a comprehensive answer based on the context above. If the context doesn't contain enough information to answer the question, say so clearly. Always cite which parts of the context you used to form your answer.

Answer:`;

export async function performRAGQuery(
    query: string,
    userId: string,
    topK: number = 5,
    documentIds?: string[]
): Promise<RAGResponse> {
    // 1. Search for relevant documents
    const filter = documentIds
        ? { documentId: { $in: documentIds } }
        : undefined;
    const searchResults = await searchVectorStore(query, userId, topK, filter);

    if (searchResults.length === 0) {
        return {
            answer: "I couldn't find any relevant information in your documents to answer this question.",
            sources: [],
        };
    }

    // 2. Prepare context from search results
    const context = searchResults
        .map((result, index) => {
            return `[Source ${index + 1}] ${result.content}`;
        })
        .join("\n\n");

    // 3. Create RAG chain
    const llm = await getLLM();

    const prompt = PromptTemplate.fromTemplate(RAG_PROMPT_TEMPLATE);

    const chain = RunnableSequence.from([
        prompt,
        llm,
        new StringOutputParser(),
    ]);

    // 4. Generate answer
    const answer = await chain.invoke({
        context,
        question: query,
    });

    return {
        answer,
        sources: searchResults,
    };
}

// Streaming version for real-time responses
export async function performRAGQueryStream(
    query: string,
    userId: string,
    topK: number = 5,
    documentIds?: string[]
) {
    // Search for relevant documents
    const filter = documentIds
        ? { documentId: { $in: documentIds } }
        : undefined;
    const searchResults = await searchVectorStore(query, userId, topK, filter);

    if (searchResults.length === 0) {
        return {
            stream: null,
            sources: [],
        };
    }

    // Prepare context
    const context = searchResults
        .map((result, index) => {
            return `[Source ${index + 1}] ${result.content}`;
        })
        .join("\n\n");

    // Create streaming chain
    const llm = await getLLM();
    const prompt = PromptTemplate.fromTemplate(RAG_PROMPT_TEMPLATE);

    const chain = RunnableSequence.from([
        prompt,
        llm,
        new StringOutputParser(),
    ]);

    const stream = await chain.stream({
        context,
        question: query,
    });

    return {
        stream,
        sources: searchResults,
    };
}
