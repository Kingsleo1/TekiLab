import {UserManagementView} from './admin/UserManagementView';
export function StaffManagementView({selectedBranchId,currentUser}:{selectedBranchId?:string;currentUser?:any}){return <UserManagementView selectedBranchId={selectedBranchId}/>;}
