import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/**
 * Reorder tiles by dragging: mouse, touch (press and hold briefly, so the
 * page still scrolls normally) and keyboard (space, arrow keys, space).
 */
export function SortableGrid({
  ids,
  onMove,
  className,
  label = "Foto",
  children,
}: {
  ids: string[];
  /** Called once on drop with the old and the new position. */
  onMove: (from: number, to: number) => void;
  className?: string;
  /** What a tile is, for screen reader announcements. */
  label?: string;
  children: ReactNode;
}) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const position = (id: UniqueIdentifier) => ids.indexOf(String(id)) + 1;
  const announcements: Announcements = {
    onDragStart: ({ active }) => `${label} ${position(active.id)} aufgenommen.`,
    onDragOver: ({ active, over }) =>
      over ? `${label} ${position(active.id)} über Position ${position(over.id)}.` : undefined,
    onDragEnd: ({ over }) => (over ? `Auf Position ${position(over.id)} abgelegt.` : "Abgelegt."),
    onDragCancel: () => "Verschieben abgebrochen.",
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from >= 0 && to >= 0) onMove(from, to);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            "Zum Verschieben Leertaste drücken, mit den Pfeiltasten bewegen, mit Leertaste ablegen oder mit Escape abbrechen.",
        },
      }}
    >
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <ul className={className}>{children}</ul>
      </SortableContext>
    </DndContext>
  );
}

/** Classes for the drag handle; iOS would otherwise show its image menu on a long press. */
export const dragHandleClass =
  "cursor-grab touch-manipulation select-none [-webkit-touch-callout:none] active:cursor-grabbing";

/**
 * One tile. `handle` goes on the element that starts a drag (e.g. the
 * image, together with `dragHandleClass`), so buttons and inputs in the tile
 * keep working normally.
 */
export function SortableTile({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: (drag: { handle: HTMLAttributes<HTMLElement>; dragging: boolean }) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    position: "relative",
  };
  return (
    <li ref={setNodeRef} style={style} className={className}>
      {children({
        handle: { ...attributes, ...listeners } as HTMLAttributes<HTMLElement>,
        dragging: isDragging,
      })}
    </li>
  );
}

/** New order after moving one item. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
