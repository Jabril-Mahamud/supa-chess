// components/profile/AccountDetails.tsx
'use client';

import { User } from '@supabase/supabase-js';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface AccountDetailsProps {
  user: User;
}

export default function AccountDetails({ user }: AccountDetailsProps) {
  const [showAllDetails, setShowAllDetails] = useState(false);
  
  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };
  
  // Get authentication provider
  const getProvider = () => {
    if (!user.app_metadata.provider) return 'Unknown';
    
    const provider = user.app_metadata.provider;
    
    switch(provider) {
      case 'email':
        return 'Email/Password';
      case 'google':
        return 'Google';
      case 'discord':
        return 'Discord';
      default:
        return provider.charAt(0).toUpperCase() + provider.slice(1);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Account Information</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAllDetails(!showAllDetails)}
          className="gap-2"
        >
          {showAllDetails ? (
            <>
              <EyeOff size={16} /> Hide Details
            </>
          ) : (
            <>
              <Eye size={16} /> Show All Details
            </>
          )}
        </Button>
      </div>
      
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
              <p className="text-base">{user.email}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Authentication Method</h3>
              <p className="text-base">{getProvider()}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Account Created</h3>
              <p className="text-base">{formatDate(user.created_at)}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Last Sign In</h3>
              <p className="text-base">{formatDate(user.last_sign_in_at || user.created_at)}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Email Verified</h3>
              <p className="text-base">{user.email_confirmed_at ? 'Yes' : 'No'}</p>
            </div>
          </div>
          
          {/* Advanced details (hidden by default) */}
          {showAllDetails && (
            <Accordion type="single" collapsible className="mt-4">
              <AccordionItem value="advanced">
                <AccordionTrigger>Advanced Account Details</AccordionTrigger>
                <AccordionContent>
                  <pre className="text-xs font-mono p-3 rounded border max-h-64 overflow-auto">
                    {JSON.stringify(user, null, 2)}
                  </pre>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}