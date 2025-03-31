import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "./dashboard-client";

export default async function Dashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-6 p-4 md:p-8">
      <h1 className="text-2xl font-bold">Chess Dashboard</h1>
      
      <div className="bg-accent text-sm p-3 px-5 rounded-md text-foreground flex gap-3 items-center">
        Welcome to your chess dashboard! Here you can create new games or join existing ones.
      </div>
      
      <DashboardClient user={user} />
    </div>
  );
}