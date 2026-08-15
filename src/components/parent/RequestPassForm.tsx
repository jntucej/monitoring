"use client";
import { Ticket } from "lucide-react";

export function RequestPassForm() {
  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
      <h3 className="font-semibold mb-4">Request a Pass</h3>
      <form className="space-y-4">
        <div>
          <label htmlFor="passType" className="block text-sm font-medium text-gray-300">
            Pass Type
          </label>
          <select
            id="passType"
            name="passType"
            className="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 py-2 pl-3 pr-10 text-base text-white focus:border-sky-500 focus:outline-none focus:ring-sky-500 sm:text-sm"
          >
            <option>Day Pass</option>
            <option>Weekend Pass</option>
            <option>Emergency Leave</option>
          </select>
        </div>
        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-gray-300">
            Reason
          </label>
          <textarea
            id="reason"
            name="reason"
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-white shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
          ></textarea>
        </div>
        <button
          type="submit"
          className="w-full inline-flex justify-center items-center rounded-lg border border-transparent bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
        >
          <Ticket className="mr-2 h-5 w-5" />
          Request Pass
        </button>
      </form>
    </div>
  );
}
