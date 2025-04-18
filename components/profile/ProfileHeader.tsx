// components/profile/ProfileHeader.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Profile } from "@/lib/types/Profile";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { UserCircle, Edit, Check, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProfileHeaderProps {
  profile: Profile | null | undefined;
}

export default function ProfileHeader({ profile }: ProfileHeaderProps) {
  // Default username from profile or email
  const defaultUsername = profile?.username || "Chess Player";
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(defaultUsername);
  const [displayedUsername, setDisplayedUsername] = useState(defaultUsername);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const supabase = createClient();
  const { toast } = useToast();
  
  // Reset states when dialog closes
  useEffect(() => {
    if (!isEditing) {
      setUsername(displayedUsername);
      setError(null);
      setSaveSuccess(false);
    }
  }, [isEditing, displayedUsername]);

  // Guard against missing profile
  if (!profile?.id) {
    return (
      <div className="flex items-center justify-between bg-accent/20 p-6 rounded-lg">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
            <UserCircle className="h-16 w-16 text-primary/50" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{defaultUsername}</h1>
            <p className="text-muted-foreground">
              Loading profile data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    if (!username.trim()) {
      setError("Username cannot be empty");
      return;
    }

    // Don't save if username hasn't changed
    if (username === displayedUsername) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          username,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);
      
      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          setError("This username is already taken");
          toast({
            variant: "destructive",
            title: "Username already taken",
            description: "Please choose a different username.",
          });
        } else {
          setError(error.message);
          toast({
            variant: "destructive",
            title: "Error updating username",
            description: error.message,
          });
        }
        setIsSaving(false);
        return;
      }
      
      // Update was successful
      setSaveSuccess(true);
      setDisplayedUsername(username);
      
      toast({
        description: "Your username has been successfully updated.",
      });
      
      // Close dialog after 1 second to show success state
      setTimeout(() => {
        setIsEditing(false);
      }, 1000);
      
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message || "An error occurred while saving your profile");
      toast({
        variant: "destructive",
        title: "Error updating username",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-between bg-accent/20 p-6 rounded-lg">
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
          {profile.avatar_url ? (
            <img 
              src={profile.avatar_url} 
              alt={displayedUsername} 
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <UserCircle className="h-16 w-16 text-primary/50" />
          )}
        </div>
        
        <div>
          <h1 className="text-2xl font-bold">{displayedUsername}</h1>
          <p className="text-muted-foreground">
            Member since {new Date(profile.created_at || new Date()).toLocaleDateString()}
          </p>
        </div>
      </div>
      
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Edit size={16} /> Edit Profile
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Make changes to your profile information.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">Username</label>
              <Input 
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                disabled={isSaving || saveSuccess}
                className={saveSuccess ? "border-green-500" : ""}
              />
              
              {/* Error message */}
              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertTriangle size={16} />
                  <p>{error}</p>
                </div>
              )}
              
              {/* Success message */}
              {saveSuccess && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle size={16} />
                  <p>Username updated successfully!</p>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsEditing(false);
                setUsername(displayedUsername);
                setError(null);
              }}
              disabled={isSaving || saveSuccess}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving || saveSuccess || username === displayedUsername || !username.trim()}
              className={`gap-2 ${saveSuccess ? 'bg-green-600 hover:bg-green-700' : ''}`}
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Saving...
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCircle size={16} /> Saved!
                </>
              ) : (
                <>
                  <Check size={16} /> Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}