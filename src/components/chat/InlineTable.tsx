"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Download } from "lucide-react";
import Papa from "papaparse";
import { saveAs } from "file-saver";

const DEFAULT_VISIBLE_ROWS = 5;

interface InlineTableProps {
  children: React.ReactNode;
}

export default function InlineTable({ children }: InlineTableProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Parse table structure from children
  const { headers, rows } = useMemo(() => {
    const h: string[] = [];
    const r: string[][] = [];

    const processChildren = (node: React.ReactNode) => {
      if (!node) return;
      const arr = Array.isArray(node) ? node : [node];
      arr.forEach((child) => {
        if (!child || typeof child !== "object") return;
        const el = child as React.ReactElement<{ children?: React.ReactNode }>;
        const type = (el as unknown as { type?: string }).type;

        if (type === "thead" || String(type) === "thead") {
          const thead = el.props?.children;
          if (thead) {
            const trArr = Array.isArray(thead) ? thead : [thead];
            trArr.forEach((tr) => {
              if (!tr || typeof tr !== "object") return;
              const trEl = tr as React.ReactElement<{ children?: React.ReactNode }>;
              const ths = Array.isArray(trEl.props?.children)
                ? trEl.props.children
                : trEl.props?.children
                ? [trEl.props.children]
                : [];
              ths.forEach((th: React.ReactElement<{ children?: React.ReactNode }>) => {
                if (th?.props?.children) {
                  h.push(String(extractText(th.props.children)));
                }
              });
            });
          }
        }

        if (type === "tbody" || String(type) === "tbody") {
          const tbody = el.props?.children;
          if (tbody) {
            const trs = Array.isArray(tbody) ? tbody : [tbody];
            trs.forEach((tr) => {
              if (!tr || typeof tr !== "object") return;
              const trEl = tr as React.ReactElement<{ children?: React.ReactNode }>;
              const tds = Array.isArray(trEl.props?.children)
                ? trEl.props.children
                : trEl.props?.children
                ? [trEl.props.children]
                : [];
              const row: string[] = [];
              tds.forEach((td: React.ReactElement<{ children?: React.ReactNode }>) => {
                if (td?.props?.children !== undefined) {
                  row.push(String(extractText(td.props.children)));
                }
              });
              if (row.length > 0) r.push(row);
            });
          }
        }
      });
    };

    processChildren(children);
    return { headers: h, rows: r };
  }, [children]);

  const visibleRows = isExpanded ? rows : rows.slice(0, DEFAULT_VISIBLE_ROWS);
  const hasMoreRows = rows.length > DEFAULT_VISIBLE_ROWS;

  const handleExport = () => {
    const csv = Papa.unparse({
      fields: headers,
      data: rows,
    });
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "export.csv");
  };

  if (headers.length === 0 && rows.length === 0) {
    return <div className="my-3">{children}</div>;
  }

  return (
    <div className="my-3 border border-slate-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="px-4 py-2.5 text-xs font-medium text-slate-500 text-left whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, ri) => (
              <tr key={ri} className="border-b border-slate-100 hover:bg-slate-50/50">
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={`px-4 py-2.5 text-sm ${
                      ci === 0
                        ? "font-semibold text-slate-700"
                        : "text-slate-600"
                    } whitespace-nowrap`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-4 px-4 py-2 border-t border-slate-200 bg-slate-50">
        {hasMoreRows && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 cursor-pointer"
          >
            {isExpanded ? (
              <>
                <ChevronUp size={14} /> Show less
              </>
            ) : (
              <>
                <ChevronDown size={14} /> Show all
              </>
            )}
          </button>
        )}
        <button
          onClick={handleExport}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 cursor-pointer"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>
    </div>
  );
}

function extractText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in node) {
    const el = node as React.ReactElement<{ children?: React.ReactNode }>;
    return extractText(el.props.children);
  }
  return "";
}
