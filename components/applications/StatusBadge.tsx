import { statusLabel } from "@/lib/applications/config";

const STATUS_STYLES: Record<string, string> = {
  neu: "bg-purple-100 text-purple-700",
  kontaktiert: "bg-amber-100 text-amber-700",
  angenommen: "bg-green-100 text-green-700",
  abgelehnt: "bg-neutral-200 text-neutral-600",
};

const StatusBadge = ({ status }: { status: string }) => (
  <span
    className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? ""}`}
  >
    {statusLabel(status)}
  </span>
);

export default StatusBadge;
