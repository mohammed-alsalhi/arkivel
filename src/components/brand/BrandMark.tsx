import Image from "next/image";
import { config } from "@/lib/config";

type BrandMarkProps = {
  className?: string;
  imageSize: number;
  logoMark?: string;
  priority?: boolean;
};

export default function BrandMark({
  className,
  imageSize,
  logoMark = config.logoMark,
  priority = false,
}: BrandMarkProps) {
  return (
    <span className={["wiki-brand-mark", className].filter(Boolean).join(" ")} aria-hidden="true">
      <Image
        src={logoMark}
        alt=""
        width={imageSize}
        height={imageSize}
        className="wiki-brand-mark-image"
        priority={priority}
      />
    </span>
  );
}
