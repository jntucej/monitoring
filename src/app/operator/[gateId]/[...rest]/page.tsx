"use client";
// Redirect fallback
import { redirect } from "next/navigation";
export default function CatchAll() { redirect("/operator/gate-1"); }