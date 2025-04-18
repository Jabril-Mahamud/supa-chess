// app/protected/page.tsx
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileStats from "@/components/profile/ProfileStats";
import RecentGames from "@/components/profile/RecentGames";
import { Profile } from "@/lib/types/Profile";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

export default async function ProtectedPage() {
  const supabase = await createClient();

  // Get the current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Fetch profile data
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("Error fetching profile:", profileError);
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-destructive/10 text-destructive p-4 rounded-md">
          Error loading profile. Please try again later.
        </div>
        <pre className="text-xs font-mono p-3 mt-4 rounded border max-h-32 overflow-auto">
          {JSON.stringify(user, null, 2)}
        </pre>
      </div>
    );
  }

  // Fetch recent games
  const { data: recentGames, error: gamesError } = await supabase
    .from("games")
    .select("*")
    .or(`white_player.eq.${user.id},black_player.eq.${user.id}`)
    .order("updated_at", { ascending: false })
    .limit(10);

  if (gamesError) {
    console.error("Error fetching recent games:", gamesError);
  }

  // Process games to determine if user won/lost/drew
  const processedGames = recentGames?.map(game => {
    const isWhitePlayer = game.white_player === user.id;
    const result = game.status === 'draw' 
      ? 'draw' 
      : (game.winner === user.id ? 'win' : (game.status === 'completed' || game.status === 'resigned' ? 'loss' : null));

    return {
      ...game,
      result,
      player_color: isWhitePlayer ? 'white' : 'black'
    };
  }) || [];

  return (
    <div className="flex-1 w-full flex flex-col gap-8">
      <div className="w-full">
        <Alert className="bg-accent text-sm rounded-md text-foreground">
          <InfoIcon size="16" strokeWidth={2} className="mr-2 mt-0.5" />
          <AlertDescription>
            This is your profile page where you can view your statistics and game history.
          </AlertDescription>
        </Alert>
      </div>

      <ProfileHeader profile={profile as Profile} />

      <Tabs defaultValue="stats" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="recent">Recent Games</TabsTrigger>
          <TabsTrigger value="account">Account Details</TabsTrigger>
        </TabsList>
        
        <TabsContent value="stats" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <ProfileStats profile={profile as Profile} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="recent" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <RecentGames games={processedGames} userId={user.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <h2 className="font-bold text-2xl mb-4">Your Account Details</h2>
              
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
                  <p className="font-medium">{user.email}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Account Created</h3>
                  <p className="font-medium">{new Date(user.created_at).toLocaleDateString()}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Last Sign In</h3>
                  <p className="font-medium">{new Date(user.last_sign_in_at || user.created_at).toLocaleDateString()}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Email Verified</h3>
                  <p className="font-medium">{user.email_confirmed_at ? 'Yes' : 'No'}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Authentication Method</h3>
                  <p className="font-medium">{user.app_metadata?.provider || 'Email'}</p>
                </div>
              </div>
              
              <details className="mt-6">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                  Advanced Account Information
                </summary>
                <pre className="text-xs font-mono p-3 mt-2 rounded border max-h-64 overflow-auto">
                  {JSON.stringify(user, null, 2)}
                </pre>
              </details>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}