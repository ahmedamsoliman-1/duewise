"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Edit2, Plus, Search, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
    form.reset({ ...defaults, ...item });
  }

  function cancelEdit() {
    setEditing(null);
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

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal text-ink">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink/60">{description}</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-ink/35" />
          <Input className="pl-9" placeholder="Search this module" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
      </header>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{editing ? "Edit item" : `Add ${title.toLowerCase().replace(/s$/, "")}`}</h2>
          {editing && (
            <Button type="button" variant="ghost" onClick={cancelEdit}>
              <X className="h-4 w-4" />
              Cancel
            </Button>
          )}
        </div>
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
                <span className="text-xs font-normal text-red-700">Check this field.</span>
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

      {error && <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <Card className="overflow-hidden p-0">
        {loading ? (
          <p className="p-6 text-sm text-ink/60">Loading {title.toLowerCase()}...</p>
        ) : filtered.length === 0 ? (
          <div className="p-8">
            <h2 className="text-lg font-semibold">{emptyTitle}</h2>
            <p className="mt-1 max-w-xl text-sm text-ink/60">{emptyBody}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="bg-mist text-xs uppercase text-ink/50">
                <tr>
                  {columns.map((column) => (
                    <th key={column.key} className="px-4 py-3 font-semibold">
                      {column.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {filtered.map((item) => (
                  <tr key={String(item.id)} className="bg-white dark:bg-[#111817]">
                    {columns.map((column) => (
                      <td key={column.key} className="px-4 py-3 text-ink/75">
                        {column.format ? column.format(item[column.key], item) : String(item[column.key] ?? "-")}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="secondary" onClick={() => startEdit(item)} title="Edit">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => remove(item.id)} title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
