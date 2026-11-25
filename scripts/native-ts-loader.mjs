import {registerHooks} from 'node:module';
import fs from 'node:fs';
import ts from 'typescript';
registerHooks({resolve(specifier,context,next){try{return next(specifier,context);}catch(error){if(specifier.startsWith('.'))for(const suffix of ['.ts','.tsx','/index.ts']){const url=new URL(specifier+suffix,context.parentURL);if(fs.existsSync(url))return {url:url.href,shortCircuit:true};}throw error;}},load(url,context,next){if(/\.tsx?$/.test(url)){const source=fs.readFileSync(new URL(url),'utf8');return {format:'module',source:ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,shortCircuit:true};}return next(url,context);}});
