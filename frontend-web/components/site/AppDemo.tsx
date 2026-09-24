// @ts-nocheck
"use client";
// Generated from the client's "App Demo.dc.html" by gen_site.py — do not edit by hand.
import React, { Fragment } from "react";
import { DCLogic, Hv } from "./dc";

class Logic extends DCLogic {
  state = { i:0, now:0, entering:false, playing:false, userPaused:false };
  constructor(p){ super(p); this.root=React.createRef(); this.t0=0; this.elapsed=0; this._playing=false; }
  static get S(){ return '/site/screens/'; }
  seq(){
    const S='/site/screens/', T='/site/screens/tall/';
    const tall=(n,top,h,imgH)=>({src:T+n+'.webp',top,h,imgH});
    const tap=(x,y,t)=>({type:'tap',x,y,t});
    const scroll=(to,t)=>({type:'scroll',to,t});
    const type=(x,y,w,h,text,t,ms,until)=>({type:'type',x,y,w,h,text,t,ms:ms||Math.max(500,text.length*55),until});
    const chk=(x,y,t)=>({type:'chk',x:x-11,y:y-11,w:22,h:22,t});
    const btn=(x,y,w,h,label,t)=>({type:'btn',x,y,w,h,label,t});
    const bubble=(text,y,w,t)=>({type:'bubble',x:366-w,y,w,h:44,text,t});
    const strip=(x,y,w,h,t)=>({type:'fill',x,y,w,h,t,bg:'#FAFAFA'});
    const photo=(x,y,w,h,t)=>({type:'photo',x,y,w,h,t});
    const star=(x,y,t)=>({type:'star',x:x-20,y:y-20,w:40,h:40,t});
    const label=(x,y,w,h,text,t,fg,ring)=>({type:ring?'ring':'label',x,y,w,h,text,t,fg});
    const sh=(src,dur,trans,cap,o)=>Object.assign({src:S+src+'.webp',dur,trans,cap,ev:[]},o||{});
    const D={
      // Consumer
      c1:[ sh('c-home',2600,'fade','Home: tap "Install a pergola".',{ev:[tap(107,246,1400)]}),
           sh('c-install-empty',2800,'push','New installation request opens. Tap "Use my home address".',{ev:[tap(283,229,1500)]}),
           sh('c-install-form',2800,'fade','Address filled from your profile. The form is ready for project details.') ],
      c2:[ sh('c-install-form',3600,'fade','Scroll to the pergolas section and tap "Add a pergola".',{tall:tall('c-install-form',115,626,1676),ev:[scroll(780,300),tap(195,682,2400)]}),
           sh('c-add-empty',3400,'push','Enter type, brand and W × L × H.',{ev:[type(24,184,298,52,'Louvered pergola',400),type(24,270,298,52,'Sunline',1300),type(24,521,109,52,'12',2000),type(141,521,109,52,'10',2350),type(257,521,109,52,'9',2700)]}),
           sh('c-add-pergola',3200,'fade','Mounting, enclosures, footings, accessories and photos, then Save.',{tall:tall('c-add-pergola',115,574,2378),ev:[scroll(1804,200),tap(195,728,2300)]}),
           sh('c-install-form',2200,'back','The pergola is added to your request.') ],
      c3:[ sh('c-quote-loading',1800,'fade','MrBuilder prices the request from your details.'),
           sh('c-quote',4400,'fade','Review the itemized quote, then submit the request.',{tall:tall('c-quote',115,604,1346),ev:[scroll(520,600),tap(195,758,3400)]}),
           sh('c-received',2600,'sheet','Request received. Nothing is booked until you approve the price.') ],
      c4:[ sh('c-requests',2600,'fade','Open the request from your Requests list.',{ev:[tap(195,300,1500)]}),
           sh('c-approved',2800,'push','Finding a MrBuilder PRO: your job is offered to verified contractors nearby.'),
           sh('c-assigned',3200,'fade','Contractor assigned: name, rating and contact options appear on the request.',{tall:tall('c-assigned',115,699,1806),ev:[scroll(380,800)]}) ],
      c5:[ sh('c-assigned',2200,'fade','Contractor assigned, visit window confirmed.'),
           sh('c-enroute',2400,'fade','On the way, with live ETA.'),
           sh('c-arrived',2400,'fade','Arrived on site. Before-work photos are logged.'),
           sh('c-in-progress',3200,'fade','In progress: steps update from the contractor\'s app.',{tall:tall('c-in-progress',115,729,2348),ev:[scroll(520,700)]}) ],
      c6:[ sh('c-assigned',2400,'fade','Tap the message icon on your request.',{ev:[tap(277,700,1400)]}),
           sh('c-chat',6400,'push','Type a message to your technician and send it.',{ev:[type(72,762,246,44,'Gate code is 4471, see you at 9.',700,1800,3050),tap(348,784,2900),strip(24,690,342,54,3050),bubble('Gate code is 4471, see you at 9.',694,250,3100)]}) ],
      c7:[ sh('c-awaiting',4200,'fade','Review the contractor\'s proof photos, then tap "Confirm & pay".',{tall:tall('c-awaiting',115,729,1961),ev:[scroll(840,400),tap(195,244,3000)]}),
           sh('c-confirm-pay',2800,'sheet','Add an optional tip and pay.',{ev:[tap(195,596,1700)]}),
           sh('c-completed',2800,'fade','Completed · paid. The receipt stays with the request.') ],
      // Contractor
      k1:[ sh('k-onboarding',1800,'fade','Start the application from onboarding.',{ev:[tap(195,759.5,1100)]}),
           sh('k-signup',9200,'push','Step 1: account information.',{tall:tall('k-signup',57.5,777,817),ev:[
             tap(109,295.5,300),type(28,270.5,162,50,'John',400,500),
             tap(281,295.5,1000),type(200,270.5,162,50,'Peterson',1100,750),
             tap(195,382.5,2000),type(28,357.5,334,50,'john.peterson@email.com',2100,1500),
             tap(240,468.5,3750),type(28,443.5,334,50,'US (+1)   (555) 014-2276',3850,1300,undefined,90),
             tap(195,555.5,5300),type(28,530.5,334,50,'••••••••••',5400,900),
             scroll(65,6300),
             tap(195,616.5,6800),type(28,591.5,334,50,'••••••••••',6900,900),
             tap(195,747.5,8300)]}),
           sh('k-signup-2',6600,'push','Step 2: address.',{ev:[
             tap(195,295.5,300),type(28,270.5,334,50,'2418 Alder Street',400,1100),
             tap(195,382.5,1650),type(28,357.5,334,50,'Unit 3',1750,500),
             tap(109,468.5,2400),type(28,443.5,162,50,'Portland',2500,600),
             tap(281,468.5,3250),type(200,443.5,162,50,'Oregon',3350,500),
             tap(109,555.5,4000),type(28,530.5,162,50,'97214',4100,500),
             tap(256,707.5,5600)]}),
           sh('k-signup-3',2600,'push','Step 3: choose your role.',{ev:[tap(195,628,900),label(28,556.5,334,143,'',1000,'#181D27',true),tap(256,738.5,1900)]}),
           sh('k-signup-4',4800,'push','Step 4: business information.',{ev:[tap(195,371,600),label(28,347.5,334,47,'',700,'#181D27',true),tap(195,512.5,1500),type(28,487.5,334,50,'93-4521867',1600,900,undefined,90),tap(256,728.5,3800)]}),
           sh('k-signup-5',5200,'push','Step 5: insurance & skills.',{tall:tall('k-signup-5',57.5,777,1090),ev:[tap(195,561.5,500),type(28,536.5,334,50,'Hartford, GL 2,000,000',600,1300),scroll(338,2400),tap(256,707.5,4200)]}),
           sh('k-signup-6',3400,'push','Step 6: choose a plan, then submit.',{tall:tall('k-signup-6',57.5,777,911),ev:[tap(195,393,600),label(28,370.5,334,92,'',700,'#181D27',true),scroll(159,1600),tap(256,707.5,2700)]}),
           sh('k-submitted',3200,'push','Application submitted. MrBuilder reviews it before activating marketplace access.') ],
      k2:[ sh('k-marketplace',6000,'fade','Scroll the marketplace. Each card shows type, location, dates and payment.',{tall:tall('k-marketplace',118.5,534,1136),ev:[scroll(300,500),scroll(510,2300),scroll(0,4000),tap(327,490.5,5300)]}),
           sh('k-accept-modal',2600,'sheet','Review the job summary before deciding.') ],
      k3:[ sh('k-marketplace',2400,'fade','Tap "Accept job".',{ev:[tap(264,541.5,1400)]}),
           sh('k-accept-modal',2400,'sheet','Confirm: the customer is notified that a contractor is assigned.',{ev:[tap(195,711.5,1500)]}),
           sh('k-job-accepted',3600,'push','Job accepted: dates, payment and pre-job checklist.',{tall:tall('k-job-accepted',114.5,575,2172),ev:[scroll(260,1500)]}) ],
      k4:[ sh('k-messages',2400,'fade','Open the job conversation.',{ev:[tap(195,189.5,1400)]}),
           sh('k-chat',6400,'push','Type a message to the client and send it.',{ev:[type(24,745.5,286,48,'On my way, arriving around 9:15.',700,1900,3150),tap(342,769.5,3000),bubble('On my way, arriving around 9:15.',550.5,250,3200)]}) ],
      k5:[ sh('k-inspection',3200,'fade','Inspection job: tap "Submit report & quote".',{tall:tall('k-inspection',114.5,575,1940),ev:[tap(195,728.5,1800)]}),
           sh('k-inspection-report',4400,'sheet','Findings, photos and itemized lines, then send.',{tall:tall('k-inspection-report',90.5,699,958),ev:[scroll(213,900),tap(195,540.5,3200)]}),
           sh('k-insp-sent',2600,'fade','Awaiting client approval. MrBuilder prices the report for the customer.') ],
      k6:[ sh('k-job-accepted',4400,'fade','Tick the pre-job checklist, then "Start job".',{ev:[tap(52,537.5,400),chk(52,537.5,550),tap(52,585.5,900),chk(52,585.5,1050),tap(52,633.5,1400),chk(52,633.5,1550),tap(52,681.5,1900),chk(52,681.5,2050),btn(24,702.5,342,52,'Start job',2200),tap(195,728.5,3200)]}),
           sh('k-job-started',2800,'push','Job started. The customer sees "In progress".',{tall:tall('k-job-started',114.5,575,1850),ev:[scroll(200,300),tap(195,728.5,2000)]}),
           sh('k-complete-modal',3200,'sheet','Add proof photos and submit for confirmation.',{ev:[tap(78,596.5,700),photo(24,554.5,109,84,900),btn(24,685.5,342,52,'Submit for confirmation',1100),tap(195,711.5,2300)]}),
           sh('k-job-waiting',2200,'fade','Awaiting client confirmation.') ],
      k7:[ sh('k-job-waiting',2200,'fade','The customer reviews your photos.'),
           sh('k-job-confirmed',2600,'fade','Job confirmed: earnings and payout date shown.',{ev:[tap(195,603.5,1700)]}),
           sh('k-rate-empty',7400,'push','Rate the client: five stars and a short review, then submit.',{ev:[
             tap(79,235,600),star(79,235,700),star(137,235,850),star(195,235,1000),star(253,235,1150),star(311,235,1300),
             strip(24,270,342,20,1300),label(24,270,342,20,'Excellent, 5 / 5',1350,'#067647'),
             type(24,332,342,120,'Great client: clear site access, quick decisions, and paid promptly. Would work with John again.',1900,2600,99999),
             btn(24,684,342,52,'Submit rating',4700),tap(195,710,5600)]}),
           sh('k-job-completed',3000,'sheet','Client confirmed & paid. Rating saved, the job moves to History.') ]
    };
    D['duo-c']=[ sh('c-home',2400,'fade','',{ev:[tap(107,246,1400)]}),
      sh('c-install-form',3200,'push','',{tall:tall('c-install-form',115,626,1676),ev:[scroll(400,300),tap(195,780,2200)]}),
      sh('c-quote-loading',1600,'fade',''),
      sh('c-quote',3200,'fade','',{tall:tall('c-quote',115,604,1346),ev:[scroll(520,400),tap(195,758,2600)]}),
      sh('c-received',4400,'sheet',''),
      sh('c-approved',3600,'push',''),
      sh('c-assigned',4600,'fade','') ];
    D['duo-k']=[ sh('k-marketplace',12400,'fade',''),
      sh('k-marketplace',2600,'fade','',{ev:[tap(264,541.5,1400)]}),
      sh('k-accept-modal',2600,'sheet','',{ev:[tap(195,711.5,1600)]}),
      sh('k-job-accepted',5400,'push','') ];
    D['consumer-short']=[ D.c1[0], sh('c-install-form',3400,'push','Project details filled in. Tap "Get my quote".',{tall:tall('c-install-form',115,626,1676),ev:[scroll(400,300),tap(195,780,2400)]}), D.c3[0], sh('c-quote',3600,'fade','Your itemized quote. Approve when ready.',{tall:tall('c-quote',115,604,1346),ev:[scroll(520,800)]}) ];
    D['contractor-short']=D.k3;
    return D[this.props.demo||'c1']||D.c1;
  }
  reduced(){ return typeof window!=='undefined'&&window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  componentDidMount(){
    if(this.props.clock!==undefined) return;
    if(this.reduced()){ this.setState({userPaused:true}); return; }
    const el=this.root.current;
    if('IntersectionObserver' in window&&el){ this.io=new IntersectionObserver(es=>{ const v=es[0].isIntersecting; if(v&&!this.state.userPaused) this.resume(); else this.pause(); },{threshold:.3}); this.io.observe(el); }
    else this.resume();
    this.onVis=()=>{ if(document.hidden) this.pause(); else if(!this.state.userPaused) this.resume(); };
    document.addEventListener('visibilitychange',this.onVis);
  }
  componentWillUnmount(){ this.pause(); if(this.io)this.io.disconnect(); document.removeEventListener('visibilitychange',this.onVis); }
  tick(){
    const seq=this.seq(), s=seq[this.state.i]; const now=performance.now()-this.t0;
    if(now>=s.dur){ this.go((this.state.i+1)%seq.length); return; }
    this.setState({now});
  }
  go(i){ this.t0=performance.now(); this.elapsed=0; this.setState({i,now:0,entering:true}); requestAnimationFrame(()=>requestAnimationFrame(()=>this.setState({entering:false}))); }
  pause(){ if(!this._playing)return; this._playing=false; clearInterval(this.iv); this.elapsed=performance.now()-this.t0; this.setState({playing:false}); }
  resume(){ if(this._playing)return; this._playing=true; this.t0=performance.now()-this.elapsed; this.setState({playing:true}); this.iv=setInterval(()=>this.tick(),45); }
  renderVals(){
    const seq=this.seq(), n=seq.length; let i=Math.min(this.state.i,n-1), now=this.state.now, ent=this.state.entering;
    if(this.props.clock!==undefined){ const total=seq.reduce((a,x)=>a+x.dur,0); let cl=((+this.props.clock)%total+total)%total; i=0; while(i<n-1&&cl>=seq[i].dur){cl-=seq[i].dur;i++;} now=cl; ent=cl<50; }
    const s=seq[i], prev=seq[(i-1+n)%n];
    const isK=(this.props.demo||'').charAt(0)==='k'||(this.props.demo||'')==='contractor-short'||(this.props.demo||'')==='duo-k';
    const rm=this.reduced();
    const dur=rm?'0s':'.5s';
    const tr={push:'translateX(100%)',sheet:'translateY(100%)',back:'translateX(-28%)',fade:'none'}[s.trans]||'none';
    const curTransform=ent?tr:'none';
    const curOpacity=(s.trans==='fade'||s.trans==='back')&&ent?'0':'1';
    const L=x=>(x/390*100).toFixed(3)+'%', Tp=y=>(y/844*100).toFixed(3)+'%', W=w=>(w/390*100).toFixed(3)+'%', H=h=>(h/844*100).toFixed(3)+'%', F=px=>(px/390*100).toFixed(2)+'cqw';
    const img=(src,alt,extra)=>React.createElement('img',{src,alt:alt||'',style:Object.assign({position:'absolute',left:0,top:0,width:'100%',height:'auto',display:'block'},extra||{})});
    const t=s.tall; let scrollTo=0; (s.ev||[]).forEach(e=>{ if(e.type==='scroll'&&e.t<=now) scrollTo=e.to; });
    const tallImg=t?React.createElement('img',{src:t.src,alt:'',style:{position:'absolute',left:0,top:0,width:'100%',height:'auto',display:'block',transform:'translateY(-'+(scrollTo/t.imgH*100).toFixed(3)+'%)',transition:rm?'none':'transform 1.5s cubic-bezier(.3,.6,.2,1)'}}):null;
    const taps=[], boxes=[];
    (s.ev||[]).forEach((e,k)=>{ if(ent||e.t>now)return; const key=i+'-'+k;
      if(e.type==='tap'){ if(now-e.t<800) taps.push({key,left:(e.x/390*100).toFixed(2)+'%',top:(e.y/844*100).toFixed(2)+'%'}); return; }
      const base={key,left:L(e.x),top:Tp(e.y),width:W(e.w),height:H(e.h),anim:'dmIn .22s ease-out both',justify:'flex-start',pad:'0',weight:500,font:F(15),bg:'transparent',fg:'#181D27',radius:'0',text:'',caret:false,wrap:false,align:'center',ws:'nowrap',pt:'0',border:'0'};
      if(e.type==='type'){ if(e.until&&now>=e.until) return; const p=Math.min(1,(now-e.t)/e.ms); const txt=e.text.slice(0,Math.ceil(e.text.length*p)); boxes.push(Object.assign(base,{left:L(e.x+2),top:Tp(e.y+2),width:W(e.w-4),height:H(e.h-4),bg:'#fff',pad:F(14),radius:F(10),text:txt,caret:p<1||now-e.t<e.ms+1200,anim:'none',align:e.h>60?'flex-start':'center',ws:e.h>60?'normal':'nowrap',pt:e.h>60?F(12):'0',font:e.h>60?F(14):F(15)})); }
      else if(e.type==='chk'){ boxes.push(Object.assign(base,{bg:'#EF6820',fg:'#fff',radius:'27%',justify:'center',weight:800,font:F(13),text:'✓'})); }
      else if(e.type==='btn'){ boxes.push(Object.assign(base,{bg:'#EF6820',fg:'#fff',radius:F(12),justify:'center',weight:600,font:F(16),text:e.label})); }
      else if(e.type==='bubble'){ boxes.push(Object.assign(base,{bg:'#EF6820',fg:'#fff',radius:F(14)+' '+F(14)+' '+F(4)+' '+F(14),pad:F(14),weight:500,font:F(14),text:e.text})); }
      else if(e.type==='fill'){ boxes.push(Object.assign(base,{bg:e.bg,anim:'none'})); }
      else if(e.type==='star'){ boxes.push(Object.assign(base,{bg:'transparent',fg:'#EF6820',justify:'center',font:F(40),text:'★',anim:'dmIn .25s cubic-bezier(.3,1.4,.5,1) both'})); }
      else if(e.type==='ring'){ boxes.push(Object.assign(base,{bg:'transparent',radius:F(12),text:'',border:'2px solid #EF6820',anim:'dmIn .2s ease-out both'})); }
      else if(e.type==='label'){ boxes.push(Object.assign(base,{bg:'#FAFAFA',fg:e.fg,justify:'center',weight:600,font:F(13),text:e.text})); }
      else if(e.type==='photo'){ boxes.push(Object.assign(base,{bg:'#414651',fg:'#fff',radius:F(12),justify:'center',weight:600,font:F(11),text:'IMG_2041'})); }
    });
    return {
      rootRef:this.root, showCaption:!this.props.compact, ariaLabel:(isK?'Contractor':'Consumer')+' app demo: '+s.cap,
      prevImg:img(prev.src), statusImg:img(s.src), curImg:img(s.src,s.cap),
      curTransform, curOpacity, curTransition:ent?'none':'transform '+dur+' cubic-bezier(.2,.7,.2,1), opacity '+dur+' ease',
      hasTall:!!t, tallTop:t?Tp(t.top):'0', tallH:t?H(t.h):'0', tallImg,
      boxes, taps, paused:!this.state.playing, playing:this.state.playing, playLabel:this.state.playing?'Pause':'Play',
      progress:(((seq.slice(0,i).reduce((a,x)=>a+x.dur,0)+Math.min(now,s.dur))/seq.reduce((a,x)=>a+x.dur,0))*100).toFixed(1)+'%',
      capColor:this.props.dark?'#D5D7DA':'#535862', trackColor:this.props.dark?'#3A4152':'#E9EAEB', tag:isK?'Contractor app':'Consumer app', tagBg:isK?'#181D27':'#FEF6EE', tagFg:isK?'#fff':'#B93815', caption:s.cap,
      togglePlay:()=>{ if(this._playing){ this.setState({userPaused:true}); this.pause(); } else { this.setState({userPaused:false}); this.resume(); } },
      replay:()=>{ this.go(0); if(!this._playing){ this.setState({userPaused:false}); this.resume(); } }
    };
  }
}

Logic.prototype.tpl = function tpl(v, props) {
  return (<> <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", width: "100%" }}>  <div ref={v.rootRef} style={{ position: "relative", width: "100%", aspectRatio: "390/844", containerType: "inline-size", borderRadius: "13.33% / 6.16%", boxShadow: "0 24px 40px -18px rgba(0,0,0,.35)" }} role="img" aria-label={v.ariaLabel}> <div style={{ position: "absolute", inset: "0", borderRadius: "13.33% / 6.16%", overflow: "hidden", background: "#1C1C1E" }}>  <div style={{ position: "absolute", inset: "0", clipPath: "inset(5.924% 2.051% 0.948% 2.051%)" }}>{v.prevImg}</div>  <div style={{ position: "absolute", inset: "0", clipPath: "inset(5.924% 2.051% 0.948% 2.051% round 0 0 11.765%/5.314% 11.765%/5.314%)" }}> <div style={{ position: "absolute", inset: "0", transform: v.curTransform, opacity: v.curOpacity, transition: v.curTransition }}> <div style={{ position: "absolute", inset: "0", background: "#FAFAFA", clipPath: "inset(5.924% 2.051% 0.948% 2.051%)" }}>{" "}{v.curImg}{" "}{(v.hasTall) ? (<> <div style={{ position: "absolute", left: "2.051%", width: "95.898%", top: v.tallTop, height: v.tallH, overflow: "hidden", background: "#FAFAFA" }}>{v.tallImg}</div> </>) : null} {v.boxes.map((b, _i) => (<Fragment key={_i}> <div key={b.key} style={{ position: "absolute", left: b.left, top: b.top, width: b.width, height: b.height, borderRadius: b.radius, background: b.bg, color: b.fg, border: b.border, display: "flex", alignItems: b.align, justifyContent: b.justify, padding: `${b.pt} ${b.pad}`, fontWeight: b.weight, fontSize: b.font, lineHeight: "1.35", whiteSpace: b.ws, overflow: "hidden", animation: b.anim, pointerEvents: "none", textAlign: "left" }}>{b.text}{(b.caret) ? (<><span style={{ display: "inline-block", width: "1.5px", height: "1.1em", background: "#EF6820", marginLeft: "1px", animation: "dmCaret 1s steps(1) infinite" }}></span></>) : null}</div> </Fragment>))} </div> </div> </div>  <div style={{ position: "absolute", inset: "0", clipPath: "polygon(0 0,100% 0,100% 100%,0 100%,0 5.924%,2.051% 5.924%,2.051% 99.052%,97.949% 99.052%,97.949% 5.924%,0 5.924%)" }}>{v.statusImg}</div> </div> {v.taps.map((t, _i) => (<Fragment key={_i}> <span key={t.key} style={{ position: "absolute", left: t.left, top: t.top, width: "11.3%", aspectRatio: "1", borderRadius: "50%", background: "rgba(239,104,32,.3)", border: "2px solid #EF6820", animation: "dmTap .7s ease-out both", pointerEvents: "none" }}></span> </Fragment>))} </div>  {(v.showCaption) ? (<> <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "8px" }}> <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}><span style={{ flex: "0 0 auto", padding: "3px 8px", borderRadius: "6px", background: v.tagBg, color: v.tagFg, fontSize: "11px", fontWeight: "700" }}>{v.tag}</span></div> <div style={{ height: "3px", borderRadius: "2px", background: v.trackColor, overflow: "hidden" }}><div style={{ height: "100%", width: v.progress, background: "#EF6820", transition: "width .12s linear" }}></div></div> <span style={{ fontSize: "13px", lineHeight: "19px", color: v.capColor, minHeight: "38px" }}>{v.caption}</span> </div> </>) : null} </div> </>);
};

export default Logic;
