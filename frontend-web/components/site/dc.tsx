"use client";
// Tiny runtime for the client's DCLogic templates: a class component whose render() feeds
// renderVals() into the generated template (tpl). Hv = element with style-hover support.
import React from "react";
import "./dc.css";

export class DCLogic<P = any, S = any> extends React.Component<P, S> {
  renderVals(): any { return {}; }
  tpl(_v: any, _props: any): React.ReactNode { return null; }
  render() { return this.tpl(this.renderVals(), this.props); }
}

export function Hv({ as, hover, focus, style, onMouseEnter, onMouseLeave, onFocus, onBlur, ...rest }: any) {
  const [h, setH] = React.useState(false);
  const [f, setF] = React.useState(false);
  const Tag = as || "div";
  const st = { ...style, ...(h && hover ? hover : null), ...(f && focus ? focus : null) };
  return <Tag {...rest} style={st} onMouseEnter={(e: any) => { setH(true); onMouseEnter?.(e); }} onMouseLeave={(e: any) => { setH(false); onMouseLeave?.(e); }} onFocus={(e: any) => { setF(true); onFocus?.(e); }} onBlur={(e: any) => { setF(false); onBlur?.(e); }} />;
}

export function Site({ children }: { children: React.ReactNode }) {
  return <div className="dc">{children}</div>;
}
