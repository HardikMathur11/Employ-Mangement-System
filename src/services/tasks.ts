import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, Query, Timestamp, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Task, Employee, User } from '../types';

async function resolveEmployeeUidByEmployeeId(employeeId: string): Promise<{ uid: string | null; employee?: Employee }> {
  try {
    const ref = doc(db, 'employees', employeeId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return { uid: null };
    const emp = { id: snap.id, ...snap.data() } as Employee;
    if ((emp as any).userUid) return { uid: (emp as any).userUid as string, employee: emp };
    if (emp.email) {
      const usersSnap = await getDocs(query(collection(db, 'users'), where('email', '==', emp.email)));
      const userDoc = usersSnap.docs[0];
      if (userDoc) return { uid: userDoc.id, employee: emp };
    }
    return { uid: null, employee: emp };
  } catch {
    return { uid: null };
  }
}

export interface CreateTaskInput {
  title: string;
  description: string;
  assignedEmployeeId: string; // employees/{id}
  priority: 'low' | 'medium' | 'high';
  dueDate: Date;
  attachments?: string[];
}

export async function createTaskForEmployee(creator: User, input: CreateTaskInput): Promise<string> {
  const { uid: assignedUid, employee } = await resolveEmployeeUidByEmployeeId(input.assignedEmployeeId);
  const assignedTo = assignedUid || input.assignedEmployeeId;

  const taskData = {
    title: input.title,
    description: input.description,
    assignedTo,
    assignedToName: employee?.name || '',
    assignedBy: creator.uid,
    assignedByName: creator.displayName,
    status: 'pending' as const,
    priority: input.priority,
    dueDate: input.dueDate,
    attachments: input.attachments || [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const docRef = await addDoc(collection(db, 'tasks'), taskData);

  // Best-effort notification
  try {
    await addDoc(collection(db, 'notifications'), {
      userId: assignedTo,
      title: 'New Task Assigned',
      message: `You have been assigned a new task: ${input.title}`,
      type: 'task',
      isRead: false,
      createdAt: new Date(),
      data: { taskId: docRef.id, priority: input.priority },
    });
  } catch {
    // non-blocking
  }

  return docRef.id;
}

export function subscribeAssignedTasks(
  currentUserUid: string,
  onNext: (tasks: Task[]) => void,
  onError?: (err: any) => void
) {
  // First try with orderBy; if Firestore requires index, consumer can handle error and retry without orderBy
  let q: Query = query(collection(db, 'tasks'), where('assignedTo', '==', currentUserUid), orderBy('createdAt', 'desc'));
  const unsub = onSnapshot(
    q,
    (snapshot) => {
      const list: Task[] = [];
      snapshot.forEach((d) => {
        list.push({
          id: d.id,
          ...d.data(),
          dueDate: (d.data().dueDate as Timestamp | Date | undefined as any)?.toDate?.() || d.data().dueDate,
          createdAt: (d.data().createdAt as Timestamp | Date | undefined as any)?.toDate?.() || d.data().createdAt,
          updatedAt: (d.data().updatedAt as Timestamp | Date | undefined as any)?.toDate?.() || d.data().updatedAt,
        } as Task);
      });
      onNext(list);
    },
    (err) => {
      onError?.(err);
    }
  );
  return unsub;
}

export async function fetchAssignedTasksFallback(currentUserUid: string): Promise<Task[]> {
  const q = query(collection(db, 'tasks'), where('assignedTo', '==', currentUserUid));
  const snap = await getDocs(q);
  const list: Task[] = [];
  snap.forEach((d) => {
    list.push({
      id: d.id,
      ...d.data(),
      dueDate: (d.data().dueDate as Timestamp | Date | undefined as any)?.toDate?.() || d.data().dueDate,
      createdAt: (d.data().createdAt as Timestamp | Date | undefined as any)?.toDate?.() || d.data().createdAt,
      updatedAt: (d.data().updatedAt as Timestamp | Date | undefined as any)?.toDate?.() || d.data().updatedAt,
    } as Task);
  });
  return list.sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));
}


