export const statusLabels: Record<string, string> = {
  requested: "Requested",
  approved: "Approved",
  declined: "Declined",
  returned: "Returned",
}

const statusColors: Record<string, string> = {
  requested: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
  approved: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  declined: "bg-rose-500/12 text-rose-600 dark:text-rose-400",
  returned: "bg-zinc-500/12 text-zinc-600 dark:text-zinc-400",
}

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-xs ${
        statusColors[status] ?? statusColors.returned
      }`}
    >
      {statusLabels[status] ?? status}
    </span>
  )
}
