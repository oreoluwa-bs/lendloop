import {
  CookingPot,
  Hammer,
  Plant,
  Tent,
  Wrench,
  type IconProps,
} from "@phosphor-icons/react"

export const categories = [
  "power-tools",
  "garden",
  "kitchen",
  "camping",
  "other",
] as const

export const categoryLabels: Record<string, string> = {
  "power-tools": "Power tools",
  garden: "Garden",
  kitchen: "Kitchen",
  camping: "Camping",
  other: "Other",
}

export const categoryIcons: Record<
  string,
  React.ComponentType<IconProps>
> = {
  "power-tools": Wrench,
  garden: Plant,
  kitchen: CookingPot,
  camping: Tent,
  other: Hammer,
}

export const categoryColors: Record<string, string> = {
  "power-tools": "bg-amber-500/12 text-amber-600 dark:text-amber-400",
  garden: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  kitchen: "bg-rose-500/12 text-rose-600 dark:text-rose-400",
  camping: "bg-sky-500/12 text-sky-600 dark:text-sky-400",
  other: "bg-zinc-500/12 text-zinc-600 dark:text-zinc-400",
}

export const conditionLabels: Record<string, string> = {
  "like-new": "Like new",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
}
