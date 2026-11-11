export type DocumentSpacing={lineHeight:number;paragraphGap:number;headingGap:number};
export const defaultSpacing:DocumentSpacing={lineHeight:1.5,paragraphGap:7,headingGap:5};
const metadata=/^<!-- psiaulina-layout (\{[^\n]*\}) -->\r?\n(?:\r?\n)?/;
export function parseDocument(text:string){
 const match=text.match(metadata);let spacing={...defaultSpacing};
 if(match){try{const values=JSON.parse(match[1]);for(const key of Object.keys(spacing) as (keyof DocumentSpacing)[]){const n=values[key];const [min,max]=key==='lineHeight'?[1,2]:[0,30];if(typeof n==='number'&&Number.isFinite(n))spacing[key]=Math.min(max,Math.max(min,n))}}catch{/* Keep readable content if metadata is malformed. */}}
 return {body:match?text.slice(match[0].length):text,spacing};
}
export function serializeDocument(body:string,spacing:DocumentSpacing){return JSON.stringify(spacing)===JSON.stringify(defaultSpacing)?body:`<!-- psiaulina-layout ${JSON.stringify(spacing)} -->\n\n${body}`}
