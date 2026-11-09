import { TableCell, TableRow } from "@/components/ui/table"
import { cn } from "cn"

/**
 * Table rows that collapse into labelled cards below `md` (mobile) and
 * render as normal table rows above it. Column labels come from the
 * `label` prop via a ::before element that is hidden at md+.
 */
export function StackedRow({
  className,
  ...props
}: React.ComponentProps<typeof TableRow>) {
  return (
    <TableRow
      className={cn(
        "block border-b p-3 last:border-b-0 md:table-row md:border-b md:p-0",
        className
      )}
      {...props}
    />
  )
}

export function StackedCell({
  label,
  className,
  children,
  ...props
}: React.ComponentProps<typeof TableCell> & { label?: string }) {
  return (
    <TableCell
      data-label={label}
      className={cn(
        "flex items-center justify-between gap-4 py-1 md:table-cell",
        label &&
          "before:mr-auto before:text-xs before:text-muted-foreground before:content-[attr(data-label)] md:before:content-none",
        className
      )}
      {...props}
    >
      {children}
    </TableCell>
  )
}
