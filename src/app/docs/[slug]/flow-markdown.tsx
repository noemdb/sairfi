import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { slugifyHeading } from "@/lib/docs/flows";
import { Separator } from "@/components/ui/separator";

function textOf(children: React.ReactNode): string {
  return React.Children.toArray(children)
    .map((c) => (typeof c === "string" ? c : ""))
    .join("");
}

export function FlowMarkdown({ markdown }: { markdown: string }) {
  return (
    <div className="flow-doc text-[15px] leading-7 text-slate-700">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1({ children }) {
            return (
              <h1 className="text-2xl font-semibold tracking-tight text-balance text-[#0f2b46] sm:text-[28px]">
                {children}
              </h1>
            );
          },
          h2({ children }) {
            const id = slugifyHeading(textOf(children));
            return (
              <h2 id={id} className="mt-10 scroll-mt-24 text-lg font-semibold tracking-tight text-[#0f2b46]">
                <a href={`#${id}`} className="no-underline hover:underline">
                  {children}
                </a>
              </h2>
            );
          },
          h3({ children }) {
            return <h3 className="mt-6 text-base font-semibold text-slate-900">{children}</h3>;
          },
          p({ children }) {
            return <p className="mt-3">{children}</p>;
          },
          a({ href, children }) {
            const external = href?.startsWith("http");
            return (
              <a
                href={href}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="font-medium text-sky-700 underline decoration-sky-200 underline-offset-2 hover:decoration-sky-500"
              >
                {children}
              </a>
            );
          },
          ul({ children }) {
            return <ul className="mt-3 list-disc space-y-1.5 pl-5">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="mt-3 list-decimal space-y-1.5 pl-5">{children}</ol>;
          },
          li({ children }) {
            return <li className="pl-1">{children}</li>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="mt-4 space-y-1 rounded-2xl border border-sky-200 bg-sky-50/60 px-4 py-3 text-sm leading-6 text-slate-700 [&>p]:mt-0">
                {children}
              </blockquote>
            );
          },
          table({ children }) {
            return (
              <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-sm">{children}</table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-slate-50/80">{children}</thead>;
          },
          th({ children }) {
            return (
              <th className="px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                {children}
              </th>
            );
          },
          td({ children }) {
            return <td className="border-t border-slate-100 px-4 py-2.5 align-top">{children}</td>;
          },
          pre({ children }) {
            return (
              <pre className="mt-4 overflow-x-auto rounded-2xl bg-[#0f2b46] p-4 text-[13px] leading-6 text-slate-100 tabular-nums">
                {children}
              </pre>
            );
          },
          code({ className, children }) {
            // Con clase (```bloque): hereda el fondo del <pre>; sin clase: píldora inline.
            if (className) {
              return <code className="font-mono">{children}</code>;
            }
            return (
              <code className="rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[13px] text-[#0f2b46]">
                {children}
              </code>
            );
          },
          hr() {
            return <Separator className="my-8" />;
          },
          strong({ children }) {
            return <strong className="font-semibold text-slate-900">{children}</strong>;
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
