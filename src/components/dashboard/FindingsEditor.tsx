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
  useEffect(() => { recognition.current?.abort(); setListening(false); }, [readOnly]);
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
    const instance = new Speech(); recognition.current = instance;
    instance.lang = 'en-NG'; instance.continuous = true; instance.interimResults = false;
    instance.onresult = (event: any) => {
      if (!editor.current) return;
      const text = Array.from(event.results as any).slice(event.resultIndex).filter((r: any) => r.isFinal).map((r: any) => r[0].transcript).join(' ');
      if (text) { editor.current.append(document.createTextNode(' ' + text)); emit(); }
    };
    instance.onerror = (event: any) => { setMessage('Dictation stopped: ' + event.error + '. You can continue typing.'); setListening(false); };
    instance.onend = () => setListening(false);
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
