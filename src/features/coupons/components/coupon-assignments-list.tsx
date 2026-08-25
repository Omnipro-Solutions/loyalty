import { AvatarInitials } from "@/components/layout/avatar-initials"
import { formatEventDate } from "@/lib/format"

import {
  COUPON_ASSIGNMENT_ROLE_LABEL,
  COUPON_ASSIGNMENT_SOURCE_LABEL,
} from "../lib/labels"
import type { CouponAssignmentWithMember } from "../lib/queries"

type CouponAssignmentsListProps = { assignments: CouponAssignmentWithMember[] }

/** Figma 13.4 "Personas asociadas": titular actual, titulares previos y emisor. */
export function CouponAssignmentsList({
  assignments,
}: CouponAssignmentsListProps) {
  if (assignments.length === 0) {
    return (
      <p className="px-1 py-6 text-center text-sm text-muted-foreground">
        Este cupón no tiene personas asociadas todavía.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2.5">
      {assignments.map((assignment) => (
        <div
          key={assignment.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-3"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <AvatarInitials
              name={assignment.member?.nombre ?? "Al portador"}
              size={32}
            />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-foreground">
                {assignment.member?.nombre ?? "Al portador"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {assignment.member?.email ?? "sin titular asignado"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-0.5">
            <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
              {
                COUPON_ASSIGNMENT_ROLE_LABEL[
                  assignment.role as keyof typeof COUPON_ASSIGNMENT_ROLE_LABEL
                ]
              }
            </span>
            <p className="text-[11px] text-muted-foreground">
              {
                COUPON_ASSIGNMENT_SOURCE_LABEL[
                  assignment.source as keyof typeof COUPON_ASSIGNMENT_SOURCE_LABEL
                ]
              }{" "}
              · {formatEventDate(assignment.assigned_at)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
