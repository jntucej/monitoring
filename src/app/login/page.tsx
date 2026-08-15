"use client";
import { Building2, KeyRound } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-gray-100/50 dark:bg-gray-900/50">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-800 dark:bg-gray-950">
        <div className="flex flex-col items-center">
          <div className="mb-4 inline-flex items-center justify-center rounded-2xl bg-gray-100 w-16 h-16 dark:bg-gray-900">
            <Building2 className="h-8 w-8 text-gray-500" />
          </div>
          <h1 className="mb-2 text-2xl font-bold tracking-tight">
            JNTUH UCoEJ Gate Monitor
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Select your role to sign in
          </p>
        </div>

        <div className="mt-6">
          <label
            htmlFor="role"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Select Role
          </label>
          <select
            id="role"
            name="role"
            className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
          >
            <option>Gate Operator</option>
            <option>Gate Supervisor</option>
            <option>Admin</option>
            <option>System Admin</option>
            <option>Parent</option>
            <option>Student</option>
          </select>
        </div>

        <div className="mt-6">
          <button
            type="button"
            className="w-full inline-flex justify-center items-center rounded-lg border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <KeyRound className="mr-2 h-5 w-5" />
            Sign in with PIN
          </button>
        </div>
      </div>
    </div>
  );
}
