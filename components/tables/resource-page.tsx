"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Edit2, ExternalLink, Inbox, Plus, Search, Trash2, UploadCloud, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Badge, statusTone, Skeleton } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { apiFetch } from "@/lib/api/client";

type Field = {
  name: string;
  label: string;
  type?: "text" | "date" | "number" | "textarea" | "select" | "url" | "relation" | "file";
  options?: string[];
  relation?: RelationConfig;
  upload?: UploadConfig;
  placeholder?: string;
};

type RelationConfig = {
  endpoint: string;
  labelKey: string;
  emptyLabel?: string;
};

type UploadConfig = {
  endpoint: string;
  storagePathField: string;
  urlField: string;
  accept?: string;
};

type Column = {
  key: string;
  label: string;
  format?: (value: unknown, row: Record<string, unknown>) => string;
  relation?: RelationConfig;
};

type ResourceTemplate = {
  title: string;
  description: string;
  values: Record<string, unknown>;
};

type ResourcePageProps = {
  title: string;
  description: string;
  endpoint: string;
  schema: z.ZodTypeAny;
  fields: Field[];
  columns: Column[];
  emptyTitle: string;
  emptyBody: string;
  defaults: Record<string, unknown>;
  templates?: ResourceTemplate[];
  prepareSubmit?: (values: Record<string, unknown>) => Record<string, unknown>;
};

type ApiList = { data: Record<string, unknown>[] };
type ApiItem = { data: Record<string, unknown> };
type UploadResponse = { data: { uploadUrl: string; storagePath: string; fileUrl: string } };
type SignedReadResponse = { data: { url: string } };

function uploadErrorMessage(error: unknown) {
  if (error instanceof TypeError && error.message.toLowerCase().includes("failed to fetch")) {
    return "Upload could not reach Google Cloud Storage. Check the bucket CORS settings for http://localhost:3000, then try again.";
  }
  return error instanceof Error ? error.message : "Could not upload file.";
}

function relationLabel(config: RelationConfig, value: unknown, relationOptions: Record<string, Record<string, string>>) {
  if (!value || typeof value !== "string") return "—";
  return relationOptions[config.endpoint]?.[value] ?? value;
}

function renderCell(
  column: Column,
  item: Record<string, unknown>,
  relationOptions: Record<string, Record<string, string>>,
  openStoredFile: (storagePath: unknown) => void,
  openingPath: string
) {
  const raw = item[column.key];
  if (column.relation) return relationLabel(column.relation, raw, relationOptions);
  if (column.key === "storagePath") {
    if (!raw || typeof raw !== "string") return "—";
    return (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="h-8 gap-1.5 px-2.5"
        disabled={openingPath === raw}
        onClick={() => openStoredFile(raw)}
      >
        <ExternalLink className="h-3.5 w-3.5" />
        {openingPath === raw ? "Opening" : "Open"}
      </Button>
    );
  }
  const text = column.format ? column.format(raw, item) : String(raw ?? "—");
  if (column.key === "status" && text && text !== "—") {
    return <Badge tone={statusTone(text)}>{text}</Badge>;
  }
  return text || "—";
}

export function ResourcePage({
  title,
  description,
  endpoint,
  schema,
  fields,
  columns,
  emptyTitle,
  emptyBody,
  defaults,
  templates = [],
  prepareSubmit
}: ResourcePageProps) {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [relationOptions, setRelationOptions] = useState<Record<string, Record<string, string>>>({});
  const [uploadingField, setUploadingField] = useState("");
  const [openingPath, setOpeningPath] = useState("");
  const form = useForm<Record<string, unknown>>({
    resolver: zodResolver(schema),
    defaultValues: defaults
  });
  const relationKey = useMemo(() => {
    const configs = [...fields.map((field) => field.relation), ...columns.map((column) => column.relation)].filter(Boolean) as RelationConfig[];
    return JSON.stringify(configs.map((config) => `${config.endpoint}:${config.labelKey}:${config.emptyLabel ?? ""}`).sort());
  }, [columns, fields]);

  const filtered = useMemo(() => {
    const needle = query.toLowerCase();
    return items.filter((item) => JSON.stringify(item).toLowerCase().includes(needle));
  }, [items, query]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch<ApiList>(endpoint);
      setItems(response.data);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not load data.");
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const configs = [...fields.map((field) => field.relation), ...columns.map((column) => column.relation)].filter(
      Boolean
    ) as RelationConfig[];
    const unique = Array.from(new Map(configs.map((config) => [config.endpoint, config])).values());
    if (unique.length === 0) return;

    let alive = true;
    async function loadRelations() {
      const loaded = await Promise.all(
        unique.map(async (config) => {
          const response = await apiFetch<ApiList>(config.endpoint);
          const labels = Object.fromEntries(
            response.data
              .filter((item) => typeof item.id === "string")
              .map((item) => [String(item.id), String(item[config.labelKey] ?? item.id)])
          );
          return [config.endpoint, labels] as const;
        })
      );
      if (alive) setRelationOptions(Object.fromEntries(loaded));
    }

    loadRelations().catch(() => {
      if (alive) setRelationOptions({});
    });

    return () => {
      alive = false;
    };
  }, [columns, fields, relationKey]);

  function startEdit(item: Record<string, unknown>) {
    setEditing(item);
    setFormOpen(true);
    form.reset({ ...defaults, ...item });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditing(null);
    setFormOpen(false);
    form.reset(defaults);
  }

  function applyTemplate(template: ResourceTemplate) {
    setEditing(null);
    setFormOpen(true);
    form.reset({ ...defaults, ...template.values });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(values: Record<string, unknown>) {
    setError("");
    try {
      const payload = prepareSubmit ? prepareSubmit(values) : values;
      const response = await apiFetch<ApiItem>(endpoint, {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(editing ? { ...payload, id: editing.id } : payload)
      });
      setItems((current) =>
        editing ? current.map((item) => (item.id === editing.id ? response.data : item)) : [...current, response.data]
      );
      cancelEdit();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not save item.");
    }
  }

  async function remove(id: unknown) {
    if (typeof id !== "string") return;
    setError("");
    try {
      await apiFetch(`${endpoint}?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not delete item.");
    }
  }

  async function uploadFile(field: Field, file: File | undefined) {
    if (!field.upload || !file) return;
    setError("");
    setUploadingField(field.name);
    try {
      const response = await apiFetch<UploadResponse>(field.upload.endpoint, {
        method: "POST",
        body: JSON.stringify({ fileName: file.name, contentType: file.type || "application/octet-stream" })
      });
      const upload = response.data;
      let writeResponse: Response;
      try {
        writeResponse = await fetch(upload.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file
        });
      } catch (uploadError) {
        throw uploadError instanceof TypeError && uploadError.message.toLowerCase().includes("failed to fetch")
          ? new Error("Upload could not reach Google Cloud Storage. Check the bucket CORS settings for http://localhost:3000, then try again.")
          : uploadError;
      }
      if (!writeResponse.ok) {
        const details = await writeResponse.text().catch(() => "");
        throw new Error(`Google Cloud Storage upload failed (${writeResponse.status}). ${details.slice(0, 160)}`);
      }
      form.setValue(field.upload.storagePathField, upload.storagePath, { shouldDirty: true, shouldValidate: true });
      form.setValue(field.upload.urlField, upload.fileUrl, { shouldDirty: true, shouldValidate: true });
    } catch (nextError) {
      setError(uploadErrorMessage(nextError));
    } finally {
      setUploadingField("");
    }
  }

  async function openStoredFile(storagePath: unknown) {
    if (!storagePath || typeof storagePath !== "string") return;
    setError("");
    setOpeningPath(storagePath);
    try {
      const response = await apiFetch<SignedReadResponse>("/api/storage/read-url", {
        method: "POST",
        body: JSON.stringify({ storagePath })
      });
      window.open(response.data.url, "_blank", "noopener,noreferrer");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not open file.");
    } finally {
      setOpeningPath("");
    }
  }

  const singular = title.toLowerCase().replace(/s$/, "");

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-72">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              className="pl-10"
              placeholder={`Search ${title.toLowerCase()}`}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          {!formOpen && (
            <Button className="shrink-0" onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          )}
        </div>
      </header>

      {!formOpen && templates.length > 0 && (
        <Card>
          <CardHeader
            title="Quick starts"
            description={`Choose a common ${singular} template, then adjust the details before saving.`}
          />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {templates.map((template) => (
              <button
                key={template.title}
                type="button"
                onClick={() => applyTemplate(template)}
                className="rounded-2xl border border-line bg-panel/35 p-4 text-left transition-colors hover:border-brand/30 hover:bg-brand-soft/35"
              >
                <span className="block font-semibold text-ink">{template.title}</span>
                <span className="mt-1 block text-sm text-muted">{template.description}</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Form */}
      {formOpen && (
        <Card className="animate-rise">
          <CardHeader
            title={editing ? `Edit ${singular}` : `Add ${singular}`}
            description={editing ? "Update the details and save." : "Fill in the details to add a new entry."}
            action={
              <Button type="button" variant="ghost" size="sm" onClick={cancelEdit}>
                <X className="h-4 w-4" />
                Cancel
              </Button>
            }
          />
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" onSubmit={form.handleSubmit(submit)}>
            {fields.map((field) => (
              <Label key={field.name}>
                {field.label}
                {field.type === "textarea" ? (
                  <Textarea placeholder={field.placeholder} {...form.register(field.name)} />
                ) : field.type === "select" ? (
                  <Select {...form.register(field.name)}>
                    {field.options?.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                ) : field.type === "file" && field.upload ? (
                  <div className="rounded-2xl border border-dashed border-line bg-panel/35 p-4">
                    <input type="hidden" {...form.register(field.upload.storagePathField)} />
                    <input type="hidden" {...form.register(field.upload.urlField)} />
                    <input
                      id={`${title}-${field.name}-input`}
                      className="sr-only"
                      type="file"
                      accept={field.upload.accept}
                      disabled={uploadingField === field.name}
                      onChange={(event) => void uploadFile(field, event.target.files?.[0])}
                    />
                    <div className="grid gap-3">
                      <div className="min-w-0">
                        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                          <UploadCloud className="h-4 w-4 text-brand" />
                          Uploaded file
                        </span>
                        <span className="mt-1 block overflow-hidden text-ellipsis whitespace-nowrap text-xs font-normal text-muted">
                          {form.watch(field.upload.storagePathField) ? "File uploaded. Save this entry to keep it attached." : field.placeholder || "No file uploaded yet"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <label
                          htmlFor={`${title}-${field.name}-input`}
                          className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-ink transition-colors hover:bg-panel sm:w-auto"
                        >
                          <UploadCloud className="h-4 w-4" />
                          {form.watch(field.upload.storagePathField) ? "Replace file" : "Choose file"}
                        </label>
                        {form.watch(field.upload.storagePathField) ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full sm:w-auto"
                            disabled={openingPath === form.watch(field.upload.storagePathField)}
                            onClick={() => openStoredFile(form.watch(field.upload!.storagePathField))}
                          >
                            <ExternalLink className="h-4 w-4" />
                            Open
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    {uploadingField === field.name && <span className="mt-2 block text-xs font-medium text-brand">Uploading...</span>}
                  </div>
                ) : field.type === "relation" && field.relation ? (
                  <Select {...form.register(field.name)}>
                    <option value="">{field.relation.emptyLabel ?? "None"}</option>
                    {Object.entries(relationOptions[field.relation.endpoint] ?? {}).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input type={field.type ?? "text"} placeholder={field.placeholder} {...form.register(field.name)} />
                )}
                {form.formState.errors[field.name] && (
                  <span className="text-xs font-medium text-red-600 dark:text-red-300">Check this field.</span>
                )}
              </Label>
            ))}
            <div className="flex items-end">
              <Button className="w-full" disabled={form.formState.isSubmitting} type="submit">
                <Plus className="h-4 w-4" />
                {editing ? "Save changes" : "Create"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {error && (
        <p className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-300">
          {error}
        </p>
      )}

      {/* List */}
      {loading ? (
        <Card>
          <div className="grid gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="grid place-items-center py-14 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand">
            <Inbox className="h-7 w-7" />
          </span>
          <h2 className="mt-4 font-display text-lg font-bold text-ink">{query ? "No matches" : emptyTitle}</h2>
          <p className="mt-1 max-w-md text-sm text-muted">{query ? "Try a different search term." : emptyBody}</p>
        </Card>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {filtered.map((item) => (
              <Card key={String(item.id)} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{String(item[columns[0].key] ?? "—")}</p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button variant="secondary" size="icon" className="h-9 w-9" onClick={() => startEdit(item)} title="Edit">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => remove(item.id)} title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <dl className="mt-3 grid gap-1.5 text-sm">
                  {columns.slice(1).map((column) => (
                    <div key={column.key} className="flex items-center justify-between gap-3">
                      <dt className="text-muted">{column.label}</dt>
                      <dd className="min-w-0 truncate text-right font-medium text-ink/85">
                        {renderCell(column, item, relationOptions, openStoredFile, openingPath)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Card>
            ))}
          </div>

          {/* Desktop table */}
          <Card className="hidden overflow-hidden p-0 md:block">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="border-b border-line bg-panel/50 text-xs uppercase tracking-wide text-muted">
                  <tr>
                    {columns.map((column) => (
                      <th key={column.key} className="px-5 py-3.5 font-semibold">
                        {column.label}
                      </th>
                    ))}
                    <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filtered.map((item) => (
                    <tr key={String(item.id)} className="transition-colors hover:bg-panel/40">
                      {columns.map((column, index) => (
                        <td
                          key={column.key}
                          className={`px-5 py-3.5 ${index === 0 ? "font-semibold text-ink" : "text-ink/75"}`}
                        >
                          {renderCell(column, item, relationOptions, openStoredFile, openingPath)}
                        </td>
                      ))}
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1.5">
                          <Button variant="secondary" size="icon" className="h-9 w-9" onClick={() => startEdit(item)} title="Edit">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => remove(item.id)} title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
