"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Edit2, Inbox, Plus, Search, Trash2, X } from "lucide-react";
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
  type?: "text" | "date" | "number" | "textarea" | "select" | "url";
  options?: string[];
  placeholder?: string;
};

type Column = {
  key: string;
  label: string;
  format?: (value: unknown, row: Record<string, unknown>) => string;
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
};

type ApiList = { data: Record<string, unknown>[] };
type ApiItem = { data: Record<string, unknown> };

function renderCell(column: Column, item: Record<string, unknown>) {
  const raw = item[column.key];
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
  defaults
}: ResourcePageProps) {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const form = useForm<Record<string, unknown>>({
    resolver: zodResolver(schema),
    defaultValues: defaults
  });

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

  async function submit(values: Record<string, unknown>) {
    setError("");
    try {
      const response = await apiFetch<ApiItem>(endpoint, {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(editing ? { ...values, id: editing.id } : values)
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
                      <dd className="min-w-0 truncate text-right font-medium text-ink/85">{renderCell(column, item)}</dd>
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
                          {renderCell(column, item)}
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
