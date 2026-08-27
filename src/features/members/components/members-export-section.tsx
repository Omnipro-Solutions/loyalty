import { ExportMembersButton } from "./export-members-button"
import type { Member } from "../lib/queries"

type MembersExportSectionProps = {
  membersPromise: Promise<{ members: Member[]; total: number }>
}

/** Comparte la promesa con `MembersTableSection`: una sola consulta a `listMembers`. Sin key — solo espera, no necesita remontarse. */
export async function MembersExportSection({
  membersPromise,
}: MembersExportSectionProps) {
  const { members } = await membersPromise
  return <ExportMembersButton members={members} />
}
