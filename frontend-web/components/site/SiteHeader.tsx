"use client";
// @ts-nocheck
// Generated from the client's "Site Header.dc.html" by gen_site.py — do not edit by hand.
import React, { Fragment } from "react";
import { DCLogic, Hv } from "./dc";

class Logic extends DCLogic {
  state = { w: typeof window !== 'undefined' ? window.innerWidth : 1200, open: false, scrolled: false };
  componentDidMount(){ this._r=()=>this.setState({w:window.innerWidth}); this._s=()=>{const se=document.scrollingElement||document.documentElement; let y=window.scrollY||se.scrollTop||0; if(!y){ const c=[...document.querySelectorAll('*')].find(e=>e.scrollTop>0&&e.scrollHeight>e.clientHeight+100); if(c) y=c.scrollTop; } const sc=y>24; if(sc!==this.state.scrolled) this.setState({scrolled:sc});}; window.addEventListener('resize',this._r); document.addEventListener('scroll',this._s,{passive:true,capture:true}); this._s(); }
  componentWillUnmount(){ window.removeEventListener('resize',this._r); document.removeEventListener('scroll',this._s,{capture:true}); }
  renderVals(){
    const active=this.props.active||'';
    const dark=!!this.props.dark; // header sits over a dark hero
    const sc=this.state.scrolled;
    const L=[['Home','/'],['For Contractors','/for-contractors'],['For Consumers','/for-consumers'],['Partner With Us','/partner'],['About','/about']];
    const fg=dark&&!sc?'#fff':'#181D27';
    const links=L.map(([label,href],k)=>{const a=label===active;return {label,href,idx:'0'+(k+1),color:a?(dark&&!sc?'#181D27':'#181D27'):(dark&&!sc?'#D5D7DA':'#535862'),bg:a?(dark&&!sc?'#fff':'#fff'):'transparent',shadow:a?'0 1px 3px rgba(0,0,0,.12)':'none',hoverBg:a?'#fff':(dark&&!sc?'rgba(255,255,255,.12)':'rgba(0,0,0,.05)'),mBg:a?'#262C38':'transparent'};});
    const mobile=this.state.w<1100;
    return { links, fg, desktop:!mobile, mobile, open:mobile&&this.state.open,
      padY:sc?'10px':'18px', maxW:sc?'1120px':'1240px',
      barBg:dark&&!sc?'rgba(24,29,39,.55)':'rgba(255,255,255,.82)', barBorder:dark&&!sc?'rgba(255,255,255,.14)':'rgba(24,29,39,.08)',
      barShadow:sc?'0 12px 40px -12px rgba(24,29,39,.28)':'0 1px 0 rgba(255,255,255,.04)',
      navBg:dark&&!sc?'rgba(255,255,255,.06)':'rgba(24,29,39,.05)', ghostBorder:dark&&!sc?'rgba(255,255,255,.22)':'rgba(24,29,39,.14)', ghostHover:dark&&!sc?'rgba(255,255,255,.1)':'rgba(24,29,39,.05)',
      bar1:this.state.open?'translateY(3.5px) rotate(45deg)':'none', bar2:this.state.open?'translateY(-3.5px) rotate(-45deg)':'none', bar2o:'1',
      toggle:()=>this.setState(s=>({open:!s.open})), close:()=>this.setState({open:false}) };
  }
}

Logic.prototype.tpl = function tpl(v, props) {
  return (<> <header style={{ position: "fixed", top: "0", left: "0", right: "0", zIndex: "50", padding: `${v.padY} 16px 0`, pointerEvents: "none", transition: "padding .35s cubic-bezier(.2,.7,.2,1)" }}> <div style={{ maxWidth: v.maxW, margin: "0 auto", height: "60px", padding: "0 8px 0 10px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", borderRadius: "999px", pointerEvents: "auto", background: v.barBg, backdropFilter: "blur(18px) saturate(1.4)", WebkitBackdropFilter: "blur(18px) saturate(1.4)", border: `1px solid ${v.barBorder}`, boxShadow: v.barShadow, transition: "max-width .35s cubic-bezier(.2,.7,.2,1),background .35s,box-shadow .35s,border-color .35s", animation: "mrbHdrIn .5s ease-out both" }}> <a href="/" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 10px 6px 6px", borderRadius: "999px", color: v.fg }} aria-label="MrBuilder home"> <img src="/site/brand/mrb-head-logo.png" alt="" style={{ height: "44px", width: "auto", display: "block" }} /><img src="/site/brand/mrb-wordmark.png" alt="Mr. Builder" style={{ height: "22px", width: "auto", display: "block" }} /> </a> {(v.desktop) ? (<> <nav style={{ display: "flex", alignItems: "center", gap: "2px", padding: "4px", borderRadius: "999px", background: v.navBg }}> {v.links.map((l, _i) => (<Fragment key={_i}> <Hv as="a" href={l.href} style={{ position: "relative", padding: "8px 14px", borderRadius: "999px", fontSize: "13.5px", fontWeight: "600", color: l.color, background: l.bg, boxShadow: l.shadow, transition: "background .2s,color .2s", whiteSpace: "nowrap" }} hover={{ background: l.hoverBg, color: v.fg }}>{l.label}</Hv> </Fragment>))} </nav> </>) : null} {(v.mobile) ? (<> <div style={{ display: "flex", alignItems: "center", gap: "6px" }}> <button onClick={v.toggle} aria-label="Menu" aria-expanded={v.open} style={{ width: "44px", height: "44px", borderRadius: "50%", border: `1px solid ${v.ghostBorder}`, background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "5px", cursor: "pointer", color: v.fg }}> <span style={{ display: "block", width: "18px", height: "2px", borderRadius: "1px", background: "currentColor", transition: "transform .3s", transform: v.bar1 }}></span> <span style={{ display: "block", width: "18px", height: "2px", borderRadius: "1px", background: "currentColor", transition: "transform .3s,opacity .3s", transform: v.bar2, opacity: v.bar2o }}></span> </button> </div> </>) : null} </div> {(v.open) ? (<> <div style={{ maxWidth: v.maxW, margin: "8px auto 0", borderRadius: "24px", pointerEvents: "auto", background: "#181D27", color: "#fff", padding: "12px", display: "flex", flexDirection: "column", gap: "4px", boxShadow: "0 24px 60px -20px rgba(0,0,0,.5)", animation: "mrbMenuIn .25s ease-out both" }}> {v.links.map((l, _i) => (<Fragment key={_i}> <Hv as="a" href={l.href} onClick={v.close} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: "14px", fontSize: "17px", fontWeight: "600", color: "#fff", background: l.mBg }} hover={{ background: "#262C38", color: "#fff" }}>{l.label}<span style={{ fontSize: "11px", fontWeight: "700", letterSpacing: ".06em", color: "#9AA0AB" }}>{l.idx}</span></Hv> </Fragment>))} </div> </>) : null} </header> </>);
};

export default Logic;
