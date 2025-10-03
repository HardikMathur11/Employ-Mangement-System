import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Employee } from '../types';
import { Users, ChevronDown, ChevronRight, Building, Mail, Phone, User } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import LoadingSpinner from '../components/LoadingSpinner';

interface OrgNode extends Employee {
  children: OrgNode[];
}

const Organization: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [orgChart, setOrgChart] = useState<OrgNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [departments, setDepartments] = useState<string[]>([]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (employees.length > 0) {
      buildOrgChart();
    }
  }, [employees, selectedDepartment]);

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
      
      // Extract unique departments
      const uniqueDepts = [...new Set(employeeList.map(emp => emp.department))];
      setDepartments(uniqueDepts);
      
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildOrgChart = () => {
    let filteredEmployees = employees;
    
    if (selectedDepartment !== 'all') {
      filteredEmployees = employees.filter(emp => emp.department === selectedDepartment);
    }

    // Create a map for quick lookup
    const employeeMap = new Map<string, OrgNode>();
    filteredEmployees.forEach(emp => {
      employeeMap.set(emp.id, { ...emp, children: [] });
    });

    // Find root nodes (employees without managers or whose managers are not in filtered list)
    const rootNodes: OrgNode[] = [];
    const childNodes = new Set<string>();

    filteredEmployees.forEach(emp => {
      if (!emp.managerId || !employeeMap.has(emp.managerId)) {
        const node = employeeMap.get(emp.id);
        if (node) {
          rootNodes.push(node);
        }
      } else {
        const manager = employeeMap.get(emp.managerId);
        const employee = employeeMap.get(emp.id);
        if (manager && employee) {
          manager.children.push(employee);
          childNodes.add(emp.id);
        }
      }
    });

    // Sort by role priority (admin -> manager -> employee)
    const roleOrder = { admin: 0, manager: 1, employee: 2 };
    const sortNodes = (nodes: OrgNode[]) => {
      nodes.sort((a, b) => {
        const roleComparison = roleOrder[a.role] - roleOrder[b.role];
        if (roleComparison !== 0) return roleComparison;
        return a.name.localeCompare(b.name);
      });
      
      nodes.forEach(node => {
        if (node.children.length > 0) {
          sortNodes(node.children);
        }
      });
    };

    sortNodes(rootNodes);
    setOrgChart(rootNodes);
  };

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Building className="w-4 h-4 text-red-600" />;
      case 'manager':
        return <Users className="w-4 h-4 text-blue-600" />;
      default:
        return <User className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'manager':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const renderOrgNode = (node: OrgNode, level: number = 0) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);

    return (
      <div key={node.id} className={`ml-${level * 6}`}>
        <GlassCard className="p-4 mb-4 hover:shadow-lg transition-all duration-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3 flex-1">
              {hasChildren && (
                <button
                  onClick={() => toggleNode(node.id)}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  )}
                </button>
              )}
              
              <img
                src={node.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(node.name)}&background=random`}
                alt={node.name}
                className="w-12 h-12 rounded-full object-cover"
              />
              
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  {getRoleIcon(node.role)}
                  <h3 className="font-semibold text-gray-900 dark:text-white">{node.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(node.role)}`}>
                    {node.role}
                  </span>
                </div>
                
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{node.designation}</p>
                
                <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Mail className="w-3 h-3" />
                    <span>{node.email}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Phone className="w-3 h-3" />
                    <span>{node.contact}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Building className="w-3 h-3" />
                    <span>{node.department}</span>
                  </div>
                </div>
                
                {hasChildren && (
                  <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                    {node.children.length} direct report{node.children.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          </div>
        </GlassCard>

        {hasChildren && isExpanded && (
          <div className="ml-4 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
            {node.children.map(child => renderOrgNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const stats = {
    totalEmployees: employees.length,
    admins: employees.filter(emp => emp.role === 'admin').length,
    managers: employees.filter(emp => emp.role === 'manager').length,
    employees: employees.filter(emp => emp.role === 'employee').length,
    departments: departments.length,
  };

  if (loading) {
    return <LoadingSpinner className="h-64" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Organization Chart</h1>
          <p className="text-gray-600 dark:text-gray-400">View your organization structure</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-6">
        <GlassCard className="p-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-2">
              <Users className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalEmployees}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-2">
              <Building className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.admins}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Admins</p>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-2">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.managers}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Managers</p>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-2">
              <User className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.employees}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Employees</p>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900 rounded-full flex items-center justify-center mx-auto mb-2">
              <Building className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            </div>
            <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">{stats.departments}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Departments</p>
          </div>
        </GlassCard>
      </div>

      {/* Department Filter */}
      <GlassCard className="p-4">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Filter by Department:
          </label>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/50 dark:bg-black/30 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setExpandedNodes(new Set(employees.map(emp => emp.id)))}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Expand All
            </button>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <button
              onClick={() => setExpandedNodes(new Set())}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Collapse All
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Organization Chart */}
      <div className="space-y-4">
        {orgChart.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl text-gray-500 dark:text-gray-400">No employees found</p>
            <p className="text-gray-400 dark:text-gray-500">
              {selectedDepartment !== 'all' 
                ? `No employees found in ${selectedDepartment} department.`
                : "Add employees to see the organization chart."
              }
            </p>
          </div>
        ) : (
          <div>
            {orgChart.map(node => renderOrgNode(node))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Organization;