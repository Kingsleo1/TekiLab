import {PublicResultVerifier} from '../src/server/public-result-verification';
import {CatalogueError} from '../src/server/catalogue-errors';
// Read-only serverless route: no client-supplied credentials, database proxy or report listing.
export default async function handler(req:any,res:any){
 res.setHeader('Cache-Control','private, no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Robots-Tag','noindex, nofollow');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Only result verification lookups are supported.'});}
 try{const result=await new PublicResultVerifier(process.env).verify(String(req.query?.token||''));return res.status(200).json(result);}catch(error){return res.status(error instanceof CatalogueError?error.status:503).json({error:error instanceof CatalogueError?error.message:'Public result verification is unavailable. Contact the issuing facility.'});}
}
