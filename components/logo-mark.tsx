import Image from "next/image";
import { siteAssets } from "@/lib/site";

type LogoMarkProps = {
  className?: string;
  /** Display height in pixels. Width follows the square source. */
  height?: number;
  priority?: boolean;
};

export function LogoMark({
  className = "",
  height = 36,
  priority = false,
}: LogoMarkProps) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      <Image
        src={siteAssets.logo}
        alt=""
        width={1024}
        height={1024}
        priority={priority}
        sizes={`${height}px`}
        className="object-contain"
        style={{ height, width: height }}
      />
    </span>
  );
}
