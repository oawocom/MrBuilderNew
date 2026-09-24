"use client";
// @ts-nocheck
// Generated from the client's "Job Handoff.dc.html" by gen_site.py — do not edit by hand.
import React, { Fragment } from "react";
import { DCLogic, Hv } from "./dc";
import AppDemo from "./AppDemo";

class Logic extends DCLogic {
  state = { clock:0, w:1200 };
  constructor(p){ super(p); this.root=React.createRef(); this.t0=0; this.elapsed=0; this._playing=false; this.TOTAL=23000; }
  reduced(){ return typeof window!=='undefined'&&window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  componentDidMount(){
    this.onR=()=>this.setState({w:this.root.current?this.root.current.getBoundingClientRect().width:window.innerWidth}); this.onR(); window.addEventListener('resize',this.onR);
    if(this.reduced()){ this.setState({clock:19000}); return; }
    const el=this.root.current;
    if('IntersectionObserver' in window&&el){ this.io=new IntersectionObserver(es=>{ if(es[0].isIntersecting) this.resume(); else this.pause(); },{threshold:.2}); this.io.observe(el); } else this.resume();
    this.onVis=()=>{ if(document.hidden) this.pause(); else this.resume(); }; document.addEventListener('visibilitychange',this.onVis);
  }
  componentWillUnmount(){ this.pause(); if(this.io)this.io.disconnect(); window.removeEventListener('resize',this.onR); document.removeEventListener('visibilitychange',this.onVis); }
  pause(){ if(!this._playing)return; this._playing=false; clearInterval(this.iv); this.elapsed=(performance.now()-this.t0)%this.TOTAL; }
  resume(){ if(this._playing)return; this._playing=true; this.t0=performance.now()-this.elapsed; this.iv=setInterval(()=>this.setState({clock:(performance.now()-this.t0)%this.TOTAL}),45); }
  renderVals(){
    const c=this.state.clock, wide=this.state.w>=720;
    // path: A (consumer end) -> hub -> B (contractor end); in lane coordinates 0..1
    const seg=(t,a,b)=>Math.max(0,Math.min(1,(t-a)/(b-a)));
    const ease=x=>x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2;
    const pos=(p)=>{ // p 0..1 along consumer->contractor
      if(wide) return {x:(-6+p*112).toFixed(2)+'%',y:'50%'}; return {x:'50%',y:(-6+p*112).toFixed(2)+'%'}; };
    // send: 10400..12400 ; ack: 17600..19600
    const sendP=ease(seg(c,10400,12400)), ackP=1-ease(seg(c,17600,19600));
    const showSend=c>=10300&&c<12600, showAck=c>=17500&&c<19800;
    const fadeIn=(t,a)=>Math.min(1,Math.max(0,(t-a)/250)), fadeOut=(t,b)=>Math.min(1,Math.max(0,(b-t)/250));
    const sp=pos(sendP), ap=pos(ackP);
    const hubPulse=(c>=11300&&c<12200)||(c>=18500&&c<19400);
    const hubLabel=c<10400?'MrBuilder':c<12400?'Routing request…':c<17600?'Offered to nearby pros':c<19600?'Confirming…':'Job matched';
    const phaseIdx=c<5600?0:c<10400?1:c<14800?2:c<18400?3:4;
    const caps=['The homeowner describes the pergola and asks for a quote.','MrBuilder prices it instantly. The homeowner reviews and submits the request.','The request is routed through MrBuilder to contractors nearby. It appears as a new job in Mike\'s marketplace.','Mike reviews the scope, dates and payment, and accepts.','Both sides now see the same job: "Contractor assigned" for the homeowner, "Accepted" for Mike.'];
    const phases=[0,1,2,3,4].map(k=>({bg:k<phaseIdx?'#F7A26B':k===phaseIdx?'#EF6820':'#3A4152'}));
    return {
      rootRef:this.root, clock:c,
      dir:wide?'row':'column', alignItems:wide?'flex-start':'center', gap:wide?'0':'8px',
      laneW:wide?'clamp(200px,26vw,320px)':'200px', laneH:wide?'120px':'170px', laneAlign:wide?'flex-start':'center', laneMt:wide?'clamp(180px,26vw,300px)':'0',
      viewBox:wide?'0 0 100 100':'0 0 100 100', l1:wide?{x1:0,y1:50,x2:100,y2:50}:{x1:50,y1:0,x2:50,y2:100},
      hubPulse, hubLabel,
      showSend, sendX:sp.x, sendY:sp.y, sendScale:(0.85+0.15*fadeIn(c,10300)).toFixed(3), sendOpacity:(fadeIn(c,10300)*fadeOut(c,12600)).toFixed(3),
      showAck, ackX:ap.x, ackY:ap.y, ackScale:(0.85+0.15*fadeIn(c,17500)).toFixed(3), ackOpacity:(fadeIn(c,17500)*fadeOut(c,19800)).toFixed(3),
      caption:caps[phaseIdx], phases
    };
  }
}

Logic.prototype.tpl = function tpl(v, props) {
  return (<> <div ref={v.rootRef} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "20px" }}> <div style={{ display: "flex", flexDirection: v.dir, alignItems: v.alignItems, justifyContent: "center", gap: v.gap }}>  <div style={{ width: "260px", maxWidth: "100%", flex: "0 1 auto", display: "flex", flexDirection: "column", gap: "12px", alignItems: "center" }}> <span style={{ padding: "4px 10px", borderRadius: "999px", background: "#FEF6EE", color: "#B93815", fontSize: "12px", fontWeight: "700" }}>{"Homeowner · Consumer app"}</span> <div style={{ width: "260px", maxWidth: "100%" }}><AppDemo demo="duo-c" clock={v.clock} compact={true} /></div> </div>  <div style={{ position: "relative", flex: "0 0 auto", width: v.laneW, height: v.laneH, alignSelf: v.laneAlign, marginTop: v.laneMt, zIndex: "2" }}> <svg viewBox={v.viewBox} width="100%" height="100%" preserveAspectRatio="none" style={{ position: "absolute", inset: "0", overflow: "visible" }}> <line x1={v.l1.x1} y1={v.l1.y1} x2={v.l1.x2} y2={v.l1.y2} stroke="#3A4152" strokeWidth="2" strokeDasharray="6 6" style={{ animation: "jhDash 1.2s linear infinite" }}></line> </svg>  <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: "56px", height: "56px", borderRadius: "50%", background: "#fff", boxShadow: "0 8px 24px rgba(0,0,0,.35)", display: "flex", alignItems: "center", justifyContent: "center" }}> <img src="/site/brand/mrb-mark.png" alt="Mr. Builder" style={{ width: "34px", height: "auto", objectFit: "contain" }} /> {(v.hubPulse) ? (<><span style={{ position: "absolute", inset: "0", borderRadius: "50%", border: "2px solid #EF6820", animation: "jhPulse .9s ease-out both" }}></span></>) : null} </div> <span style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,36px)", fontSize: "11px", fontWeight: "600", color: "#9AA0AB", whiteSpace: "nowrap" }}>{v.hubLabel}</span>  {(v.showSend) ? (<> <div style={{ position: "absolute", left: v.sendX, top: v.sendY, transform: `translate(-50%,-50%) scale(${v.sendScale})`, opacity: v.sendOpacity, padding: "8px 12px", borderRadius: "12px", background: "#EF6820", color: "#fff", fontSize: "12px", fontWeight: "700", whiteSpace: "nowrap", boxShadow: "0 10px 24px rgba(239,104,32,.45)", display: "flex", alignItems: "center", gap: "6px" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v16H4z"></path><path d="M4 9h16M9 9v11"></path></svg>{"Installation request · $4,500"}</div> </>) : null} {(v.showAck) ? (<> <div style={{ position: "absolute", left: v.ackX, top: v.ackY, transform: `translate(-50%,-50%) scale(${v.ackScale})`, opacity: v.ackOpacity, padding: "8px 12px", borderRadius: "12px", background: "#067647", color: "#fff", fontSize: "12px", fontWeight: "700", whiteSpace: "nowrap", boxShadow: "0 10px 24px rgba(6,118,71,.45)", display: "flex", alignItems: "center", gap: "6px" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>{"Accepted by Mike J."}</div> </>) : null} </div>  <div style={{ width: "260px", maxWidth: "100%", flex: "0 1 auto", display: "flex", flexDirection: "column", gap: "12px", alignItems: "center" }}> <span style={{ padding: "4px 10px", borderRadius: "999px", background: "#262C38", color: "#fff", fontSize: "12px", fontWeight: "700" }}>{"Contractor · Contractor app"}</span> <div style={{ width: "260px", maxWidth: "100%" }}><AppDemo demo="duo-k" clock={v.clock} compact={true} /></div> </div> </div>  <div style={{ maxWidth: "720px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "10px", alignItems: "center" }}> <div style={{ display: "flex", gap: "6px", width: "100%", maxWidth: "420px" }}> {v.phases.map((p, _i) => (<Fragment key={_i}><span style={{ flex: "1", height: "4px", borderRadius: "2px", background: p.bg }}></span></Fragment>))} </div> <span style={{ fontSize: "15px", lineHeight: "22px", fontWeight: "600", color: "#fff", textAlign: "center", minHeight: "44px", textWrap: "pretty" }}>{v.caption}</span> </div> </div> </>);
};

export default Logic;
