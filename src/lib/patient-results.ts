// Only a trusted session's linked patient ID establishes portal ownership.
export function ownReleasedResults(orders:any[],patientId:string){
 if(!patientId)return [];
 return orders.filter(order=>order.patientId===patientId&&['RELEASED','Released'].includes(order.orderStatus)&&order.reportApproval&&order.verification?.token);
}
