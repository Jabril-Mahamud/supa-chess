import { signInAction, discordSignInAction, googleSignInAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default async function Login(props: { searchParams: Promise<Message> }) {
  const searchParams = await props.searchParams;
  return (
    <div className="flex flex-col gap-4 w-full items-center">
      <form className="flex-1 flex flex-col min-w-64 max-w-64 mx-auto">
        <h1 className="text-2xl font-medium">Sign in</h1>
        <p className="text-sm text-foreground">
          Don't have an account?{" "}
          <Link className="text-foreground font-medium underline" href="/sign-up">
            Sign up
          </Link>
        </p>
        <div className="flex flex-col gap-2 [&>input]:mb-3 mt-8">
          <Label htmlFor="email">Email</Label>
          <Input name="email" placeholder="you@example.com" required />
          <div className="flex justify-between items-center">
            <Label htmlFor="password">Password</Label>
            <Link
              className="text-xs text-foreground underline"
              href="/forgot-password"
            >
              Forgot Password?
            </Link>
          </div>
          <Input
            type="password"
            name="password"
            placeholder="Your password"
            required
          />
          <SubmitButton pendingText="Signing In..." formAction={signInAction}>
            Sign in
          </SubmitButton>
          <FormMessage message={searchParams} />
        </div>
      </form>

      {/* OAuth Providers */}
      <div className="flex flex-col items-center gap-2 max-w-64 w-full">
        <div className="flex items-center w-full">
          <hr className="flex-grow border-t" />
          <span className="px-4 text-sm text-muted-foreground">Or continue with</span>
          <hr className="flex-grow border-t" />
        </div>
        
        <div className="flex gap-2 w-full">
          {/* Discord OAuth Button */}
          <form action={discordSignInAction} className="flex-1">
            <button 
              type="submit" 
              className="flex items-center justify-center gap-2 w-full 
                bg-[#5865F2] text-white px-4 py-2 rounded-md 
                hover:bg-[#4752C4] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5116.0741.0741 0 00-.0787.0371c-.211.3765-.4447.8666-.6083 1.2573-1.8423-.2762-3.68-.2762-5.4936 0-.1636-.3999-.4063-.8809-.6175-1.2573a.077.077 0 00-.0788-.037 19.7645 19.7645 0 00-4.8851 1.5116.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9868 3.0294a.0785.0785 0 00.0851-.0279c.4609-.6304.8731-1.2952 1.2348-1.9921a.076.076 0 00-.0416-.1061 13.0394 13.0394 0 01-1.8637-.8899.077.077 0 01-.0076-.1276c.1254-.0094.2508-.0242.3746-.0242a.0761.0761 0 01.0762.0622c.1258.8699.6328 1.6835 1.4306 2.2287a.076.076 0 00.0786.0096c1.4742-.7156 2.9483-1.4311 4.4148-2.1467a.076.076 0 00.0395-.0539c.3803-4.0283-.6345-7.5183-2.6848-10.6218a.061.061 0 00-.0323-.0276zM8.02 15.3312c-.8899 0-1.6237-.8152-1.6237-1.8188 0-1.0035.7238-1.8187 1.6237-1.8187.911 0 1.6436.8152 1.6237 1.8187 0 1.0036-.7127 1.8188-1.6237 1.8188zm7.9677 0c-.8898 0-1.6236-.8152-1.6236-1.8188 0-1.0035.7237-1.8187 1.6236-1.8187.911 0 1.6437.8152 1.6236 1.8187 0 1.0036-.7125 1.8188-1.6236 1.8188z"/>
              </svg>
              Discord
            </button>
          </form>

          {/* Google OAuth Button */}
          <form action={googleSignInAction} className="flex-1">
            <button 
              type="submit" 
              className="flex items-center justify-center gap-2 w-full 
                bg-white text-black px-4 py-2 rounded-md 
                border border-gray-300 hover:bg-gray-100 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-1 7.28-2.69l-3.57-2.75c-.99.69-2.26 1.1-3.71 1.1-2.87 0-5.3-1.94-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.13c-.22-.69-.35-1.42-.35-2.13s.13-1.44.35-2.13V7.03H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.97l2.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.46 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.03l3.66 2.84c.86-2.59 3.29-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}