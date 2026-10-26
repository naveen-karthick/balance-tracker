import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canAccessInventory } from "@/lib/inventoryAccess";
import { InventoryBoard } from "@/components/InventoryBoard";

export default async function InventoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!canAccessInventory(session.user.email)) {
    return (
      <div className="max-w-lg px-4 pt-20 lg:pt-8">
        <div className="card p-5">
          <h1 className="text-xl font-bold text-black">Orders & Stock</h1>
          <p className="mt-2 text-sm text-gray-600">This page is only available for the inventory accounts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-16 lg:pt-0">
      <Suspense fallback={<p className="px-4 py-6 text-sm text-gray-600">Loading...</p>}>
        <InventoryBoard />
      </Suspense>
    </div>
  );
}
