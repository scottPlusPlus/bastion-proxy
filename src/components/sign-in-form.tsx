"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  signInWithEmailPassword,
  type AuthFormState,
} from "@/lib/auth-actions";

export function SignInForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    signInWithEmailPassword,
    null
  );

  useEffect(() => {
    if (state && "success" in state) {
      router.push("/");
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} className="w-full space-y-3">
      {state?.error && (
        <div role="alert" className="alert alert-error alert-sm">
          <span>{state.error}</span>
        </div>
      )}
      <div className="form-control">
        <label className="label" htmlFor="signin-email">
          <span className="label-text">Email</span>
        </label>
        <input
          id="signin-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          className="input input-bordered w-full"
          required
        />
      </div>
      <div className="form-control">
        <label className="label" htmlFor="signin-password">
          <span className="label-text">Password</span>
        </label>
        <input
          id="signin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="input input-bordered w-full"
          required
        />
      </div>
      <button
        type="submit"
        className="btn btn-primary w-full"
        disabled={pending}
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-sm text-base-content/70">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="link link-primary">
          Sign up
        </Link>
      </p>
    </form>
  );
}
