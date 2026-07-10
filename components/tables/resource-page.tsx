"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Copy,
  Download,
  Edit2,
  ExternalLink,
  FileText,
  Grid2X2,
  Inbox,
  List,
  MoveDown,
  MoveUp,
  Plus,
  Search,
  Trash2,
  UploadCloud,
  UserRound,
  Users,
  X
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Badge, statusTone, Skeleton } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { apiFetch } from "@/lib/api/client";
import { SELF_FAMILY_MEMBER_ID, SELF_FAMILY_MEMBER_LABEL } from "@/lib/family/self";
import { reorderItems, sortItemsByPosition } from "@/lib/utils/ordering";

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
  includeSelf?: boolean;
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

type QuickFilter = {
  label: string;
  key: string;
  value?: string;
  relation?: RelationConfig;
  predicate?: (item: Record<string, unknown>) => boolean;
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
  visualMode?: "familyTree";
  preferredListView?: "grid" | "table";
  mobileCardVariant?: "tasks";
  quickFilters?: QuickFilter[];
};

type ApiList = { data: Record<string, unknown>[] };
type ApiItem = { data: Record<string, unknown> };
type UploadResponse = { data: { uploadUrl: string; storagePath: string; fileUrl: string } };
type SignedReadResponse = { data: { url: string } };

const imageExtensions = new Set(["jpg", "jpeg", "png", "gif", "webp", "avif", "bmp", "svg"]);

function fileExtension(storagePath: string) {
  return storagePath.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
}

function fileKind(storagePath: string) {
  const extension = fileExtension(storagePath);
  if (extension === "pdf") return { label: "PDF", tone: "bg-red-500/12 text-red-700 dark:text-red-300" };
  if (["doc", "docx"].includes(extension)) return { label: "DOC", tone: "bg-blue-500/12 text-blue-700 dark:text-blue-300" };
  if (["xls", "xlsx"].includes(extension)) return { label: "XLS", tone: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" };
  return { label: extension ? extension.toUpperCase() : "FILE", tone: "bg-brand-soft text-brand-strong" };
}

function uploadErrorMessage(error: unknown) {
  if (error instanceof TypeError && error.message.toLowerCase().includes("failed to fetch")) {
    return "Upload could not reach Google Cloud Storage. Check the bucket CORS settings for http://localhost:3000, then try again.";
  }
  return error instanceof Error ? error.message : "Could not upload file.";
}

function isPreviewableImage(storagePath: string) {
  const extension = fileExtension(storagePath);
  return Boolean(extension && imageExtensions.has(extension));
}

function relationLabel(config: RelationConfig, value: unknown, relationOptions: Record<string, Record<string, string>>) {
  if (!value || typeof value !== "string") return "—";
  if (config.includeSelf && value === SELF_FAMILY_MEMBER_ID) return SELF_FAMILY_MEMBER_LABEL;
  return relationOptions[config.endpoint]?.[value] ?? value;
}

function filterMatches(filter: QuickFilter, item: Record<string, unknown>) {
  if (filter.predicate) return filter.predicate(item);
  const value = item[filter.key];
  if (filter.value === "") return !value;
  if (Array.isArray(value)) return value.map(String).includes(String(filter.value));
  return String(value ?? "") === String(filter.value ?? "");
}

function buildCopyLabel(item: Record<string, unknown>) {
  if (typeof item.title === "string" && item.title.trim()) return `${item.title.trim()} (copy)`;
  if (typeof item.name === "string" && item.name.trim()) return `${item.name.trim()} (copy)`;
  return "Copy";
}

function renderCell(
  column: Column,
  item: Record<string, unknown>,
  relationOptions: Record<string, Record<string, string>>,
  openStoredFile: (storagePath: unknown) => void,
  downloadStoredFile: (storagePath: unknown) => void,
  openingPath: string,
  downloadingPath: string,
  previewUrls: Record<string, string>
) {
  const raw = item[column.key];
  if (column.relation) return relationLabel(column.relation, raw, relationOptions);
  if (column.key === "storagePath") {
    if (!raw || typeof raw !== "string") return "—";
    return (
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 md:justify-start">
        {previewUrls[raw] ? (
          <button
            type="button"
            className="block h-12 w-12 overflow-hidden rounded-lg border border-line bg-panel"
            onClick={() => openStoredFile(raw)}
            title="Open image"
          >
            <Image className="h-full w-full object-cover" src={previewUrls[raw]} alt="" width={48} height={48} unoptimized />
          </button>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-8 min-w-0 gap-1.5 px-2.5"
          disabled={openingPath === raw}
          onClick={() => openStoredFile(raw)}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {openingPath === raw ? "Opening" : "Open"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={downloadingPath === raw}
          onClick={() => downloadStoredFile(raw)}
          title="Download"
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }
  const text = column.format ? column.format(raw, item) : String(raw ?? "—");
  if (column.key === "status" && text && text !== "—") {
    return <Badge tone={statusTone(text)}>{text}</Badge>;
  }
  return text || "—";
}

function initials(name: unknown) {
  return String(name ?? "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function relationshipGroup(item: Record<string, unknown>) {
  const relationship = String(item.relationship ?? "").toLowerCase();
  if (/\b(mother|father|parent|mom|mum|dad|stepmother|stepfather)\b/.test(relationship)) return "parents";
  if (/\b(wife|husband|spouse|partner)\b/.test(relationship)) return "partner";
  if (/\b(son|daughter|child|kid|children)\b/.test(relationship)) return "children";
  if (/\b(brother|sister|sibling)\b/.test(relationship)) return "siblings";
  return "other";
}

function FamilyMemberNode({
  item,
  onEdit,
  compact = false
}: {
  item: Record<string, unknown>;
  onEdit: (item: Record<string, unknown>) => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onEdit(item)}
      className={`group rounded-2xl border border-line bg-surface text-left shadow-sm transition-colors hover:border-brand/30 hover:bg-brand-soft/25 ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-panel text-sm font-extrabold text-brand-strong ring-1 ring-line">
          {initials(item.name)}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-semibold text-ink">{String(item.name ?? "Unnamed")}</span>
          <span className="block truncate text-sm text-muted">{String(item.relationship ?? "Family")}</span>
        </span>
      </div>
      {item.dateOfBirth ? (
        <span className="mt-3 inline-flex rounded-full bg-panel px-2.5 py-1 text-xs font-semibold text-ink/70">
          {String(item.dateOfBirth)}
        </span>
      ) : null}
    </button>
  );
}

function FamilyTreePreview({
  items,
  onEdit
}: {
  items: Record<string, unknown>[];
  onEdit: (item: Record<string, unknown>) => void;
}) {
  const parents = items.filter((item) => relationshipGroup(item) === "parents");
  const partner = items.filter((item) => relationshipGroup(item) === "partner");
  const children = items.filter((item) => relationshipGroup(item) === "children");
  const siblings = items.filter((item) => relationshipGroup(item) === "siblings");
  const other = items.filter((item) => relationshipGroup(item) === "other");

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-line bg-panel/40 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-brand-strong">
              <Users className="h-4 w-4" />
              Household tree
            </span>
            <h2 className="mt-1 font-display text-xl font-extrabold text-ink">Family around you</h2>
          </div>
          <Badge tone="brand">{items.length} members</Badge>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="mx-auto grid max-w-5xl justify-items-center gap-5">
          {parents.length > 0 && (
            <>
              <div className="grid w-full max-w-2xl gap-3 sm:grid-cols-2">
                {parents.map((item) => (
                  <FamilyMemberNode key={String(item.id)} item={item} onEdit={onEdit} />
                ))}
              </div>
              <div className="h-8 w-px bg-line" />
            </>
          )}

          <div className="grid w-full justify-items-center gap-4">
            <div className="grid w-full max-w-3xl items-center justify-items-center gap-3 md:grid-cols-[1fr_56px_1fr]">
              <div className="grid justify-items-center gap-3">
                <div className="grid h-20 w-20 place-items-center rounded-3xl bg-brand-gradient text-white shadow-glow">
                  <UserRound className="h-9 w-9" />
                </div>
                <div className="text-center">
                  <p className="font-display text-lg font-extrabold text-ink">{SELF_FAMILY_MEMBER_LABEL}</p>
                  <p className="text-sm text-muted">Account owner</p>
                </div>
              </div>

              <div className="hidden h-px w-full bg-line md:block" />
              <div className="h-7 w-px bg-line md:hidden" />

              {partner.length > 0 ? (
                <div className="grid w-full gap-3">
                  <p className="text-center text-xs font-semibold uppercase text-muted">Spouse / partner</p>
                  {partner.map((item) => (
                    <FamilyMemberNode key={String(item.id)} item={item} onEdit={onEdit} compact />
                  ))}
                </div>
              ) : (
                <div className="hidden md:block" />
              )}
            </div>
          </div>

          {children.length > 0 && (
            <>
              <div className="grid justify-items-center gap-0">
                <div className="h-8 w-px bg-line" />
                <div className="h-px w-32 bg-line sm:w-72" />
              </div>
              <div className="grid w-full max-w-3xl gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {children.map((item) => (
                  <FamilyMemberNode key={String(item.id)} item={item} onEdit={onEdit} />
                ))}
              </div>
            </>
          )}

          {(siblings.length > 0 || other.length > 0) && (
            <div className="mt-2 grid w-full gap-4 lg:grid-cols-2">
              {siblings.length > 0 && (
                <div className="grid gap-3">
                  <p className="text-xs font-semibold uppercase text-muted">Siblings</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {siblings.map((item) => (
                      <FamilyMemberNode key={String(item.id)} item={item} onEdit={onEdit} compact />
                    ))}
                  </div>
                </div>
              )}

              {other.length > 0 && (
                <div className="grid gap-3">
                  <p className="text-xs font-semibold uppercase text-muted">Extended family</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {other.map((item) => (
                      <FamilyMemberNode key={String(item.id)} item={item} onEdit={onEdit} compact />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function ResourceGridCards({
  items,
  columns,
  relationOptions,
  previewUrls,
  openingPath,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleSelect,
  onDragStart,
  onDragOver,
  onDrop,
  selectedIds,
  draggingId,
  onOpenFile,
  onDownloadFile
}: {
  items: Record<string, unknown>[];
  columns: Column[];
  relationOptions: Record<string, Record<string, string>>;
  previewUrls: Record<string, string>;
  openingPath: string;
  onEdit: (item: Record<string, unknown>) => void;
  onDelete: (id: unknown) => void;
  onDuplicate: (id: unknown) => void;
  onToggleSelect: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragOver: (event: React.DragEvent<HTMLElement>) => void;
  onDrop: (targetId: string) => void;
  selectedIds: string[];
  draggingId?: string;
  onOpenFile: (storagePath: unknown) => void;
  onDownloadFile: (storagePath: unknown) => void;
}) {
  const titleColumn = columns[0];
  const detailColumns = columns.filter((column) => column.key !== titleColumn.key && column.key !== "storagePath");

  return (
    <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
        const storagePath = typeof item.storagePath === "string" ? item.storagePath : "";
        const previewUrl = storagePath ? previewUrls[storagePath] : "";
        const kind = storagePath ? fileKind(storagePath) : undefined;

        return (
          <Card key={String(item.id)} className="overflow-hidden p-0" draggable onDragStart={() => onDragStart(String(item.id))} onDragOver={onDragOver} onDrop={() => onDrop(String(item.id))}>
            <div className="flex items-center justify-between border-b border-line bg-panel/40 px-3 py-2">
              <label className="flex items-center gap-2 text-sm font-medium text-ink/70">
                <input type="checkbox" checked={selectedIds.includes(String(item.id))} onChange={() => onToggleSelect(String(item.id))} />
                Select
              </label>
              <span className={`text-[11px] font-semibold uppercase tracking-wide ${draggingId === String(item.id) ? "text-brand" : "text-muted"}`}>
                {draggingId === String(item.id) ? "Moving" : "Drag"}
              </span>
            </div>
            <button
              type="button"
              className="relative block aspect-[4/3] w-full overflow-hidden bg-panel text-left"
              onClick={() => (storagePath ? onOpenFile(storagePath) : onEdit(item))}
            >
              {previewUrl ? (
                <Image className="h-full w-full object-cover" src={previewUrl} alt="" fill sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw" unoptimized />
              ) : (
                <span className="grid h-full place-items-center bg-[radial-gradient(circle_at_top_left,rgba(246,139,31,0.16),transparent_32%),linear-gradient(135deg,var(--panel),var(--surface))] p-6">
                  <span className="grid justify-items-center gap-3">
                    <span className="relative grid h-20 w-16 place-items-center rounded-xl border border-line bg-surface text-brand-strong shadow-sm">
                      <span className="absolute right-0 top-0 h-4 w-4 rounded-bl-lg border-b border-l border-line bg-panel" />
                      <FileText className="h-8 w-8" />
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-extrabold tracking-wide ${kind?.tone ?? "bg-brand-soft text-brand-strong"}`}>
                      {kind?.label ?? "NO FILE"}
                    </span>
                  </span>
                </span>
              )}
              {storagePath ? (
                <span className="absolute right-3 top-3 rounded-full bg-surface/90 px-2.5 py-1 text-xs font-semibold text-ink shadow-sm ring-1 ring-line backdrop-blur">
                  {openingPath === storagePath ? "Opening" : "Open"}
                </span>
              ) : null}
            </button>

            <div className="grid min-w-0 gap-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-display text-lg font-extrabold text-ink">
                    {String(item[titleColumn.key] ?? "Untitled")}
                  </h3>
                  <p className="mt-1 truncate text-sm text-muted">
                    {String(item.type ?? item.ownerName ?? "Document")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button variant="secondary" size="icon" className="h-9 w-9" onClick={() => onEdit(item)} title="Edit">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => onDelete(item.id)} title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => onDuplicate(item.id)} title="Duplicate">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <dl className="grid gap-2 text-sm">
                {detailColumns.slice(0, 5).map((column) => (
                  <div key={column.key} className="flex items-center justify-between gap-3">
                    <dt className="text-muted">{column.label}</dt>
                    <dd className="min-w-0 truncate text-right font-medium text-ink/85">
                      {column.relation
                        ? relationLabel(column.relation, item[column.key], relationOptions)
                        : column.format
                          ? column.format(item[column.key], item)
                          : String(item[column.key] ?? "—")}
                    </dd>
                  </div>
                ))}
              </dl>

              {storagePath ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="secondary" size="sm" className="min-w-0 px-2" onClick={() => onOpenFile(storagePath)}>
                    <ExternalLink className="h-4 w-4" />
                    <span className="truncate">{openingPath === storagePath ? "Opening" : "Open"}</span>
                  </Button>
                  <Button type="button" variant="secondary" size="sm" className="min-w-0 px-2" onClick={() => onDownloadFile(storagePath)}>
                    <Download className="h-4 w-4" />
                    <span className="truncate">Download</span>
                  </Button>
                </div>
              ) : (
                <Badge tone="neutral" className="w-fit">No file attached</Badge>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function TaskMobileCard({
  item,
  columns,
  relationOptions,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleSelect,
  selectedIds
}: {
  item: Record<string, unknown>;
  columns: Column[];
  relationOptions: Record<string, Record<string, string>>;
  onEdit: (item: Record<string, unknown>) => void;
  onDelete: (id: unknown) => void;
  onDuplicate: (id: unknown) => void;
  onToggleSelect: (id: string) => void;
  selectedIds: string[];
}) {
  const titleColumn = columns[0];
  const relationByKey = Object.fromEntries(columns.filter((column) => column.relation).map((column) => [column.key, column.relation]));
  const status = String(item.status ?? "");
  const dueDate = String(item.dueDate ?? "");
  const category = String(item.category ?? "");
  const assignedRelation = relationByKey.familyMemberId;
  const documentRelation = relationByKey.linkedDocumentId;
  const assigned = assignedRelation ? relationLabel(assignedRelation, item.familyMemberId, relationOptions) : "";
  const document = documentRelation ? relationLabel(documentRelation, item.linkedDocumentId, relationOptions) : "";
  const notes = String(item.notes ?? "").trim();

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-ink/70">
            <input type="checkbox" checked={selectedIds.includes(String(item.id))} onChange={() => onToggleSelect(String(item.id))} />
            Select
          </label>
          <h2 className="font-display text-lg font-extrabold leading-tight text-ink">
            {String(item[titleColumn.key] ?? "Untitled task")}
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {status ? <Badge tone={statusTone(status)}>{status}</Badge> : null}
            {dueDate ? <Badge tone="warning">Due {dueDate}</Badge> : null}
            {category ? <Badge tone="neutral">{category}</Badge> : null}
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Button variant="secondary" size="icon" className="h-9 w-9" onClick={() => onEdit(item)} title="Edit">
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => onDelete(item.id)} title="Delete">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => onDuplicate(item.id)} title="Duplicate">
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-sm">
        {assigned && assigned !== "—" ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-panel/45 px-3 py-2">
            <span className="text-muted">Assigned</span>
            <span className="min-w-0 truncate text-right font-semibold text-ink/85">{assigned}</span>
          </div>
        ) : null}
        {document && document !== "—" ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-panel/45 px-3 py-2">
            <span className="text-muted">Document</span>
            <span className="min-w-0 truncate text-right font-semibold text-ink/85">{document}</span>
          </div>
        ) : null}
        {notes ? (
          <p className="max-h-16 overflow-hidden rounded-xl bg-panel/45 px-3 py-2 leading-relaxed text-ink/75">
            {notes}
          </p>
        ) : null}
      </div>
    </Card>
  );
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
  prepareSubmit,
  visualMode,
  preferredListView,
  mobileCardVariant,
  quickFilters = []
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
  const [downloadingPath, setDownloadingPath] = useState("");
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [listView, setListView] = useState<"grid" | "table">(preferredListView ?? "table");
  const [activeFilter, setActiveFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [draggingId, setDraggingId] = useState<string>();
  const form = useForm<Record<string, unknown>>({
    resolver: zodResolver(schema),
    defaultValues: defaults
  });
  const relationKey = useMemo(() => {
    const configs = [
      ...fields.map((field) => field.relation),
      ...columns.map((column) => column.relation),
      ...quickFilters.map((filter) => filter.relation)
    ].filter(Boolean) as RelationConfig[];
    return JSON.stringify(configs.map((config) => `${config.endpoint}:${config.labelKey}:${config.emptyLabel ?? ""}:${config.includeSelf ? "self" : ""}`).sort());
  }, [columns, fields, quickFilters]);

  const filtered = useMemo(() => {
    const needle = query.toLowerCase();
    const selected = quickFilters.find((filter) => filter.label === activeFilter);
    return sortItemsByPosition(
      items.filter((item) => {
        const matchesSearch = JSON.stringify(item).toLowerCase().includes(needle);
        const matchesFilter = selected ? filterMatches(selected, item) : true;
        return matchesSearch && matchesFilter;
      }) as Array<Record<string, unknown> & { id: string }>
    ) as Record<string, unknown>[];
  }, [activeFilter, items, query, quickFilters]);

  const filterCounts = useMemo(
    () => Object.fromEntries(quickFilters.map((filter) => [filter.label, items.filter((item) => filterMatches(filter, item)).length])),
    [items, quickFilters]
  );

  const previewPathKey = useMemo(() => {
    const paths = filtered
      .map((item) => (item as Record<string, unknown>).storagePath)
      .filter((value): value is string => typeof value === "string" && isPreviewableImage(value))
      .sort();
    return JSON.stringify(paths);
  }, [filtered]);

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
    const configs = [
      ...fields.map((field) => field.relation),
      ...columns.map((column) => column.relation),
      ...quickFilters.map((filter) => filter.relation)
    ].filter(Boolean) as RelationConfig[];
    const unique = Array.from(new Map(configs.map((config) => [config.endpoint, config])).values());
    if (unique.length === 0) return;

    let alive = true;
    async function loadRelations() {
      const loaded = await Promise.all(
        unique.map(async (config) => {
          const response = await apiFetch<ApiList>(config.endpoint);
          const labels = {
            ...(config.includeSelf ? { [SELF_FAMILY_MEMBER_ID]: SELF_FAMILY_MEMBER_LABEL } : {}),
            ...Object.fromEntries(
              response.data
                .filter((item) => typeof item.id === "string")
                .map((item) => [String(item.id), String(item[config.labelKey] ?? item.id)])
            )
          };
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
  }, [columns, fields, quickFilters, relationKey]);

  useEffect(() => {
    const paths = JSON.parse(previewPathKey) as string[];
    const missing = paths.filter((path) => !previewUrls[path]);
    if (missing.length === 0) return;

    let alive = true;
    async function loadPreviews() {
      const loaded = await Promise.all(
        missing.map(async (storagePath) => {
          const response = await apiFetch<SignedReadResponse>("/api/storage/read-url", {
            method: "POST",
            body: JSON.stringify({ storagePath })
          });
          return [storagePath, response.data.url] as const;
        })
      );
      if (alive) {
        setPreviewUrls((current) => ({ ...current, ...Object.fromEntries(loaded) }));
      }
    }

    loadPreviews().catch(() => {
      if (alive) setPreviewUrls((current) => ({ ...current }));
    });

    return () => {
      alive = false;
    };
  }, [previewPathKey, previewUrls]);

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
      setSelectedIds((current) => current.filter((itemId) => itemId !== id));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not delete item.");
    }
  }

  async function duplicate(id: unknown) {
    if (typeof id !== "string") return;
    const source = items.find((item) => item.id === id);
    if (!source) return;
    setError("");
    try {
      const duplicatePayload = { ...source, id: undefined, createdAt: undefined, updatedAt: undefined, title: `${String(source.title ?? source.name ?? "Copy") } (copy)` };
      const response = await apiFetch<ApiItem>(endpoint, {
        method: "POST",
        body: JSON.stringify(duplicatePayload)
      });
      setItems((current) => [...current, response.data]);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not duplicate item.");
    }
  }

  async function bulkDelete() {
    if (selectedIds.length === 0) return;
    setError("");
    try {
      await Promise.all(selectedIds.map((id) => apiFetch(`${endpoint}?id=${encodeURIComponent(id)}`, { method: "DELETE" })));
      setItems((current) => current.filter((item) => !selectedIds.includes(String(item.id))));
      setSelectedIds([]);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not delete selected items.");
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]));
  }

  function handleDragStart(id: string) {
    setDraggingId(id);
  }

  function handleDragOver(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
  }

  function handleDrop(targetId: string) {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(undefined);
      return;
    }
    const nextItems = reorderItems(items as Array<Record<string, unknown> & { id: string }>, draggingId, targetId);
    setItems(nextItems as Record<string, unknown>[]);
    setDraggingId(undefined);
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

  async function downloadStoredFile(storagePath: unknown) {
    if (!storagePath || typeof storagePath !== "string") return;
    setError("");
    setDownloadingPath(storagePath);
    try {
      const response = await apiFetch<SignedReadResponse>("/api/storage/download-url", {
        method: "POST",
        body: JSON.stringify({ storagePath })
      });
      const link = document.createElement("a");
      link.href = response.data.url;
      link.rel = "noopener noreferrer";
      link.download = storagePath.split("/").pop() || "duewise-file";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not download file.");
    } finally {
      setDownloadingPath("");
    }
  }

  const singular = title.toLowerCase().replace(/s$/, "");

  return (
    <div className="mx-auto grid w-full min-w-0 max-w-7xl gap-6 overflow-hidden">
      <header className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>
        </div>
        <div className="grid min-w-0 grid-cols-[1fr_auto] gap-2 sm:flex sm:items-center">
          <div className="relative min-w-0 sm:w-72">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              className="pl-10"
              placeholder={`Search ${title.toLowerCase()}`}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          {preferredListView ? (
            <div className="hidden rounded-xl border border-line bg-surface p-1 sm:flex">
              <button
                type="button"
                className={`grid h-9 w-9 place-items-center rounded-lg transition-colors ${listView === "grid" ? "bg-brand-soft text-brand-strong" : "text-muted hover:bg-panel"}`}
                onClick={() => setListView("grid")}
                title="Grid view"
              >
                <Grid2X2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                className={`grid h-9 w-9 place-items-center rounded-lg transition-colors ${listView === "table" ? "bg-brand-soft text-brand-strong" : "text-muted hover:bg-panel"}`}
                onClick={() => setListView("table")}
                title="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          ) : null}
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
          <div className="grid min-w-0 grid-cols-2 gap-3 xl:grid-cols-4">
            {templates.map((template) => (
              <button
                key={template.title}
                type="button"
                onClick={() => applyTemplate(template)}
                className="rounded-2xl border border-line bg-panel/35 p-3 text-left transition-colors hover:border-brand/30 hover:bg-brand-soft/35 sm:p-4"
              >
                <span className="block text-sm font-semibold text-ink sm:text-base">{template.title}</span>
                <span className="mt-1 block text-xs leading-relaxed text-muted sm:text-sm">{template.description}</span>
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
          <form className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3" onSubmit={form.handleSubmit(submit)}>
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
                      <div className="grid gap-2 sm:flex sm:flex-wrap">
                        <label
                          htmlFor={`${title}-${field.name}-input`}
                          className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-ink transition-colors hover:bg-panel sm:w-auto"
                        >
                          <UploadCloud className="h-4 w-4" />
                          {form.watch(field.upload.storagePathField) ? "Replace file" : "Choose file"}
                        </label>
                        {form.watch(field.upload.storagePathField) ? (
                          <>
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
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="w-full sm:w-auto"
                              disabled={downloadingPath === form.watch(field.upload.storagePathField)}
                              onClick={() => downloadStoredFile(form.watch(field.upload!.storagePathField))}
                            >
                              <Download className="h-4 w-4" />
                              Download
                            </Button>
                          </>
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

      {!formOpen && quickFilters.length > 0 && (
        <Card className="p-3 sm:p-4">
          <div className="flex max-w-full flex-wrap gap-2">
            <button
              type="button"
              className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition-colors ${
                !activeFilter ? "border-brand/25 bg-brand-soft text-brand-strong" : "border-line bg-surface text-muted hover:bg-panel"
              }`}
              onClick={() => setActiveFilter("")}
            >
              All
              <span className="rounded-full bg-surface/80 px-1.5 text-xs text-ink/70">{items.length}</span>
            </button>
            {quickFilters.map((filter) => (
              <button
                key={filter.label}
                type="button"
                className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition-colors ${
                  activeFilter === filter.label
                    ? "border-brand/25 bg-brand-soft text-brand-strong"
                    : "border-line bg-surface text-muted hover:bg-panel"
                }`}
                onClick={() => setActiveFilter((current) => (current === filter.label ? "" : filter.label))}
              >
                {filter.label}
                <span className="rounded-full bg-surface/80 px-1.5 text-xs text-ink/70">{filterCounts[filter.label] ?? 0}</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {!formOpen && selectedIds.length > 0 && (
        <Card className="flex flex-wrap items-center gap-3 p-3 sm:p-4">
          <span className="text-sm font-semibold text-ink">{selectedIds.length} selected</span>
          <Button type="button" variant="secondary" size="sm" onClick={bulkDelete}>Delete selected</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedIds([])}>Clear</Button>
        </Card>
      )}

      {visualMode === "familyTree" && !loading && (
        <FamilyTreePreview items={filtered} onEdit={startEdit} />
      )}

      {preferredListView && !loading && filtered.length > 0 ? (
        <div className="flex min-w-0 rounded-xl border border-line bg-surface p-1 sm:hidden">
          <button
            type="button"
            className={`flex h-9 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors ${listView === "grid" ? "bg-brand-soft text-brand-strong" : "text-muted"}`}
            onClick={() => setListView("grid")}
          >
            <Grid2X2 className="h-4 w-4" />
            Grid
          </button>
          <button
            type="button"
            className={`flex h-9 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors ${listView === "table" ? "bg-brand-soft text-brand-strong" : "text-muted"}`}
            onClick={() => setListView("table")}
          >
            <List className="h-4 w-4" />
            List
          </button>
        </div>
      ) : null}

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
          <h2 className="mt-4 font-display text-lg font-bold text-ink">{query || activeFilter ? "No matches" : emptyTitle}</h2>
          <p className="mt-1 max-w-md text-sm text-muted">{query || activeFilter ? "Try a different search term or clear the active filter." : emptyBody}</p>
        </Card>
      ) : (
        <>
          {preferredListView && listView === "grid" ? (
            <ResourceGridCards
              items={filtered}
              columns={columns}
              relationOptions={relationOptions}
              previewUrls={previewUrls}
              openingPath={openingPath}
              onEdit={startEdit}
              onDelete={remove}
              onDuplicate={duplicate}
              onToggleSelect={(id) => setSelectedIds((current) => current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id])}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              selectedIds={selectedIds}
              draggingId={draggingId}
              onOpenFile={openStoredFile}
              onDownloadFile={downloadStoredFile}
            />
          ) : null}

          {/* Mobile cards */}
          <div className={`grid min-w-0 gap-3 md:hidden ${preferredListView && listView === "grid" ? "hidden" : ""}`}>
            {filtered.map((item) => (
              mobileCardVariant === "tasks" ? (
                <TaskMobileCard
                  key={String(item.id)}
                  item={item}
                  columns={columns}
                  relationOptions={relationOptions}
                  onEdit={startEdit}
                  onDelete={remove}
                  onDuplicate={duplicate}
                  onToggleSelect={(id) => setSelectedIds((current) => current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id])}
                  selectedIds={selectedIds}
                />
              ) : (
                <Card key={String(item.id)} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-ink/70">
                        <input type="checkbox" checked={selectedIds.includes(String(item.id))} onChange={() => setSelectedIds((current) => current.includes(String(item.id)) ? current.filter((itemId) => itemId !== String(item.id)) : [...current, String(item.id)])} />
                        Select
                      </label>
                      <p className="truncate font-semibold text-ink">{String(item[columns[0].key] ?? "—")}</p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <Button variant="secondary" size="icon" className="h-9 w-9" onClick={() => startEdit(item)} title="Edit">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => remove(item.id)} title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => duplicate(item.id)} title="Duplicate">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <dl className="mt-3 grid gap-1.5 text-sm">
                    {columns.slice(1).map((column) => (
                      <div key={column.key} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
                        <dt className="shrink-0 text-muted">{column.label}</dt>
                        <dd className="min-w-0 overflow-hidden break-words text-right font-medium text-ink/85">
                          {renderCell(column, item, relationOptions, openStoredFile, downloadStoredFile, openingPath, downloadingPath, previewUrls)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </Card>
              )
            ))}
          </div>

          {/* Desktop table */}
          <Card className={`${preferredListView && listView === "grid" ? "hidden" : "hidden md:block"} overflow-hidden p-0`}>
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
                          {renderCell(column, item, relationOptions, openStoredFile, downloadStoredFile, openingPath, downloadingPath, previewUrls)}
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
                          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => duplicate(item.id)} title="Duplicate">
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setSelectedIds((current) => current.includes(String(item.id)) ? current.filter((itemId) => itemId !== String(item.id)) : [...current, String(item.id)] )} title="Select">
                            <input type="checkbox" checked={selectedIds.includes(String(item.id))} readOnly className="pointer-events-none h-4 w-4" />
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
