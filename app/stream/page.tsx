"use client";

import { Copy, Download, FileText, Image as ImageIcon, Loader2, Paperclip, Radio, RefreshCw, Send, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";

type StreamItem = {
  id: string;
  message?: string;
  storagePath?: string;
  fileName?: string;
  contentType?: string;
  createdAt?: string;
};

type ListResponse = { data: StreamItem[] };
type ItemResponse = { data: StreamItem };
type UploadResponse = { data: { uploadUrl: string; storagePath: string } };
type ReadResponse = { data: { url: string } };

function timeLabel(value?: string) {
  if (!value) return "Just now";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function isImage(item: StreamItem) {
  return item.contentType?.startsWith("image/") || /\.(png|jpe?g|gif|webp|avif)$/i.test(item.fileName ?? "");
}

export default function StreamPage() {
  const [items, setItems] = useState<StreamItem[]>([]);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await apiFetch<ListResponse>("/api/stream");
      setItems(response.data);
      setError("");
    } catch (nextError) {
      if (!quiet) setError(nextError instanceof Error ? nextError.message : "Could not load the stream.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(true), 15000);
    return () => window.clearInterval(interval);
  }, [load]);

  const imagePaths = useMemo(
    () => items.filter((item) => item.storagePath && isImage(item)).map((item) => item.storagePath as string),
    [items]
  );

  useEffect(() => {
    const missing = imagePaths.filter((path) => !urls[path]);
    if (!missing.length) return;
    let alive = true;
    Promise.all(missing.map(async (storagePath) => {
      const response = await apiFetch<ReadResponse>("/api/storage/read-url", { method: "POST", body: JSON.stringify({ storagePath }) });
      return [storagePath, response.data.url] as const;
    })).then((loaded) => {
      if (alive) setUrls((current) => ({ ...current, ...Object.fromEntries(loaded) }));
    }).catch(() => undefined);
    return () => { alive = false; };
  }, [imagePaths, urls]);

  async function send() {
    if (!message.trim() && !file) return;
    setSending(true);
    setError("");
    try {
      let attachment: Pick<StreamItem, "storagePath" | "fileName" | "contentType"> = {};
      if (file) {
        const signed = await apiFetch<UploadResponse>("/api/stream/upload-url", {
          method: "POST",
          body: JSON.stringify({ fileName: file.name, contentType: file.type || "application/octet-stream" })
        });
        const upload = await fetch(signed.data.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file
        });
        if (!upload.ok) throw new Error(`File upload failed (${upload.status}).`);
        attachment = { storagePath: signed.data.storagePath, fileName: file.name, contentType: file.type || "application/octet-stream" };
      }
      const response = await apiFetch<ItemResponse>("/api/stream", {
        method: "POST",
        body: JSON.stringify({ message: message.trim(), ...attachment })
      });
      setItems((current) => [response.data, ...current]);
      setMessage("");
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not send this item.");
    } finally {
      setSending(false);
    }
  }

  async function openFile(item: StreamItem, download = false) {
    if (!item.storagePath) return;
    try {
      const response = await apiFetch<ReadResponse>(download ? "/api/storage/download-url" : "/api/storage/read-url", {
        method: "POST",
        body: JSON.stringify({ storagePath: item.storagePath })
      });
      window.open(response.data.url, "_blank", "noopener,noreferrer");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not open the file.");
    }
  }

  async function remove(id: string) {
    try {
      await apiFetch(`/api/stream?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not remove the item.");
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-strong"><Radio className="h-5 w-5" /><span className="text-sm font-bold">Your private drop zone</span></div>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-ink">Stream</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">Drop a thought, image, or document here and pick it up from any signed-in device.</p>
        </div>
        <Button variant="secondary" size="icon" onClick={() => void load()} disabled={loading} title="Refresh stream">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </header>

      <Card
        className={`p-4 transition-colors sm:p-5 ${dragging ? "border-brand bg-brand-soft/30" : ""}`}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDrop={(event) => { event.preventDefault(); setDragging(false); setFile(event.dataTransfer.files[0] ?? null); }}
      >
        <Textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Write something you want available later…"
          className="min-h-24 resize-y border-0 bg-transparent p-1 shadow-none focus:ring-0"
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); void send(); }
          }}
        />
        {file ? (
          <div className="mt-3 flex min-w-0 items-center gap-3 rounded-xl border border-line bg-panel/60 p-3">
            {file.type.startsWith("image/") ? <ImageIcon className="h-5 w-5 shrink-0 text-brand" /> : <FileText className="h-5 w-5 shrink-0 text-brand" />}
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{file.name}</span>
            <button type="button" onClick={() => setFile(null)} className="text-muted hover:text-ink" aria-label="Remove attachment"><X className="h-4 w-4" /></button>
          </div>
        ) : null}
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
          <div>
            <input ref={fileInput} type="file" className="hidden" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            <Button variant="ghost" size="sm" onClick={() => fileInput.current?.click()}><Paperclip className="h-4 w-4" />Attach</Button>
          </div>
          <Button size="sm" disabled={sending || (!message.trim() && !file)} onClick={() => void send()}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{sending ? "Sending" : "Send to stream"}
          </Button>
        </div>
      </Card>

      {error ? <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</p> : null}

      <section className="grid gap-3">
        {loading ? (
          <Card className="grid place-items-center py-14"><Loader2 className="h-7 w-7 animate-spin text-brand" /></Card>
        ) : items.length === 0 ? (
          <Card className="grid place-items-center py-14 text-center"><Radio className="h-8 w-8 text-brand" /><h2 className="mt-3 font-display text-lg font-bold text-ink">The stream is ready</h2><p className="mt-1 text-sm text-muted">Your first message or drop will stay here across sessions.</p></Card>
        ) : items.map((item) => (
          <Card key={item.id} className="overflow-hidden p-0">
            {item.storagePath && isImage(item) && urls[item.storagePath] ? (
              <button type="button" className="block max-h-[34rem] w-full overflow-hidden bg-panel" onClick={() => void openFile(item)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={urls[item.storagePath]} alt={item.fileName ?? "Stream attachment"} className="max-h-[34rem] w-full object-contain" />
              </button>
            ) : null}
            <div className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <Badge tone="neutral">{timeLabel(item.createdAt)}</Badge>
                <div className="flex gap-1">
                  {item.message ? <Button variant="ghost" size="icon" className="h-8 w-8" title="Copy message" onClick={() => void navigator.clipboard.writeText(item.message ?? "")}><Copy className="h-3.5 w-3.5" /></Button> : null}
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Delete" onClick={() => void remove(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              {item.message ? <p className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-ink">{item.message}</p> : null}
              {item.storagePath ? (
                <div className="mt-4 flex min-w-0 items-center gap-3 rounded-xl border border-line bg-panel/50 p-3">
                  {isImage(item) ? <ImageIcon className="h-5 w-5 shrink-0 text-brand" /> : <FileText className="h-5 w-5 shrink-0 text-brand" />}
                  <button type="button" className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-ink hover:text-brand-strong" onClick={() => void openFile(item)}>{item.fileName || "Attachment"}</button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="Download" onClick={() => void openFile(item, true)}><Download className="h-4 w-4" /></Button>
                </div>
              ) : null}
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
