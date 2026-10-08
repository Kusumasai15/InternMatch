export type Positioned = {id:string;x:number;y:number};
/** Deterministic bounded spring/repulsion simulation; settles once, without animation. */
export function forceLayout(ids:string[], edges:{from:string;to:string}[]): Positioned[] {
  const nodes=ids.map((id,i)=>({id,x:500+Math.cos(i*2.399963)*230,y:310+Math.sin(i*2.399963)*190,vx:0,vy:0}));
  const lookup=new Map(nodes.map(n=>[n.id,n]));
  for(let step=0;step<150;step++){
    for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){const a=nodes[i],b=nodes[j];const dx=a.x-b.x,dy=a.y-b.y;const d2=Math.max(64,dx*dx+dy*dy),d=Math.sqrt(d2),f=Math.min(3,2200/d2);a.vx+=dx/d*f;a.vy+=dy/d*f;b.vx-=dx/d*f;b.vy-=dy/d*f;}
    for(const e of edges){const a=lookup.get(e.from),b=lookup.get(e.to);if(!a||!b)continue;const dx=b.x-a.x,dy=b.y-a.y,d=Math.max(1,Math.hypot(dx,dy)),f=(d-95)*0.012;a.vx+=dx/d*f;a.vy+=dy/d*f;b.vx-=dx/d*f;b.vy-=dy/d*f;}
    for(const n of nodes){n.vx=(n.vx+(500-n.x)*0.001)*0.75;n.vy=(n.vy+(310-n.y)*0.001)*0.75;n.x=Math.max(45,Math.min(925,n.x+n.vx));n.y=Math.max(40,Math.min(565,n.y+n.vy));}
  }
  return nodes.map(({id,x,y})=>({id,x,y}));
}
