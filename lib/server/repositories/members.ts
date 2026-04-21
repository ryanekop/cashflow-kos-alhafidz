import "server-only";

import { readDataFile, writeDataFile } from "@/lib/server/json-store";
import type { Member, MemberStatus } from "@/lib/types/domain";

const FILENAME = "members.json";

export function listMembers() {
  return readDataFile<Member[]>(FILENAME, []);
}

export function createMember(input: { name: string; status?: MemberStatus }) {
  const members = listMembers();
  const member: Member = {
    id: Date.now(),
    name: input.name,
    status: input.status ?? "full",
  };

  members.push(member);
  writeDataFile(FILENAME, members);
  return member;
}

export function updateMember(input: Partial<Member> & Pick<Member, "id">) {
  const members = listMembers().map((member) =>
    member.id === input.id ? { ...member, ...input } : member,
  );

  writeDataFile(FILENAME, members);
  return { success: true };
}

export function deleteMember(id: number) {
  const members = listMembers().filter((member) => member.id !== id);
  writeDataFile(FILENAME, members);
  return { success: true };
}
