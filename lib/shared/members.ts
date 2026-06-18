import type { Member, MemberStatus } from "@/lib/types/domain";

export function getExitMonth(member: Pick<Member, "exitDate">) {
  return member.exitDate ? member.exitDate.slice(0, 7) : null;
}

export function isMemberActive(member: Pick<Member, "exitDate">) {
  return !member.exitDate;
}

export function isMemberActiveForMonth(member: Pick<Member, "exitDate">, month: string) {
  const exitMonth = getExitMonth(member);
  return !exitMonth || month <= exitMonth;
}

export function getMemberKasStatusForMonth(
  member: Pick<Member, "status" | "exitDate" | "exitKasStatus">,
  month: string,
): MemberStatus {
  const exitMonth = getExitMonth(member);

  if (exitMonth && month === exitMonth) {
    return member.exitKasStatus ?? member.status;
  }

  return member.status;
}
