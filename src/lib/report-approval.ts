import {getRoleDefinition} from '../config/roles';
export interface ReportApproval {
  signerId: string; signerName: string; signedAt: string;
  reportSnapshot: string; reportDigest: string; signaturePng: string;
}
const signatures = new Map<string, string>();
export const clearSignatureVault = () => signatures.clear();
export const rememberSignature = (userId: string, png: string) => signatures.set(userId, png);
export const forgetSignature = (userId: string) => signatures.delete(userId);
export const recallSignature = (userId: string) => signatures.get(userId);
export function canApproveReport(user: any, critical = false, imaging = false): boolean {
  if (!user?.id || !(user.name || user.displayName)) return false;
  const role = String(user.role || '').toLowerCase();
  user={...user,permissions:[...getRoleDefinition(user.role).permissions,...(user.permissions||[])]};
  if (/patient|recept|phleb|cashier|sample/.test(role)) return false;
  if (imaging) return /radiolog|doctor|physician|pathologist|kernel admin|^admin$|ceo/.test(role);
  if (critical) return /lead|pathologist|kernel admin|^admin$/.test(role) || Boolean(user.permissions?.includes('canSignOffCritical'));
  return /scientist|pathologist|kernel admin|^admin$/.test(role) || Boolean(user.permissions?.includes('canRunRapidLab'));
}
export function approvalMatches(approval: ReportApproval | null | undefined, snapshot: string, user: any) {
  return Boolean(approval && approval.reportSnapshot === snapshot && approval.signerId === user?.id && approval.signerName === (user?.name || user?.displayName) && /^data:image\/png;base64,/.test(approval.signaturePng));
}
export async function digestReport(snapshot: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(snapshot));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}
