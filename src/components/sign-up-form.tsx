"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  registerWithEmailPassword,
  type AuthFormState,
} from "@/lib/auth-actions";

export function SignUpForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    registerWithEmailPassword,
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
        <label className="label" htmlFor="signup-email">
          <span className="label-text">Email</span>
        </label>
        <input
          id="signup-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          className="input input-bordered w-full"
          required
        />
      </div>
      <div className="form-control">
        <label className="label" htmlFor="signup-password">
          <span className="label-text">Password</span>
        </label>
        <input
          id="signup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          className="input input-bordered w-full"
          required
        />
      </div>
      <div className="form-control">
        <label className="label" htmlFor="signup-confirm-password">
          <span className="label-text">Confirm password</span>
        </label>
        <input
          id="signup-confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          className="input input-bordered w-full"
          required
        />
      </div>
      <button
        type="submit"
        className="btn btn-primary w-full"
        disabled={pending}
      >
        {pending ? "Creating account…" : "Create account"}
      </button>
      <p className="text-sm text-base-content/70">
        Already have an account?{" "}
        <Link href="/login" className="link link-primary">
          Sign in
        </Link>
      </p>
    </form>
  );
}
