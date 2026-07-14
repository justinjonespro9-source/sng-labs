import Image from "next/image";
import { siteAssets } from "@/lib/site";

type LogoMarkProps = {
  className?: string;
  /**
   * Display size preset.
   * - header: 44px mobile → 56px desktop
   * - footer: 48px mobile → 52px desktop
   */
  variant?: "header" | "footer";
  priority?: boolean;
};

const sizeClasses = {
  header: "h-11 w-11 md:h-14 md:w-14",
  footer: "h-12 w-12 md:h-[3.25rem] md:w-[3.25rem]",
} as const;

const sizeAttr = {
  header: "(max-width: 767px) 44px, 56px",
  footer: "(max-width: 767px) 48px, 52px",
} as const;

export function LogoMark({
  className = "",
  variant = "header",
  priority = false,
}: LogoMarkProps) {
  return (
    <span className={`inline-flex shrink-0 items-center ${className}`}>
      <Image
        src={siteAssets.logo}
        alt=""
        width={1024}
        height={1024}
        priority={priority}
        sizes={sizeAttr[variant]}
        className={`object-contain ${sizeClasses[variant]}`}
      />
    </span>
  );
}
