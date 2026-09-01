import { Chip } from "@/components/ui";
import { reviewStatusLabel } from "@/lib/reviews";

type Props = {
  status: string;
};

const TONES: Record<string, "success" | "warning" | "danger" | "info" | "default"> = {
  pending: "warning",
  in_review: "info",
  approved: "success",
  changes_requested: "danger",
  rejected: "default",
};

export default function ReviewStatusBadge({ status }: Props) {
  return (
    <Chip className="font-medium" tone={TONES[status] ?? "default"}>
      {reviewStatusLabel(status)}
    </Chip>
  );
}
