import { auth, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/Auth/SignInForm";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/");
  }

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="card bg-base-200 w-96 shadow-xl">
        <div className="card-body items-center text-center">
          <h1 className="card-title text-3xl font-bold text-base-content">
            Bastion
          </h1>
          <div className="card-actions mt-4 w-full flex-col gap-3">
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/" });
              }}
              className="w-full"
            >
              <button type="submit" className="btn btn-primary w-full">
                Sign in with Google
              </button>
            </form>
            <div className="divider">or</div>
            <SignInForm />
          </div>
        </div>
      </div>
    </div>
  );
}
