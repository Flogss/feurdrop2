import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Separator,
} from '@/components/ui';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead, TableCaption } from '@/components/ui/table';
import { UserPlus, Users, Trash2, Check, Edit, DollarSign, Calendar, RefreshCw } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';

// API service
const api = {
  getUsers: () => fetch('/api/users').then(res => res.json()),
  getUserStats: (userId) => fetch(`/api/users/${userId}/stats`).then(res => res.json()),
  createUser: (data) => fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(res => res.json()),
  updateUser: (id, data) => fetch(`/api/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(res => res.json()),
  deleteUser: (id) => fetch(`/api/users/${id}`, { method: 'DELETE' }).then(res => res.json()),
};

export default function Users() {
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const { register, handleSubmit, reset } = useForm({ defaultValues: { name: '', description: '', price_per_label: 4.0, summary_notifications: true } });

  // Queries
  const { data: users = [], isLoading: usersLoading } = useQuery(['users'], api.getUsers);

  // Mutations
  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      setShowForm(false);
      reset();
      toast.success('User created successfully!');
    },
    onError: (error) => {
      toast.error(`Create failed: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowForm(false);
      toast.success('User updated successfully!');
    },
    onError: (error) => {
      toast.error(`Update failed: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success('User deleted successfully!');
    },
    onError: (error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });

  const handleSubmitCreate = (data) => {
    createMutation.mutate(data);
  };

  const handleSubmitUpdate = (data) => {
    if (selectedUserId) {
      updateMutation.mutate({ id: selectedUserId, data });
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this user? This will also delete all their labels.')) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (user) => {
    setSelectedUserId(user.id);
    setShowForm(true);
    reset({
      name: user.name || '',
      description: user.description || '',
      price_per_label: user.price_per_label || 4.0,
      summary_notifications: user.summary_notifications,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Users Management</h1>
          <p className="text-muted-foreground">Manage boxeurs and their settings</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              setSelectedUserId(null);
              setShowForm(true);
              reset();
            }}
            className="btn btn-primary btn-lg flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" /> Add New User
          </button>
          <button
            onClick={() => {
              // Refresh users
              queryClient.invalidateQueries({ queryKey: ['users'] });
            }}
            className="btn btn-outline btn-lg flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {/* User Form */}
      {showForm && (
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <h2 className="text-lg font-semibold">
              {selectedUserId ? 'Edit User' : 'Add New User'}
            </h2>
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => {
                setShowForm(false);
                reset();
              }}>
                <X className="h-4 w-4" /> Cancel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(selectedUserId ? handleSubmitUpdate : handleSubmitCreate)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2">Name</Label>
                  <Input
                    {...register('name', {
                      required: 'Name is required',
                    })}
                    placeholder="Enter user name"
                    className="input input-bordered w-full"
                  />
                </div>
                <div>
                  <Label className="mb-2">Telegram Username</Label>
                  <Input
                    {...register('telegram_username', {
                      required: 'Telegram username is required',
                    })}
                    placeholder="Enter telegram username (without @)"
                    className="input input-bordered w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2">Description</Label>
                  <Input
                    {...register('description')}
                    placeholder="Enter description (optional)"
                    className="input input-bordered w-full"
                  />
                </div>
                <div>
                  <Label className="mb-2">Price per Label (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('price_per_label', {
                      valueAsNumber: true,
                      required: 'Price is required',
                      min: 0,
                    })}
                    placeholder="4.00"
                    className="input input-bordered w-full"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="notifications"
                  {...register('summary_notifications')}
                  className="checkbox checkbox-primary"
                />
                <Label htmlFor="notifications" className="text-sm font-medium">
                  Enable summary notifications
                </Label>
              </div>

              <div className="flex justify-end pt-4 space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    reset();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={selectedUserId ? updateMutation.isLoading : createMutation.isLoading}
                  className="btn btn-primary"
                >
                  {selectedUserId ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Update User
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create User
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader className="pb-4">
          <h2 className="text-lg font-semibold">Users List</h2>
          <p className="text-sm text-muted-foreground">
            {users.length} user{users.length !== 1 ? 's' : ''} registered
          </p>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="text-center py-8">
              <Loading2 className="h-6 w-6 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No users found</p>
              <button
                onClick={() => {
                  setSelectedUserId(null);
                  setShowForm(true);
                  reset();
                }}
                className="btn btn-primary mt-4"
              >
                <UserPlus className="h-4 w-4 mr-2" /> Add First User
              </button>
            </div>
          ) : (
            <Table>
              <TableCaption>
                User records
              </TableCaption>
              <TableHeader>
                <Tr>
                  <Th>Telegram Username</Th>
                  <Th>Name</Th>
                  <Th>Description</Th>
                  <Th>Price/Label (€)</Th>
                  <Th>Labels Count</Th>
                  <Th>Earnings (€)</Th>
                  <Th>Notifications</Th>
                  <Th>Actions</Th>
                </Tr>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/50>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <User className="h-4 w-4 text-primary" />
                        <span className="font-medium">@{user.telegram_username}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.name || <span className="text-muted-foreground">Not set</span>}
                    </TableCell>
                    <TableCell className="max-w-32">
                      {user.description || <span className="text-muted-foreground">Not set</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      {user.price_per_label?.toFixed(2) || '4.00'}
                    </TableCell>
                    <TableCell className="text-right">
                      {/* This would come from a separate stats query in a real app */}
                      <span className="text-muted-foreground">-</span>
                    </TableCell>
                    <TableCell className="text-right">
                      {/* This would come from a separate stats query in a real app */}
                      <span className="text-muted-foreground">-</span>
                    </TableCell>
                    <TableCell className="text-center">
                      {user.summary_notifications ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <X className="h-4 w-4 text-error" />
                      )}
                    </TableCell>
                    <TableCell className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="btn btn-outline btn-sm"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="btn btn-error btn-sm"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}