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

export const conditionLabels: Record<string, string> = {
  "like-new": "Like new",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
}
