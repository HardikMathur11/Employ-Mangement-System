import React, { useState } from 'react';
import { updateProfile } from 'firebase/auth';
// Cloudinary upload
import { uploadToCloudinary } from '../utils/cloudinary';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { User, Mail, Calendar, Save, Camera, Phone, Briefcase, Building2, MapPin, FileText } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const Profile: React.FC = () => {
  const { currentUser, firebaseUser, updateUserProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    displayName: currentUser?.displayName || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    designation: currentUser?.designation || '',
    department: currentUser?.department || '',
    address: currentUser?.address || '',
    bio: currentUser?.bio || '',
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const uploadPhoto = async (file: File): Promise<string> => {
    return uploadToCloudinary(file, { folder: 'profile-photos' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !firebaseUser) return;

    setLoading(true);
    
    try {
      let photoURL = currentUser.photoURL;
      
      // Upload new photo if selected
      if (photoFile) {
        photoURL = await uploadPhoto(photoFile);
      }

      // Update Firebase Auth profile
      await updateProfile(firebaseUser, {
        displayName: formData.displayName,
        photoURL,
      });

      // Update Firestore user document
      await updateDoc(doc(db, 'users', currentUser.uid), {
        displayName: formData.displayName,
        photoURL,
        phone: formData.phone,
        designation: formData.designation,
        department: formData.department,
        address: formData.address,
        bio: formData.bio,
        updatedAt: new Date(),
      });

      // Update context
      await updateUserProfile({
        displayName: formData.displayName,
        photoURL,
        phone: formData.phone,
        designation: formData.designation,
        department: formData.department,
        address: formData.address,
        bio: formData.bio,
      });

      toast.success('Profile updated successfully!');
      setPhotoFile(null);
      setPreviewUrl(null);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const toJsDate = (value: any): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'object' && typeof value.toDate === 'function') {
      try { return value.toDate(); } catch { return null; }
    }
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  if (!currentUser) {
    return <LoadingSpinner className="h-64" />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">Update your personal information</p>
      </div>

      {/* Profile Card */}
      <GlassCard className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Photo */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <img
                src={previewUrl || currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || 'User')}&background=random&size=128`}
                alt={currentUser.displayName}
                className="w-32 h-32 rounded-full object-cover border-4 border-white/20 shadow-lg"
              />
              <label
                htmlFor="photo-upload"
                className="absolute bottom-2 right-2 bg-brand-600 text-white p-2 rounded-full cursor-pointer hover:bg-brand-700 transition-colors shadow-lg"
              >
                <Camera className="w-4 h-4" />
              </label>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {currentUser.displayName}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 capitalize">
                {currentUser.role}
              </p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  id="displayName"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/30 backdrop-blur-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/30 backdrop-blur-sm text-gray-500 dark:text-gray-400"
                  disabled
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Email cannot be changed
              </p>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/30 backdrop-blur-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="designation" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Designation
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    id="designation"
                    name="designation"
                    value={formData.designation}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/30 backdrop-blur-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Department
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/30 backdrop-blur-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Address
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows={3}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/30 backdrop-blur-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Bio
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={4}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/30 backdrop-blur-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white"
                  placeholder="Tell us a little about yourself"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-6">
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 px-4 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </GlassCard>

      {/* Account Information */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Account Information
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Role</span>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              currentUser.role === 'admin' 
                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                : currentUser.role === 'manager'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
            } capitalize`}>
              {currentUser.role}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Member Since</span>
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {(() => { const d = toJsDate(currentUser.createdAt); return d ? format(d, 'MMM dd, yyyy') : '-'; })()}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Last Updated</span>
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {(() => { const d = toJsDate(currentUser.updatedAt); return d ? format(d, 'MMM dd, yyyy') : '-'; })()}
            </span>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

export default Profile;