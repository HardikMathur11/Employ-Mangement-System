# Employee Management System

A comprehensive Employee Management System built with React, TypeScript, Tailwind CSS, and Firebase. Features beautiful glassmorphism design with dark/light mode support and role-based access control.

## 🚀 Features

### Authentication & Security
- Firebase Authentication (Email/Password + Google Sign-In)
- Role-based access control (Admin, Manager, Employee)
- Protected routes with authentication guards
- Secure user profile management

### Employee Management
- Complete employee CRUD operations
- Employee profiles with photo uploads
- Department and role management
- Manager assignment and hierarchy
- Employee search and filtering

### Task Management
- Task creation with priority levels and due dates
- File attachments support
- Real-time task status updates
- Task assignment to employees
- Task filtering by status and priority

### Attendance Tracking
- Daily check-in/check-out system
- Calendar view with attendance history
- Monthly attendance statistics
- Automatic hours calculation

### Leave Management
- Leave request submission (Sick, Vacation, Personal, Emergency)
- Manager approval workflow
- Leave request tracking and history
- Real-time notifications

### Additional Features
- Organization chart visualization
- Real-time notifications system
- Document upload and management
- Dark/light mode toggle
- Responsive design for all devices
- Offline support with Firestore persistence

## 🛠 Tech Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS
- **Backend:** Firebase (Firestore, Auth, Storage)
- **UI/UX:** Glassmorphism design, Lucide React icons
- **State Management:** React Context API
- **Routing:** React Router v6
- **Date Handling:** date-fns
- **Notifications:** React Hot Toast
- **PDF Generation:** html2pdf.js, jsPDF

## 📁 Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── GlassCard.tsx    # Glassmorphism card component
│   ├── Layout.tsx       # Main layout with navigation
│   ├── LoadingSpinner.tsx
│   ├── NotificationCenter.tsx
│   └── ProtectedRoute.tsx
├── contexts/            # React Context providers
│   ├── AuthContext.tsx  # Authentication state
│   └── ThemeContext.tsx # Dark/light theme
├── pages/               # Application pages
│   ├── Dashboard.tsx
│   ├── Employees.tsx
│   ├── Tasks.tsx
│   ├── Attendance.tsx
│   ├── LeaveRequests.tsx
│   ├── Organization.tsx
│   ├── Profile.tsx
│   ├── Login.tsx
│   └── Register.tsx
├── config/              # Configuration files
│   └── firebase.ts      # Firebase configuration
├── types/               # TypeScript type definitions
│   └── index.ts
└── utils/               # Utility functions
```

## 🔧 Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Firebase account

### 1. Clone the Repository
```bash
git clone <repository-url>
cd employee-management-system
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing one
3. Enable Authentication:
   - Go to Authentication > Sign-in method
   - Enable Email/Password and Google providers
4. Create Firestore Database:
   - Go to Firestore Database > Create database
   - Start in production mode
5. Enable Storage:
   - Go to Storage > Get started
6. Get your Firebase configuration:
   - Go to Project Settings > General
   - Scroll down to "Your apps" and click the web icon
   - Copy the configuration object

### 4. Environment Variables

Create a `.env` file in the root directory:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 5. Firestore Security Rules

Set up the following Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Employees collection - admin and managers can manage
    match /employees/{employeeId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'manager']);
    }
    
    // Tasks collection
    match /tasks/{taskId} {
      allow read: if request.auth != null && (
        resource.data.assignedTo == request.auth.uid ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'manager']
      );
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'manager'];
      allow update: if request.auth != null && resource.data.assignedTo == request.auth.uid;
    }
    
    // Attendance collection
    match /attendance/{attendanceId} {
      allow read, write: if request.auth != null && resource.data.employeeId == request.auth.uid;
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'manager'];
    }
    
    // Leave requests
    match /leaveRequests/{requestId} {
      allow read, create: if request.auth != null;
      allow update: if request.auth != null && (
        resource.data.employeeId == request.auth.uid ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'manager']
      );
    }
    
    // Notifications
    match /notifications/{notificationId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
    }
  }
}
```

### 6. Storage Security Rules

Set up Firebase Storage security rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /profile-photos/{userId}-{timestamp} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /employee-photos/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.role in ['admin', 'manager']);
    }
    
    match /task-attachments/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 7. Run the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 🚀 Deployment

### Deploy to Vercel

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel --prod
```

4. Add environment variables in Vercel dashboard under Settings > Environment Variables

### Deploy to Netlify

1. Build the project:
```bash
npm run build
```

2. Deploy the `dist` folder to Netlify

3. Add environment variables in Netlify dashboard under Site settings > Environment variables

## 🎯 Usage

### Admin Role
- Manage all employees (add, edit, delete)
- View organization chart
- Access all sections and data
- Approve/reject leave requests
- Assign tasks to employees

### Manager Role
- View and manage assigned employees
- Create and assign tasks
- Approve/reject leave requests from team members
- View team attendance and performance

### Employee Role
- View and update own profile
- Clock in/out for attendance
- View assigned tasks and update status
- Submit leave requests
- Upload documents and files

## 🔒 Security Features

- Role-based access control with Firebase security rules
- Protected routes based on authentication and authorization
- Secure file uploads with type and size validation
- Real-time data synchronization with proper permissions
- Offline support with data persistence

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Firebase for backend services
- Tailwind CSS for styling
- Lucide React for icons
- React team for the amazing framework
- All contributors and testers

## 📞 Support

For support, email [your-email@example.com] or create an issue in this repository.