import React, { useState, useEffect } from 'react';
import { collection, updateDoc, deleteDoc, doc, getDocs, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { uploadManyToCloudinary } from '../utils/cloudinary';
import { createTaskForEmployee, subscribeAssignedTasks, fetchAssignedTasksFallback } from '../services/tasks';
import { useAuth } from '../contexts/AuthContext';
import { Task, Employee } from '../types';
import { Plus, CreditCard as Edit, Trash2, Search, Filter, Clock, CheckCircle, AlertCircle, Paperclip, X, Upload, ClipboardList, Lock } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { format, isPast } from 'date-fns';
import Badge from '../components/Badge';
import Tabs from '../components/Tabs';
import PageHeader from '../components/PageHeader';

const Tasks: React.FC = () => {
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    dueDate: format(new Date(), 'yyyy-MM-dd'),
  });
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchEmployees();
    fetchTasks();
  }, [currentUser]);

  const fetchEmployees = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'employees'));
      const employeeList: Employee[] = [];
      querySnapshot.forEach((doc) => {
        employeeList.push({ id: doc.id, ...doc.data() } as Employee);
      });
      setEmployees(employeeList);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchTasks = () => {
    try {
      if (currentUser?.role === 'employee') {
        const unsubscribe = subscribeAssignedTasks(
          currentUser.uid,
          (list) => { setTasks(list); setLoading(false); },
          async () => {
            const list = await fetchAssignedTasksFallback(currentUser.uid);
            setTasks(list);
            setLoading(false);
          }
        );
        return unsubscribe;
      } else {
        const tasksQuery = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
          const taskList: Task[] = [];
          snapshot.forEach((doc) => {
            taskList.push({
              id: doc.id,
              ...doc.data(),
              dueDate: doc.data().dueDate?.toDate(),
              createdAt: doc.data().createdAt?.toDate(),
              updatedAt: doc.data().updatedAt?.toDate(),
            } as Task);
          });
          setTasks(taskList);
          setLoading(false);
        });
        return unsubscribe;
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to fetch tasks');
      setLoading(false);
    }
  };

  const uploadAttachments = async (files: File[]): Promise<string[]> => {
    return uploadManyToCloudinary(files, { folder: 'task-attachments' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.assignedTo) {
      toast.error('Please select an employee');
      return;
    }

    setUploading(true);

    try {
      let attachmentUrls: string[] = [];
      
      if (attachmentFiles.length > 0) {
        attachmentUrls = await uploadAttachments(attachmentFiles);
      }

      const assignedEmployee = employees.find(emp => emp.id === formData.assignedTo);

      // Resolve Firebase Auth user uid for the selected employee (by email)
      let assignedToUid = '';
      try {
        if (assignedEmployee?.userUid) {
          assignedToUid = assignedEmployee.userUid;
        } else if (assignedEmployee?.email) {
          const userQuery = query(collection(db, 'users'), where('email', '==', assignedEmployee.email));
          const userSnap = await getDocs(userQuery);
          const userDoc = userSnap.docs[0];
          if (userDoc) {
            assignedToUid = userDoc.id;
          }
        }
      } catch (e) {
        console.warn('Could not resolve user uid for employee; falling back to employee id');
      }
      
      const taskData = {
        ...formData,
        assignedTo: assignedToUid || formData.assignedTo,
        assignedToName: assignedEmployee?.name || '',
        assignedBy: currentUser?.uid || '',
        assignedByName: currentUser?.displayName || '',
        dueDate: new Date(formData.dueDate),
        attachments: [...(editingTask?.attachments || []), ...attachmentUrls],
        updatedAt: new Date(),
      };

      if (editingTask) {
        await updateDoc(doc(db, 'tasks', editingTask.id), taskData);
        toast.success('Task updated successfully');
      } else {
        await createTaskForEmployee(
          { uid: currentUser?.uid || '', displayName: currentUser?.displayName || '', email: currentUser?.email || '', role: currentUser?.role as any, createdAt: new Date(), updatedAt: new Date() },
          {
            title: formData.title,
            description: formData.description,
            assignedEmployeeId: formData.assignedTo,
            priority: formData.priority,
            dueDate: new Date(formData.dueDate),
            attachments: attachmentUrls,
          }
        );
        toast.success('Task created successfully');
      }

      setShowModal(false);
      setEditingTask(null);
      setAttachmentFiles([]);
      setFormData({
        title: '',
        description: '',
        assignedTo: '',
        priority: 'medium',
        dueDate: format(new Date(), 'yyyy-MM-dd'),
      });
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('Failed to save task');
    } finally {
      setUploading(false);
    }
  };

  const handleStatusUpdate = async (taskId: string, newStatus: 'pending' | 'in-progress' | 'completed') => {
    try {
      const targetTask = tasks.find(t => t.id === taskId);
      if (targetTask?.status === 'completed') {
        toast('This task is locked and cannot be changed', { icon: '🔒' });
        return;
      }
      await updateDoc(doc(db, 'tasks', taskId), {
        status: newStatus,
        updatedAt: new Date(),
      });
      toast.success('Task status updated');
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error('Failed to update task status');
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      assignedTo: task.assignedTo,
      priority: task.priority,
      dueDate: format(new Date(task.dueDate), 'yyyy-MM-dd'),
    });
    setShowModal(true);
  };

  const handleDelete = async (taskId: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteDoc(doc(db, 'tasks', taskId));
        toast.success('Task deleted successfully');
      } catch (error) {
        console.error('Error deleting task:', error);
        toast.error('Failed to delete task');
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in-progress':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  // obsolete label helpers (replaced by Badge)

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.assignedToName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const statusCounts = {
    all: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };

  if (loading) {
    return <LoadingSpinner className="h-64" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        subtitle="Dense overview of all assignments"
        actions={(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary"
          >
            <span className="inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Create Task</span>
          </button>
        )}
      />

      {/* Tabs + Filters */}
      <GlassCard className="p-4">
        <Tabs
          tabs={[
            { key: 'all', label: 'All Tasks', count: statusCounts.all },
            { key: 'pending', label: 'Todo', count: statusCounts.pending },
            { key: 'in-progress', label: 'In Progress', count: statusCounts.inProgress },
            { key: 'completed', label: 'Done', count: statusCounts.completed },
          ]}
          active={statusFilter}
          onChange={(k) => setStatusFilter(k)}
        />
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/30 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500"
            />
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/30 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
          >
            <option value="all">All Priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
            <Filter className="w-4 h-4 mr-2" />
            {filteredTasks.length} tasks found
          </div>
        </div>
      </GlassCard>

      {/* Dense list */}
      <GlassCard className="p-0">
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {filteredTasks.map((task) => (
            <div key={task.id} className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(task.status)}
                    <h3 className="truncate font-semibold text-gray-900 dark:text-white">{task.title}</h3>
                    {isPast(new Date(task.dueDate)) && task.status !== 'completed' && (
                      <Badge color="red">Overdue</Badge>
                    )}
                    <Badge color={task.priority === 'high' ? 'red' : task.priority === 'medium' ? 'yellow' : 'green'}>
                      {task.priority}
                    </Badge>
                    <Badge color={task.status === 'completed' ? 'green' : task.status === 'in-progress' ? 'yellow' : 'red'}>
                      {task.status.replace('-', ' ')}
                    </Badge>
                    {task.status === 'completed' && <Lock className="w-3 h-3 text-gray-500" />}
                  </div>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{task.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>Assigned to <span className="font-medium text-gray-900 dark:text-white">{task.assignedToName}</span></span>
                    <span>Due {format(new Date(task.dueDate), 'MMM dd, yyyy')}</span>
                    {task.attachments.length > 0 && (
                      <span className="inline-flex items-center gap-1"><Paperclip className="w-3 h-3" /> {task.attachments.length} attachment{task.attachments.length > 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  {currentUser?.uid === task.assignedTo && task.status !== 'completed' && (
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusUpdate(task.id, e.target.value as 'pending' | 'in-progress' | 'completed')}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white/50 dark:bg-black/30"
                    >
                      <option value="pending">Pending</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  )}

                  {(currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentUser?.uid === task.assignedBy) && task.status !== 'completed' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(task)} className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 inline-flex items-center gap-1">
                        <Edit className="w-4 h-4" /> Edit
                      </button>
                      <button onClick={() => handleDelete(task.id)} className="px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 inline-flex items-center gap-1">
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {filteredTasks.length === 0 && (
        <div className="text-center py-12">
          <ClipboardList className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-xl text-gray-500 dark:text-gray-400">No tasks found</p>
          <p className="text-gray-400 dark:text-gray-500">
            {currentUser?.role === 'employee' 
              ? "You don't have any tasks assigned yet."
              : "Create your first task to get started."
            }
          </p>
        </div>
      )}

      {/* Task Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-black/50" onClick={() => setShowModal(false)} />
            
            <div className="relative inline-block w-full max-w-2xl px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-lg shadow-xl sm:my-8 sm:align-middle sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingTask ? 'Edit Task' : 'Create New Task'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/30 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/30 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                    rows={4}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Assign to *
                    </label>
                    <select
                      value={formData.assignedTo}
                      onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/30 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                      required
                    >
                      <option value="">Select Employee</option>
                      {employees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Priority *
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/30 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                      required
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Due Date *
                    </label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/30 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Attachments (Optional)
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="file"
                      multiple
                      onChange={(e) => setAttachmentFiles(Array.from(e.target.files || []))}
                      className="hidden"
                      id="attachment-upload"
                    />
                    <label
                      htmlFor="attachment-upload"
                      className="cursor-pointer bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center space-x-2"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Choose Files</span>
                    </label>
                    {attachmentFiles.length > 0 && (
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {attachmentFiles.length} file{attachmentFiles.length > 1 ? 's' : ''} selected
                      </span>
                    )}
                  </div>
                  {attachmentFiles.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {attachmentFiles.map((file, index) => (
                        <div key={index} className="text-sm text-gray-600 dark:text-gray-400">
                          {file.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    {uploading ? <LoadingSpinner size="sm" /> : <span>{editingTask ? 'Update' : 'Create'} Task</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;