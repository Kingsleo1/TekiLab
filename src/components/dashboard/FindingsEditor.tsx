import { useEffect, useRef, useState } from 'react';
import { sanitizeFindings, findingsText } from '../../lib/findings';
interface Props { value: string; onChange: (html: string, text: string) => void; label?: string; readOnly?: boolean }
export function FindingsEditor({ value, onChange, label = 'Medical findings', readOnly = false }: Props) {
  const editor = useRef<HTMLDivElement>(null);
  const recognition = useRef<any>(null);
  const callback = useRef(onChange); callback.current = onChange;
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState('');
  const Speech = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  useEffect(() => {
    if (editor.current && editor.current.innerHTML !== sanitizeFindings(value)) editor.current.innerHTML = sanitizeFindings(value);
  }, [value]);
  useEffect(() => () => { recognition.current?.abort(); }, []);
  useEffect(() => { recognition.current?.abort(); recognition.current=null; setListening(false); }, [readOnly]);
  const emit = () => {
    if (!editor.current) return;
    const html = sanitizeFindings(editor.current.innerHTML);
    callback.current(html, findingsText(html));
  };
  const command = (name: string, arg?: string) => {
    editor.current?.focus(); document.execCommand(name, false, arg); emit();
  };
  const dictate = () => {
    if (listening) { recognition.current?.stop(); return; }
    setMessage('Browser dictation may use your browser provider’s speech service. Review every transcription.');
    if (!Speech || readOnly) return;
    recognition.current?.abort();
    editor.current?.focus();
    const instance = new Speech(); recognition.current = instance;
    const seen = new Set<number>();
    instance.lang = 'en-US'; instance.continuous = true; instance.interimResults = true;
    instance.onresult = (event: any) => {
      if (!editor.current || recognition.current !== instance) return;
      const text = Array.from(event.results as any).map((r:any,index:number)=>({r,index})).filter(({r,index})=>index>=event.resultIndex && r.isFinal && !seen.has(index)).map(({r,index})=>{seen.add(index);return r[0].transcript;}).join(' ');
      const interim = Array.from(event.results as any).filter((r:any)=>!r.isFinal).map((r:any)=>r[0].transcript).join(' ');
      if(interim)setMessage('Hearing: '+interim);
      if (text) { editor.current.focus();
        const selection=window.getSelection();
        if(selection?.rangeCount && editor.current.contains(selection.anchorNode)) document.execCommand('insertText',false,' '+text.trim());
        else editor.current.append(document.createTextNode(' '+text.trim()));
        emit(); setMessage('Transcript inserted. Review before approving this report.');
      }
    };
    instance.onerror = (event: any) => { if(recognition.current!==instance)return; setMessage(event.error==='not-allowed'?'Allow microphone access in browser and Windows settings, then retry.':event.error==='network'?'The browser speech service could not connect. Check your connection and retry.':event.error==='audio-capture'?'No microphone is available. Check the selected recording device.':'Dictation stopped: '+event.error+'. You can continue typing.'); setListening(false); };
    instance.onend = () => {if(recognition.current===instance){recognition.current=null;setListening(false);}};
    try { instance.start(); setListening(true); } catch { setMessage('Microphone unavailable. You can continue typing.'); }
  };
  return <div className="space-y-2 min-w-0">
    <div role="toolbar" aria-label={label + ' formatting'} className="flex flex-wrap gap-1">
      {[['Bold','bold'],['Italic','italic'],['Underline','underline'],['Bullets','insertUnorderedList'],['Numbered list','insertOrderedList'],['Undo','undo'],['Redo','redo']].map(([text, cmd]) =>
        <button key={cmd} type="button" disabled={readOnly} onMouseDown={e => e.preventDefault()} onClick={() => command(cmd)} className="border rounded px-2 py-1 text-xs disabled:opacity-40">{text}</button>)}
      <button type="button" disabled={readOnly || !Speech} onClick={dictate} className="border rounded px-2 py-1 text-xs" aria-pressed={listening}>{listening ? 'Stop dictation' : 'Dictate'}</button>
    </div>
    <div ref={editor} role="textbox" aria-label={label} aria-multiline="true" contentEditable={!readOnly} suppressContentEditableWarning onInput={emit}
      onDrop={e => e.preventDefault()}
      onPaste={e => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')); emit(); }}
      className="min-h-32 max-h-96 overflow-auto break-words rounded-lg border bg-white text-slate-900 p-3 text-sm [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-5" />
    <p role="status" className="text-xs text-slate-500">{message || (Speech ? 'Dictation uses browser speech recognition; no TekiLab AI credits required.' : 'This browser does not support dictation. Type your findings above.')}</p>
  </div>;
}
