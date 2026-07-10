export function buildNextStepDraft(source: Record<string, unknown>) {
  const sourceTitle = typeof source.title === "string" ? source.title.trim() : "";
  const sourceNotes = typeof source.notes === "string" ? source.notes.trim() : "";
  const title = sourceTitle ? `Follow up: ${sourceTitle}` : "Next step";
  const notes = sourceNotes ? `Follow-up for “${sourceTitle || "task"}”.\n\n${sourceNotes}` : `Follow-up for “${sourceTitle || "task"}”.`;

  return {
    title,
    notes,
    category: typeof source.category === "string" && source.category ? source.category : "Other",
    familyMemberId: typeof source.familyMemberId === "string" ? source.familyMemberId : "",
    linkedDocumentId: typeof source.linkedDocumentId === "string" ? source.linkedDocumentId : "",
    linkedInventoryItemId: typeof source.linkedInventoryItemId === "string" ? source.linkedInventoryItemId : ""
  };
}
