export type OrderableItem = {
  id: string;
  position?: number;
};

export function sortItemsByPosition<T extends OrderableItem>(items: T[]) {
  return [...items].sort((left, right) => {
    const leftPosition = typeof left.position === "number" ? left.position : Number.MAX_SAFE_INTEGER;
    const rightPosition = typeof right.position === "number" ? right.position : Number.MAX_SAFE_INTEGER;
    if (leftPosition !== rightPosition) return leftPosition - rightPosition;
    return left.id.localeCompare(right.id);
  });
}

export function reorderItems<T extends OrderableItem>(items: T[], fromId: string, toId: string) {
  const nextItems = [...items];
  const fromIndex = nextItems.findIndex((item) => item.id === fromId);
  const toIndex = nextItems.findIndex((item) => item.id === toId);

  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
    return sortItemsByPosition(nextItems).map((item, index) => ({ ...item, position: index }));
  }

  const [movedItem] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, movedItem);

  return sortItemsByPosition(nextItems).map((item, index) => ({ ...item, position: index }));
}
