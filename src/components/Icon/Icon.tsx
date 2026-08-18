type IconName =
  | "chevron-left"
  | "chevron-right"
  | "github"
  | "image"
  | "menu"
  | "pause"
  | "play"
  | "search"
  | "x";

type IconProps = {
  name: IconName;
  size?: "sm" | "md" | "lg";
  className?: string;
};

// Decorative by contract: every icon is paired with visible or
// visually-hidden text, so the svg itself stays hidden from AT.
export default function Icon({ name, size = "md", className }: IconProps) {
  const classes = ["tc-icon", size !== "md" && `tc-icon--${size}`, className]
    .filter(Boolean)
    .join(" ");
  return (
    <svg aria-hidden="true" className={classes} focusable="false">
      <use href={`#icon-${name}`} />
    </svg>
  );
}
