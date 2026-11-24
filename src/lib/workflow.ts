export const activeTicket = (ticket: any) => !['Completed', 'Cancelled'].includes(ticket.status);
export function routePatient(tickets: any[], patient: any, department: string, notes = '', sourceOrderId?: string) {
  if (tickets.some(t => t.patientId === patient.id && t.department === department && activeTicket(t) && (!sourceOrderId || t.sourceOrderId === sourceOrderId))) return tickets;
  const now = new Date().toISOString();
  return [{ id: crypto.randomUUID(), ticketNumber: department.slice(0,3).toUpperCase() + '-' + String(tickets.length + 1).padStart(4, '0'),
    patientId: patient.id, patientName: patient.fullName, mrn: patient.mrn, department, sourceOrderId,
    status: 'Waiting', priority: 'Normal', issuedAt: now, createdAt: now, notes }, ...tickets];
}
export function transferTicket(tickets: any[], id: string, department: string) {
  const ticket = tickets.find(t => t.id === id);
  if (!ticket || !activeTicket(ticket) || ticket.department === department) return tickets;
  return routePatient(tickets.map(t => t.id === id ? { ...t, status: 'Completed' } : t),
    { id: ticket.patientId, fullName: ticket.patientName, mrn: ticket.mrn }, department, 'Transferred from ' + ticket.department);
}
export function completeDiagnostic(tickets: any[], order: any, department: string) {
  const completed = tickets.map(t => t.patientId === order.patientId && t.department === department && activeTicket(t) && (!t.sourceOrderId || t.sourceOrderId === order.id) ? { ...t, status: 'Completed' } : t);
  return routePatient(completed, { id: order.patientId, fullName: order.patientName, mrn: order.mrn }, 'Doctor Consultation', 'Released result ready: ' + order.testName, order.id);
}
export function chargeForOrder(order: any, imaging = false) {
  return { id: 'charge-' + order.id, sourceOrderId: order.id, patientId: order.patientId, patientName: order.patientName, mrn: order.mrn,
    encounterId: order.encounterId, category: imaging ? 'Radiology Scan' : 'Lab Investigation', description: order.testName,
    totalAmountNaira: order.priceNaira, hmoCoveredNaira: 0, patientPayableNaira: order.priceNaira, paymentStatus: 'Unpaid', createdAt: order.createdAt };
}
export function summarizeWorkflow(labs: any[], imaging: any[], tickets: any[], charges: any[]) {
  const released = labs.filter(o => o.orderStatus === 'RELEASED');
  const durations = released.map(o => (Date.parse(o.releasedAt || o.validatedAt) - Date.parse(o.createdAt)) / 60000).filter(n => Number.isFinite(n) && n >= 0);
  return { pendingLabs: labs.filter(o => !['RELEASED','CANCELLED'].includes(o.orderStatus)).length,
    pendingImaging: imaging.filter(o => o.orderStatus !== 'Released').length,
    awaitingReview: labs.filter(o => o.orderStatus === 'RESULT_ENTERED').length,
    activeQueue: tickets.filter(activeTicket).length, released: released.length,
    collected: charges.filter(c => c.paymentStatus === 'Paid').reduce((sum,c) => sum + Number(c.patientPayableNaira || 0),0),
    outstanding: charges.filter(c => !['Paid','Waived'].includes(c.paymentStatus)).reduce((sum,c) => sum + Number(c.patientPayableNaira || 0),0),
    averageTat: durations.length ? durations.reduce((a,b) => a+b,0) / durations.length : null,
    slaPercent: durations.length ? Math.round(100 * durations.filter(n => n <= 10).length / durations.length) : null };
}
