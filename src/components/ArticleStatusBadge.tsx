import { Chip } from "@/components/ui";

type Props = {
  status: string;
};

export default function ArticleStatusBadge({ status }: Props) {
  switch (status) {
    case "draft":
      return <Chip className="badge-sm" tone="warning">Draft</Chip>;
    case "review":
      return <Chip className="badge-sm" tone="info">Review</Chip>;
    case "published":
      return <Chip className="badge-sm" tone="success">Published</Chip>;
    default:
      return <Chip className="badge-sm">{status}</Chip>;
  }
}
