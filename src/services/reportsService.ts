import {
  collection,
  doc,
  setDoc,
  getDocs,
  updateDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { ModerationReport } from '../types';

export async function submitReport(
  reporterId: string,
  targetType: 'job' | 'company' | 'user',
  targetId: string,
  targetTitle: string,
  reason: string
): Promise<string> {
  const reportId = `rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const newReport: ModerationReport = {
    id: reportId,
    reporterId,
    targetType,
    targetId,
    targetTitle,
    reason,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'reports', reportId), newReport);
    return reportId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `reports/${reportId}`);
  }
}

export async function getReports(): Promise<ModerationReport[]> {
  try {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const reports: ModerationReport[] = [];
    snap.forEach((d) => reports.push(d.data() as ModerationReport));
    return reports;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'reports');
  }
}

export async function updateReportStatus(
  reportId: string,
  status: 'reviewed' | 'dismissed'
): Promise<void> {
  try {
    await updateDoc(doc(db, 'reports', reportId), { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `reports/${reportId}`);
  }
}
