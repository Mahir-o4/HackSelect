"use client";

import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const components: Components = {
    p: ({ children }) => (
        <p className="mb-1 last:mb-0 text-xs leading-relaxed">{children}</p>
    ),
    strong: ({ children }) => (
        <strong className="font-semibold text-foreground">{children}</strong>
    ),
    em: ({ children }) => (
        <em className="italic">{children}</em>
    ),
    ul: ({ children }) => (
        <ul className="list-disc list-inside space-y-0.5 my-1 text-xs">{children}</ul>
    ),
    ol: ({ children }) => (
        <ol className="list-decimal list-inside space-y-0.5 my-1 text-xs">{children}</ol>
    ),
    li: ({ children }) => (
        <li className="text-xs">{children}</li>
    ),
    h1: ({ children }) => (
        <p className="font-bold text-foreground mb-0.5 text-xs">{children}</p>
    ),
    h2: ({ children }) => (
        <p className="font-semibold text-foreground mb-0.5 text-xs">{children}</p>
    ),
    h3: ({ children }) => (
        <p className="font-medium text-foreground mb-0.5 text-xs">{children}</p>
    ),
    code: ({ children }) => (
        <code
            className="px-1 py-0.5 rounded text-[10px] font-mono"
            style={{
                background: "hsl(var(--muted))",
                color: "hsl(var(--accent))",
            }}
        >
            {children}
        </code>
    ),
    pre: ({ children }) => (
        <pre
            className="p-2 rounded-lg text-[10px] font-mono overflow-x-auto my-1"
            style={{
                background: "hsl(var(--muted))",
                border: "1px solid hsl(var(--border) / 0.4)",
            }}
        >
            {children}
        </pre>
    ),
    a: ({ href, children }) => (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 underline"
        >
            {children}
        </a>
    ),
    hr: () => (
        <div
            className="my-1.5"
            style={{ height: "1px", background: "hsl(var(--border) / 0.4)" }}
        />
    ),
    table: ({ children }) => (
        <div className="overflow-x-auto my-2">
            <table
                className="w-full text-[10px] border-collapse"
                style={{ borderRadius: "8px", overflow: "hidden" }}
            >
                {children}
            </table>
        </div>
    ),
    thead: ({ children }) => (
        <thead
            style={{
                background: "hsl(var(--muted) / 0.6)",
                borderBottom: "1px solid hsl(var(--border) / 0.5)",
            }}
        >
            {children}
        </thead>
    ),
    tbody: ({ children }) => (
        <tbody>{children}</tbody>
    ),
    tr: ({ children }) => (
        <tr
            className="transition-colors"
            style={{ borderBottom: "1px solid hsl(var(--border) / 0.2)" }}
            onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "hsl(var(--muted) / 0.3)";
            }}
            onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
        >
            {children}
        </tr>
    ),
    th: ({ children }) => (
        <th
            className="px-3 py-1.5 text-left font-semibold text-[10px] uppercase tracking-wide"
            style={{ color: "hsl(var(--muted-foreground))" }}
        >
            {children}
        </th>
    ),
    td: ({ children }) => (
        <td
            className="px-3 py-1.5 text-[10px]"
            style={{ color: "hsl(var(--foreground))" }}
        >
            {children}
        </td>
    ),
}

interface MarkdownRendererProps {
    content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
    return (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
            {content}
        </ReactMarkdown>
    );
}