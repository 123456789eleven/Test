// One shape for both of the old page's near-identical note boxes:
//   - a single note with no heading (old ".integration-box")
//   - a heading plus one or more notes (old ".crosscutting-box")
// The CSS ports ".integration-box"/".crosscutting-box" as aliases of
// ".callout-box", so callers pass whichever of those two as `className`
// (purely for any box-specific styling the CSS wants to hang off it) and
// this component always carries the shared ".callout-box" base class.
export default function Callout({ heading, className, children }) {
  const classes = ["callout-box", className].filter(Boolean).join(" ");
  return (
    <div className={classes}>
      {heading && <h4>{heading}</h4>}
      {children}
    </div>
  );
}
