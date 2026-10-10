import { findAll } from "@/server/repositories/departments/findAll";

export async function listDepartments() {
  const departments = await findAll();
  return { departments };
}
