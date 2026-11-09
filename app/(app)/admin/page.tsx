import { AdminPanel } from "@/features/admin/components/admin-panel"

export default function Page() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-balance">
        Admin
      </h1>
      <p className="mt-1 text-pretty text-muted-foreground">
        Manage the LendLoop library.
      </p>
      <div className="mt-8">
        <AdminPanel />
      </div>
    </>
  )
}
