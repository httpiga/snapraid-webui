import * as React from "react";

/**
 * Returns a ref to attach to an anchor element for positioning the combobox content.
 * Use when you need to control the combobox anchor (e.g. for custom layout).
 */
export function useComboboxAnchor() {
  return React.useRef<HTMLDivElement | null>(null);
}
