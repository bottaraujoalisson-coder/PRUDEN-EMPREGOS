import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { Application, ApplicationStatus, Job, UserProfile } from '../types';
import {
  calculateDetailedMatchAnalysis,
  calculateScreeningCompatibility,
  stripUndefined,
} from '../utils/matchAlgorithm';

export function subscribeCandidateApplications(
  candidateId: string,
  callback: (apps: Application[]) => void
): () => void {
  const appsRef = collection(db, 'applications');
  const q = query(appsRef, where('candidateId', '==', candidateId));

  return onSnapshot(
    q,
    (snapshot) => {
      const loaded: Application[] = [];
      snapshot.forEach((docSnap) => {
        loaded.push({ id: docSnap.id, ...(docSnap.data() as Omit<Application, 'id'>) });
      });
      loaded.sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
      callback(loaded);
    },
    (error) => {
      console.warn('Applications snapshot listener error:', error);
      callback([]);
    }
  );
}

export function subscribeCompanyApplications(
  companyId: string,
  callback: (apps: Application[]) => void
): () => void {
  const appsRef = collection(db, 'applications');
  const q = query(appsRef, where('companyId', '==', companyId));

  return onSnapshot(
    q,
    (snapshot) => {
      const loaded: Application[] = [];
      snapshot.forEach((docSnap) => {
        loaded.push({ id: docSnap.id, ...(docSnap.data() as Omit<Application, 'id'>) });
      });
      loaded.sort((a, b) => b.matchScore - a.matchScore);
      callback(loaded);
    },
    (error) => {
      console.warn('Company applications snapshot listener error:', error);
      callback([]);
    }
  );
}

export async function hasCandidateApplied(jobId: string, candidateId: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, 'applications'),
      where('jobId', '==', jobId),
      where('candidateId', '==', candidateId)
    );
    const snap = await getDocs(q);
    return !snap.empty;
  } catch (error) {
    console.error('Error checking previous application:', error);
    return false;
  }
}

/**
 * GATILHO EXCLUSIVO DO MOTOR DE MATCH:
 * O cálculo ponderado de match (0% a 100%) e dos pontos fortes/fracos ocorre EXCLUSIVAMENTE
 * neste exato momento em que o candidato confirma a candidatura à vaga.
 */
export async function applyToJob(
  job: Job,
  candidate: UserProfile,
  screeningAnswers?: Record<string, 'sim' | 'nao'>
): Promise<Application> {
  const alreadyApplied = await hasCandidateApplied(job.id, candidate.uid);
  if (alreadyApplied) {
    throw new Error('Você já enviou sua candidatura para esta vaga anteriormente.');
  }

  // Cálculo ponderado exclusivo na confirmação da candidatura
  const detailedAnalysis = calculateDetailedMatchAnalysis(job, candidate);

  const questions = job.screeningQuestions ?? [];
  const hasScreening = questions.length > 0 && screeningAnswers !== undefined;
  const screeningStats = hasScreening
    ? calculateScreeningCompatibility(questions, screeningAnswers)
    : undefined;

  const appId = `app-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();

  const newApp: Application = stripUndefined({
    id: appId,
    jobId: job.id,
    companyId: job.companyId,
    candidateId: candidate.uid,
    candidateName: candidate.name,
    candidateEmail: candidate.email,
    candidatePhone: candidate.phone || '',
    candidateCity: candidate.city || 'Presidente Prudente, SP',
    candidatePhotoDataUrl: candidate.photoDataUrl || '',
    candidateRole: candidate.role || 'Profissional',
    candidateExperienceLevel: candidate.experienceLevel || 'Não informado',
    candidateEducation: candidate.education || '',
    candidateSkills: candidate.skills || [],
    candidateAbout: candidate.about || '',
    candidateResumeName: candidate.resumeFileName || '',
    candidateResumeDataUrl: candidate.resumeDataUrl || '',
    jobTitle: job.title,
    companyName: job.companyName,
    jobLocation: job.location,
    matchScore: detailedAnalysis.matchScore,
    matchBreakdown: detailedAnalysis.matchBreakdown,
    matchStrengths: detailedAnalysis.matchStrengths,
    matchWeaknesses: detailedAnalysis.matchWeaknesses,
    matchingSkills: detailedAnalysis.matchingSkills,
    missingSkills: detailedAnalysis.missingSkills,
    status: 'Enviado',
    appliedAt: now,
    updatedAt: now,
    ...(hasScreening && screeningStats
      ? {
          screeningAnswers,
          screeningScore: screeningStats.score,
          screeningTotal: screeningStats.total,
        }
      : {}),
  });

  try {
    await setDoc(doc(db, 'applications', appId), newApp);
    return newApp;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `applications/${appId}`);
  }
}

export async function updateApplicationStatus(
  appId: string,
  newStatus: ApplicationStatus,
  recruiterNotes?: string,
  viewedAt?: string
): Promise<void> {
  try {
    const appRef = doc(db, 'applications', appId);
    const payload = stripUndefined({
      status: newStatus,
      updatedAt: new Date().toISOString(),
      ...(recruiterNotes !== undefined ? { recruiterNotes } : {}),
      ...(viewedAt !== undefined ? { viewedAt } : {}),
    });
    await updateDoc(appRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `applications/${appId}`);
  }
}

export async function withdrawApplication(appId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'applications', appId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `applications/${appId}`);
  }
}
