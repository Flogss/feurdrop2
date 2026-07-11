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
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead, TableCaption } from '@/components/ui/table';
import { UserPlus, FileText, Image, Trash2, Check, Printer, RefreshCw, Upload } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';

// API service
const api = {
  getLabels: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetch(`/api/labels?${query}`).then(res => res.json());
  },
  getUsers: () => fetch('/api/users').then(res => res.json()),
  uploadLabel: (data) => {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('telegramUsername', data.telegramUsername);
    formData.append('description', data.description || '');
    return fetch('/api/labels/upload', {
      method: 'POST',
      body: formData,
    }).then(res => res.json());
  },
  deleteLabel: (id) => fetch(`/api/labels/${id}`, { method: 'DELETE' }).then(res => res.json()),
  mergePdfs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetch(`/api/labels/print/merge?${query}`).then(res => {
      if (!res.ok) throw new Error('Failed to merge PDFs');
      return res.blob();
    });
  },
};

export default function Labels() {
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState(null);
  const { register, handleSubmit, reset } = useForm();

  // Queries
  const { data: labels = [], isLoading: labelsLoading, refetch: refetchLabels } = useQuery({
    queryKey: ['labels', selectedUserId],
    queryFn: () => api.getLabels(selectedUserId ? { user_id: selectedUserId } : {}),
  });

  const { data: users = [] } = useQuery(['users'], api.getUsers);

  // Mutations
  const uploadMutation = useMutation({
    mutationFn: uploadLabel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      reset();
      toast.success('Label uploaded successfully!');
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLabel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success('Label deleted successfully!');
    },
    onError: (error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });

  const mergeMutation = useMutation({
    mutationFn: mergePdfs,
    onSuccess: (data) => {
      // Create download link for merged PDF
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `merged_labels_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('PDFs merged and download started!');
    },
    onError: (error) => {
      toast.error(`Merge failed: ${error.message}`);
    },
  });

  const handleUpload = (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('file', uploadMutation.variables?.file);
    formData.append('telegramUsername', uploadMutation.variables?.telegramUsername || '');
    formData.append('description', uploadMutation.variables?.description || '');

    uploadMutation.mutate({
      file: uploadMutation.variables?.file,
      telegramUsername: uploadMutation.variables?.telegramUsername || '',
      description: uploadMutation.variables?.description || '',
    });
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this label?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleMerge = () => {
    const userId = selectedUserId;
    if (userId === null && labels.length === 0) {
      toast.error('No labels available to merge');
      return;
    }

    mergeMutation.mutate({ user_id: userId });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Labels Management</h1>
          <p className="text-muted-foreground">Manage and process shipping labels</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              // Open file picker
              document.getElementById('file-upload').click();
            }}
            className="btn btn-primary btn-lg flex items-center gap-2"
          >
            <Upload className="h-4 w-4" /> Upload Label
          </button>
          <button
            onClick={handleMerge}
            disabled={labels.length === 0}
            className="btn btn-secondary btn-lg flex items-center gap-2"
          >
            <Printer className="h-4 w-4" /> Print All
          </button>
          <button
            onClick={() => refetchLabels()}
            className="btn btn-outline btn-lg flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {/* File Upload (hidden) */}
      <input
        type="file"
        id="file-upload"
        accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.tiff"
        className="hidden"
        onChange={(e) => {
          if (e.target.files[0]) {
            uploadMutation.mutate({
              file: e.target.files[0],
              telegramUsername: '', // Will be filled from user selection or input
              description: '',
            });
          }
        }}
      />

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <h2 className="text-lg font-semibold">Filters</h2>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <Label className="mb-2">User</Label>
            <Select
              value={selectedUserId || null}
              onValueChange={(value) => setSelectedUserId(value === '' ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Users</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {@user.telegram_username || `@user${user.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2">Actions</Label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  // Clear filters
                  setSelectedUserId(null);
                  refetchLabels();
                }}
                className="btn btn-outline btn-sm"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Form */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <h2 className="text-lg font-semibold">Upload New Label</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="mb-2">Telegram Username</Label>
                <Input
                  {...register('telegramUsername', {
                    required: 'Telegram username is required',
                  })}
                  placeholder="Enter telegram username"
                  className="input input-bordered w-full"
                />
              </div>
              <div>
                <Label className="mb-2">Description (Optional)</Label>
                <Input
                  {...register('description')}
                  placeholder="Enter description"
                  className="input input-bordered w-full"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="file"
                  id="file-upload-2"
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.tiff"
                  {...register('file', {
                    required: 'File is required',
                  })}
                  className="hidden"
                />
                <div className="flex items-center space-x-2">
                  <Upload className="h-4 w-4" />
                  <span>Choose file</span>
                </div>
              </label>

              <button
                type="submit"
                disabled={uploadMutation.isLoading}
                className="btn btn-primary btn-lg flex-1 flex items-center justify-center gap-2"
              >
                {uploadMutation.isLoading ? (
                  <>
                    <Loading2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload Label
                  </>
                )}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Labels Table */}
      <Card>
        <CardHeader className="pb-4">
          <h2 className="text-lg font-semibold">Labels List</h2>
          <p className="text-sm text-muted-foreground">
            {labels.length} label{labels.length !== 1 ? 's' : ''} found
          </p>
        </CardHeader>
        <CardContent>
          {labelsLoading ? (
            <div className="text-center py-8">
              <Loading2 className="h-6 w-6 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading labels...</p>
            </div>
          ) : labels.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No labels found</p>
              <button
                onClick={() => {
                  document.getElementById('file-upload').click();
                }}
                className="btn btn-primary mt-4"
              >
                <Upload className="h-4 w-4 mr-2" /> Upload First Label
              </button>
            </div>
          ) : (
            <Table>
              <TableCaption>
                Label records
              </TableCaption>
              <TableHeader>
                <Tr>
                  <Th>File Name</Th>
                  <Th>Type</Th>
                  <Th>User</Th>
                  <Th>Uploaded</Th>
                  <Th>Actions</Th>
                </Tr>
              </TableHeader>
              <TableBody>
                {labels.map((label) => (
                  <TableRow key={label.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        {label.file_type === 'pdf' ? (
                          <FileText className="h-4 w-4 text-primary" />
                        ) : (
                          <Image className="h-4 w-4 text-primary" />
                        )}
                        <span className="font-medium">{label.file_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="badge badge-outline">
                        {label.file_type === 'pdf' ? 'PDF' : 'Image'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {label.user_name || (
                        <span className="text-muted-foreground">Unknown</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <time dateTime={label.uploaded_at}>
                        {new Date(label.uploaded_at).toLocaleString()}
                      </time>
                    </TableCell>
                    <TableCell className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleDelete(label.id)}
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