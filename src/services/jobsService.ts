import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { Job } from '../types';
import { stripUndefined } from '../utils/matchAlgorithm';

export function subscribeJobs(callback: (jobs: Job[]) => void): () => void {
  const jobsRef = collection(db, 'jobs');
  const q = query(jobsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const loaded: Job[] = [];
      snapshot.forEach((docSnap) => {
        if (!docSnap.id.startsWith('job-seed-')) {
          loaded.push({ id: docSnap.id, ...(docSnap.data() as Omit<Job, 'id'>) });
        }
      });
      callback(loaded);
    },
    (error) => {
      console.error('Jobs snapshot listener error:', error);
      callback([]);
    }
  );
}

export async function createJob(
  jobData: Omit<Job, 'id' | 'createdAt' | 'applicantCount'>
): Promise<string> {
  const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const nowMs = Date.now();
  const now = new Date(nowMs).toISOString();
  const defaultExpiresAt = new Date(nowMs + 30 * 24 * 60 * 60 * 1000).toISOString();

  const fullJob: Job = stripUndefined({
    ...jobData,
    id: jobId,
    applicantCount: 0,
    createdAt: now,
    updatedAt: now,
    expiresAt: jobData.expiresAt || defaultExpiresAt,
  });

  try {
    await setDoc(doc(db, 'jobs', jobId), fullJob);
    return jobId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `jobs/${jobId}`);
  }
}

export async function updateJob(jobId: string, updates: Partial<Job>): Promise<void> {
  try {
    const jobRef = doc(db, 'jobs', jobId);
    const payload = stripUndefined({
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    await updateDoc(jobRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `jobs/${jobId}`);
  }
}

export async function deleteJob(jobId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'jobs', jobId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `jobs/${jobId}`);
  }
}
