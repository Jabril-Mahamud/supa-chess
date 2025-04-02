import { signInAction, discordSignInAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default async function Login(props: { searchParams: Promise<Message> }) {
  const searchParams = await props.searchParams;
  return (
    <div className="flex flex-col gap-4">
      <form className="flex-1 flex flex-col min-w-64">
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

      {/* Discord OAuth Button */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center w-full">
          <hr className="flex-grow border-t" />
          <span className="px-4 text-sm text-muted-foreground">Or</span>
          <hr className="flex-grow border-t" />
        </div>
        <form action={discordSignInAction}>
          <button 
            type="submit" 
            className="flex items-center justify-center gap-2 w-full 
              bg-[#5865F2] text-white px-4 py-2 rounded-md 
              hover:bg-[#4752C4] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5116.0741.0741 0 00-.0787.0371c-.211.3765-.4447.8666-.6083 1.2573-1.8423-.2762-3.68-.2762-5.4936 0-.1636-.3999-.4063-.8809-.6175-1.2573a.077.077 0 00-.0788-.037 19.7645 19.7645 0 00-4.8851 1.5116.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9868 3.0294a.0785.0785 0 00.0851-.0279c.4609-.6304.8731-1.2952 1.2348-1.9921a.076.076 0 00-.0416-.1061 13.0394 13.0394 0 01-1.8637-.8899.077.077 0 01-.0076-.1276c.1254-.0094.2508-.0242.3746-.0242a.0761.0761 0 01.0762.0622c.1258.8699.6328 1.6835 1.4306 2.2287a.076.076 0 00.0786.0096c1.4742-.7156 2.9483-1.4311 4.4148-2.1467a.076.076 0 00.0395-.0539c.3803-4.0283-.6345-7.5183-2.6848-10.6218a.061.061 0 00-.0323-.0276zM8.02 15.3312c-.8899 0-1.6237-.8152-1.6237-1.8188 0-1.0035.7238-1.8187 1.6237-1.8187.911 0 1.6436.8152 1.6237 1.8187 0 1.0036-.7127 1.8188-1.6237 1.8188zm7.9677 0c-.8898 0-1.6236-.8152-1.6236-1.8188 0-1.0035.7237-1.8187 1.6236-1.8187.911 0 1.6437.8152 1.6236 1.8187 0 1.0036-.7125 1.8188-1.6236 1.8188z"/>
            </svg>
            Continue with Discord
          </button>
        </form>
      </div>
    </div>
  );
}