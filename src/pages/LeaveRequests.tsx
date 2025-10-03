import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, getDocs, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { LeaveRequest } from '../types';
import { Plus, Calendar, Clock, Check, X, Filter, Search } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { format, differenceInDays } from 'date-fns';

const LeaveRequests: React.FC = () => {
  const { currentUser } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    type: 'vacation' as 'sick' | 'vacation' | 'personal' | 'emergency',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    reason: 'Personal Leave',
  });

  useEffect(() => {
    const fetchLeaveRequests = () => {
      try {
        let leaveQuery;
        
        if (currentUser?.role === 'employee') {
          leaveQuery = query(
            collection(db, 'leaveRequests'),
            where('employeeId', '==', currentUser.uid),
            orderBy('appliedAt', 'desc')
          );
        } else {
          leaveQuery = query(
            collection(db, 'leaveRequests'),
            orderBy('appliedAt', 'desc')
          );
        }

        const unsubscribe = onSnapshot(leaveQuery, (snapshot) => {
          const requests: LeaveRequest[] = [];
          snapshot.forEach((doc) => {
            requests.push({
              id: doc.id,
              ...doc.data(),
              startDate: doc.data().startDate?.toDate(),
              endDate: doc.data().endDate?.toDate(),
              appliedAt: doc.data().appliedAt?.toDate(),
              reviewedAt: doc.data().reviewedAt?.toDate(),
            } as LeaveRequest);
          });
          setLeaveRequests(requests);
          setLoading(false);
        });

        return unsubscribe;
      } catch (error) {
        console.error('Error fetching leave requests:', error);
        toast.error('Failed to fetch leave requests');
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchLeaveRequests();
    }
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) return;

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      toast.error('End date must be after start date');
      return;
    }

    try {
      const reason = (formData.reason && formData.reason.trim()) ? formData.reason.trim() : 'Personal Leave';
      await addDoc(collection(db, 'leaveRequests'), {
        ...formData,
        reason,
        employeeId: currentUser.uid,
        employeeName: currentUser.displayName,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        status: 'pending',
        appliedAt: new Date(),
      });

      toast.success('Leave request submitted successfully');
      setShowModal(false);
      setFormData({
        type: 'vacation',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
        reason: 'Personal Leave',
      });
    } catch (error) {
      console.error('Error submitting leave request:', error);
      toast.error('Failed to submit leave request');
    }
  };

  const handleStatusUpdate = async (requestId: string, newStatus: 'approved' | 'rejected', notes?: string) => {
    if (!currentUser) return;

    try {
      const updateData: any = {
        status: newStatus,
        approvedBy: currentUser.uid,
        approverName: currentUser.displayName,
        reviewedAt: new Date(),
      };

      if (notes) {
        updateData.notes = notes;
      }

      await updateDoc(doc(db, 'leaveRequests', requestId), updateData);

      // Send notification to employee
      const request = leaveRequests.find(req => req.id === requestId);
      if (request) {
        await addDoc(collection(db, 'notifications'), {
          userId: request.employeeId,
          title: `Leave Request ${newStatus === 'approved' ? 'Approved' : 'Rejected'}`,
          message: `Your ${request.type} leave request from ${format(new Date(request.startDate), 'MMM dd')} to ${format(new Date(request.endDate), 'MMM dd')} has been ${newStatus}.`,
          type: 'leave',
          isRead: false,
          createdAt: new Date(),
          data: { requestId, status: newStatus }
        });
      }

      toast.success(`Leave request ${newStatus} successfully`);
    } catch (error) {
      console.error('Error updating leave request:', error);
      toast.error('Failed to update leave request');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'sick':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'vacation':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'personal':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'emergency':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const filteredRequests = leaveRequests.filter(request => {
    const matchesSearch = request.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.reason.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: leaveRequests.length,
    pending: leaveRequests.filter(req => req.status === 'pending').length,
    approved: leaveRequests.filter(req => req.status === 'approved').length,
    rejected: leaveRequests.filter(req => req.status === 'rejected').length,
  };

  if (loading) {
    return <LoadingSpinner className="h-64" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Requests"
        subtitle={currentUser?.role === 'employee' ? 'Manage your leave requests' : 'Review and approve leave requests'}
        actions={currentUser?.role === 'employee' && (
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <span className="inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Request Leave</span>
          </button>
        )}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Requests</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <Calendar className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Approved</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.approved}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Rejected</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.rejected}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
              <X className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/30 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/30 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
            <Filter className="w-4 h-4 mr-2" />
            {filteredRequests.length} requests found
          </div>
        </div>
      </GlassCard>

      {/* Leave Requests */}
      <div className="space-y-4">
        {filteredRequests.map((request) => {
          const daysDiff = differenceInDays(new Date(request.endDate), new Date(request.startDate)) + 1;
          
          return (
            <GlassCard key={request.id} className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {request.employeeName}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">{request.reason}</p>
                    </div>
                    <div className="flex space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(request.type)}`}>
                        {request.type}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {daysDiff} day{daysDiff > 1 ? 's' : ''}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">From - To:</span>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {format(new Date(request.startDate), 'MMM dd')} - {format(new Date(request.endDate), 'MMM dd, yyyy')}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Applied:</span>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {format(new Date(request.appliedAt), 'MMM dd, yyyy')}
                      </div>
                    </div>
                  </div>

                  {request.notes && (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Notes: </span>
                      <span className="text-sm text-gray-900 dark:text-white">{request.notes}</span>
                    </div>
                  )}

                  {request.reviewedAt && (
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      Reviewed by {request.approverName} on {format(new Date(request.reviewedAt), 'MMM dd, yyyy')}
                    </div>
                  )}
                </div>

                {/* Actions for admin/manager */}
                {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && request.status === 'pending' && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleStatusUpdate(request.id, 'approved')}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-1"
                    >
                      <Check className="w-4 h-4" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => {
                        const notes = window.prompt('Reason for rejection (optional):');
                        handleStatusUpdate(request.id, 'rejected', notes || undefined);
                      }}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-1"
                    >
                      <X className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                  </div>
                )}
              </div>
            </GlassCard>
          );
        })}
      </div>

      {filteredRequests.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-xl text-gray-500 dark:text-gray-400">No leave requests found</p>
          <p className="text-gray-400 dark:text-gray-500">
            {currentUser?.role === 'employee' ? "You haven't submitted any leave requests yet." : "No leave requests to review."}
          </p>
        </div>
      )}

      {/* Leave Request Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-black/50" onClick={() => setShowModal(false)} />
            
            <div className="relative inline-block w-full max-w-md px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-lg shadow-xl sm:my-8 sm:align-middle sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Request Leave
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
                    Leave Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'sick' | 'vacation' | 'personal' | 'emergency' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/30 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                    required
                  >
                    <option value="vacation">Vacation</option>
                    <option value="sick">Sick Leave</option>
                    <option value="personal">Personal</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/30 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/30 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Reason *
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    onBlur={() => {
                      const next = (formData.reason && formData.reason.trim()) ? formData.reason.trim() : 'Personal Leave';
                      if (next !== formData.reason) {
                        setFormData({ ...formData, reason: next });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/30 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                    rows={4}
                    placeholder="Please provide a reason for your leave request..."
                    required
                  />
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
                  >
                    Submit Request
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

export default LeaveRequests;