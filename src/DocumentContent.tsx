import type {CSSProperties} from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize,{defaultSchema} from 'rehype-sanitize';
// Only the two document colours are allowed in inline HTML styles.
const colourSchema={...defaultSchema,attributes:{...defaultSchema.attributes,span:[...(defaultSchema.attributes?.span||[]),['style',/^color:\s*#(?:482a30|ff501b);?$/i]]}};
import {parseDocument} from './documentLayout';
export default function DocumentContent({text}:{text:string}){
 const {body,spacing}=parseDocument(text);
 const style={
  '--document-line-height':spacing.lineHeight,
  '--document-paragraph-gap':`${spacing.paragraphGap}pt`,
  '--document-heading-gap':`${spacing.headingGap}pt`
 } as CSSProperties;
 return <div style={style} data-document-spacing={JSON.stringify(spacing)}>{body.split(/^[ \t]*<!--[ \t]*pagebreak[ \t]*-->[ \t]*\r?$/m).map((part,index)=><div className="document-section" data-pdf-section="true" key={index}>{index>0&&<div className="manual-page-break" aria-label="Nowa strona">Nowa strona</div>}<Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw,[rehypeSanitize,colourSchema]]}>{part}</Markdown></div>)}</div>;
}
