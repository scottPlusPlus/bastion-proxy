import { auth, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/Auth/SignUpForm";

export default async function SignUpPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/");
  }

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="card bg-base-200 w-96 shadow-xl">
        <div className="card-body items-center text-center">
          <h1 className="card-title text-2xl font-bold text-base-content">
            Create an account
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
                Sign up with Google
              </button>
            </form>
            <div className="divider">or</div>
            <SignUpForm />
          </div>
        </div>
      </div>
    </div>
  );
}
