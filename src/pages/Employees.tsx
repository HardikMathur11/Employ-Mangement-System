import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';
import { uploadToCloudinary } from '../utils/cloudinary';
import { useAuth } from '../contexts/AuthContext';
import { Employee } from '../types';
import { Plus, CreditCard as Edit, Trash2, Search, User, Mail, Phone, Building, UserCheck, Calendar, Upload, X } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import LoadingSpinner from '../components/LoadingSpinner';
import PageHeader from '../components/PageHeader';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const Employees: React.FC = () => {
  const { currentUser } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [managers, setManagers] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contact: '',
    designation: '',
    department: '',
    managerId: '',
    role: 'employee' as 'admin' | 'manager' | 'employee',
    salary: '',
    address: '',
    joinDate: format(new Date(), 'yyyy-MM-dd'),
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchEmployees();
    fetchManagers();
  }, []);

  const fetchEmployees = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'employees'));
      const employeeList: Employee[] = [];
      querySnapshot.forEach((doc) => {
        employeeList.push({
          id: doc.id,
          ...doc.data(),
          joinDate: doc.data().joinDate?.toDate(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate(),
        } as Employee);
      });
      setEmployees(employeeList);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const fetchManagers = async () => {
    try {
      const managersQuery = query(
        collection(db, 'employees'),
        where('role', 'in', ['admin', 'manager'])
      );
      const querySnapshot = await getDocs(managersQuery);
      const managerList: Employee[] = [];
      querySnapshot.forEach((doc) => {
        managerList.push({ id: doc.id, ...doc.data() } as Employee);
      });
      setManagers(managerList);
    } catch (error) {
      console.error('Error fetching managers:', error);
    }
  };

  const uploadPhoto = async (file: File): Promise<string> => {
    return uploadToCloudinary(file, { folder: 'employee-photos' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      let photoURL = editingEmployee?.photoURL || '';
      
      if (photoFile) {
        photoURL = await uploadPhoto(photoFile);
      }

      const employeeData = {
        ...formData,
        salary: formData.salary ? parseFloat(formData.salary) : 0,
        joinDate: new Date(formData.joinDate),
        photoURL,
        managerName: formData.managerId ? managers.find(m => m.id === formData.managerId)?.name || '' : '',
        isActive: true,
        documents: editingEmployee?.documents || [],
        updatedAt: new Date(),
      };

      if (editingEmployee) {
        await updateDoc(doc(db, 'employees', editingEmployee.id), employeeData);
        toast.success('Employee updated successfully');
      } else {
        await addDoc(collection(db, 'employees'), {
          ...employeeData,
          createdAt: new Date(),
        });
        toast.success('Employee added successfully');
      }

      setShowModal(false);
      setEditingEmployee(null);
      setPhotoFile(null);
      setFormData({
        name: '',
        email: '',
        contact: '',
        designation: '',
        department: '',
        managerId: '',
        role: 'employee',
        salary: '',
        address: '',
        joinDate: format(new Date(), 'yyyy-MM-dd'),
      });
      fetchEmployees();
    } catch (error) {
      console.error('Error saving employee:', error);
      toast.error('Failed to save employee');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email,
      contact: employee.contact,
      designation: employee.designation,
      department: employee.department,
      managerId: employee.managerId || '',
      role: employee.role,
      salary: employee.salary?.toString() || '',
      address: employee.address || '',
      joinDate: format(new Date(employee.joinDate), 'yyyy-MM-dd'),
    });
    setShowModal(true);
  };

  const handleDelete = async (employeeId: string) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        await deleteDoc(doc(db, 'employees', employeeId));
        toast.success('Employee deleted successfully');
        fetchEmployees();
      } catch (error) {
        console.error('Error deleting employee:', error);
        toast.error('Failed to delete employee');
      }
    }
  };

  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <LoadingSpinner className="h-64" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        subtitle="Manage your team members"
        actions={
          <div className="flex items-center gap-2">
          {currentUser?.role === 'admin' && (
            <button
              onClick={async () => {
                try {
                  toast.loading('Syncing accounts...', { id: 'sync' });
                  const employeesSnap = await getDocs(collection(db, 'employees'));
                  for (const empDoc of employeesSnap.docs) {
                    const emp = empDoc.data() as any;
                    if (!emp.email) continue;
                    const usersSnap = await getDocs(query(collection(db, 'users'), where('email', '==', emp.email)));
                    const userDoc = usersSnap.docs[0];
                    if (!userDoc) continue;
                    const uid = userDoc.id;

                    const batch = writeBatch(db);
                    // Set employee.userUid if missing or different
                    if (emp.userUid !== uid) {
                      batch.update(empDoc.ref, { userUid: uid, updatedAt: new Date() });
                    }
                    // Migrate tasks assigned to employee doc id -> uid
                    const tasksSnap = await getDocs(query(collection(db, 'tasks'), where('assignedTo', '==', empDoc.id)));
                    tasksSnap.forEach((t) => batch.update(t.ref, { assignedTo: uid, updatedAt: new Date() }));
                    // Migrate notifications targeting employee doc id -> uid
                    const notifSnap = await getDocs(query(collection(db, 'notifications'), where('userId', '==', empDoc.id)));
                    notifSnap.forEach((n) => batch.update(n.ref, { userId: uid }));

                    await batch.commit();
                  }
                  toast.success('Sync complete', { id: 'sync' });
                  fetchEmployees();
                } catch (e) {
                  console.error('Sync error', e);
                  toast.error('Sync failed');
                }
              }}
              className="bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition"
            >
              Sync Accounts
            </button>
          )}
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary px-4 py-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Employee</span>
          </button>
          </div>
        }
      />

      {/* Search */}
      <GlassCard className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/30 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500"
          />
        </div>
      </GlassCard>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEmployees.map((employee) => (
          <GlassCard key={employee.id} className="p-6">
            <div className="flex items-center space-x-4 mb-4">
              <img
                src={employee.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.name)}&background=random`}
                alt={employee.name}
                className="w-16 h-16 rounded-full object-cover"
              />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{employee.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{employee.designation}</p>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                  employee.role === 'admin' 
                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    : employee.role === 'manager'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                }`}>
                  {employee.role}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                <Mail className="w-4 h-4" />
                <span>{employee.email}</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                <Phone className="w-4 h-4" />
                <span>{employee.contact}</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                <Building className="w-4 h-4" />
                <span>{employee.department}</span>
              </div>
              {employee.managerName && (
                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                  <UserCheck className="w-4 h-4" />
                  <span>Manager: {employee.managerName}</span>
                </div>
              )}
              <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                <Calendar className="w-4 h-4" />
                <span>Joined: {format(new Date(employee.joinDate), 'MMM dd, yyyy')}</span>
              </div>
            </div>

            {currentUser?.role === 'admin' && (
              <div className="flex space-x-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => handleEdit(employee)}
                  className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-1"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDelete(employee.id)}
                  className="flex-1 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-1"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </GlassCard>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-black/50" onClick={() => setShowModal(false)} />
            
            <div className="relative inline-block w-full max-w-2xl px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-lg shadow-xl sm:my-8 sm:align-middle sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingEmployee ? 'Edit Employee' : 'Add Employee'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/30 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/30 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Contact Number *
                    </label>
                    <input
                      type="tel"
                      value={formData.contact}
                      onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/30 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Designation *
                    </label>
                    <input
                      type="text"
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/30 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Department *
                    </label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/30 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Role *
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'manager' | 'employee' })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/30 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                      required
                    >
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Manager
                    </label>
                    <select
                      value={formData.managerId}
                      onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/30 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                    >
                      <option value="">Select Manager</option>
                      {managers.map((manager) => (
                        <option key={manager.id} value={manager.id}>
                          {manager.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Salary (Optional)
                    </label>
                    <input
                      type="number"
                      value={formData.salary}
                      onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/30 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                      placeholder="Enter salary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Join Date *
                    </label>
                    <input
                      type="date"
                      value={formData.joinDate}
                      onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/30 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Address (Optional)
                    </label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/30 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                      rows={2}
                      placeholder="Enter address"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Profile Photo (Optional)
                    </label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="photo-upload"
                      />
                      <label
                        htmlFor="photo-upload"
                        className="cursor-pointer bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center space-x-2"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Choose Photo</span>
                      </label>
                      {photoFile && (
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {photoFile.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    {uploading ? <LoadingSpinner size="sm" /> : <span>{editingEmployee ? 'Update' : 'Add'} Employee</span>}
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

export default Employees;