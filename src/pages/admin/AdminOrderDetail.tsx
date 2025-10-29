import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowPathIcon, ChevronLeftIcon } from '../../components/icons/Icons';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import {
  regenerateAdminOrderDownload,
  refreshAdminOrderStatus,
} from '../../services/admin/ordersService';
import { RegenerateDownloadDialog } from '../../components/admin/RegenerateDownloadDialog';
import { useToast } from '../../hooks/use-toast';
import { apiFetch } from '../../services/api';
import type { Order } from '../../types';

const fetchOrderDetail = async (taskId: string): Promise<Order> => {
  return await apiFetch(`/api/admin/orders/${taskId}`, { auth: true });
};

export default function AdminOrderDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const {
    data: order,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'orders', taskId],
    queryFn: () => fetchOrderDetail(taskId!),
    enabled: !!taskId,
    staleTime: 5000,
  });

  const handleRefreshStatus = async () => {
    if (!taskId) return;
    setIsRefreshing(true);
    try {
      await refreshAdminOrderStatus(taskId);
      await refetch();
      toast({
        title: 'Status Updated',
        description: `Successfully refreshed status for task ${taskId}`,
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as Error).message || 'Unable to refresh status.',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRegenerateSubmit = async (reason: string) => {
    if (!taskId) return;

    setIsRegenerating(true);
    try {
      const response = await regenerateAdminOrderDownload(taskId, reason);
      const downloadPayload = (response as { download?: Record<string, any> }).download ?? response;
      const downloadUrl =
        downloadPayload?.downloadLink ||
        downloadPayload?.url ||
        downloadPayload?.download_url ||
        downloadPayload?.link ||
        downloadPayload?.data?.downloadLink ||
        downloadPayload?.data?.download_url ||
        downloadPayload?.data?.url ||
        null;

      await refetch();
      setRegenerateDialogOpen(false);

      if (downloadUrl) {
        window.open(downloadUrl, '_blank', 'noopener,noreferrer');
        toast({
          title: 'Download Link Regenerated',
          description: 'Opening download link in new tab',
          variant: 'success',
        });
      } else {
        toast({
          title: 'Link Regenerated',
          description: 'Download link has been regenerated',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as Error).message || 'Unable to regenerate download link.',
        variant: 'destructive',
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ready':
        return 'success';
      case 'failed':
      case 'payment_failed':
        return 'destructive';
      case 'processing':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/admin/orders')} className="gap-2">
          <ChevronLeftIcon className="h-4 w-4" />
          Back to Orders
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-rose-400">{(error as Error)?.message || 'Order not found'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/admin/orders')} className="gap-2">
            <ChevronLeftIcon className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-semibold text-slate-50">Order Details</h2>
            <p className="text-sm text-slate-400 font-mono mt-1">{taskId}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshStatus}
            disabled={isRefreshing || order.status !== 'processing'}
            className="gap-2"
          >
            <ArrowPathIcon className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Status
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setRegenerateDialogOpen(true)}
            disabled={isRegenerating}
          >
            Regenerate Link
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Asset Information</CardTitle>
            <CardDescription>Details about the ordered asset</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.file_info?.preview && (
              <img
                src={order.file_info.preview}
                alt={order.file_info.title || order.file_info.name || 'Asset preview'}
                className="w-full rounded-lg object-cover max-h-64"
              />
            )}
            <div className="space-y-2">
              <div>
                <span className="text-sm text-slate-400">Title:</span>
                <p className="text-slate-100 font-medium">
                  {order.file_info?.title || order.file_info?.name || 'Untitled'}
                </p>
              </div>
              <div>
                <span className="text-sm text-slate-400">Source:</span>
                <p className="text-slate-100 uppercase font-mono">
                  {order.file_info?.site || 'Unknown'}
                </p>
              </div>
              {order.file_info?.author && (
                <div>
                  <span className="text-sm text-slate-400">Author:</span>
                  <p className="text-slate-100">{order.file_info.author}</p>
                </div>
              )}
              {order.file_info?.size && (
                <div>
                  <span className="text-sm text-slate-400">Size:</span>
                  <p className="text-slate-100">{order.file_info.size}</p>
                </div>
              )}
              {order.file_info?.type && (
                <div>
                  <span className="text-sm text-slate-400">Type:</span>
                  <p className="text-slate-100">{order.file_info.type}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Status</CardTitle>
              <CardDescription>Current order state and metadata</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Status:</span>
                <Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Task ID:</span>
                <code className="text-xs text-slate-300 font-mono">{order.task_id}</code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Created:</span>
                <span className="text-sm text-slate-300">
                  {new Date(order.created_at).toLocaleString()}
                </span>
              </div>
              {order.updated_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Updated:</span>
                  <span className="text-sm text-slate-300">
                    {new Date(order.updated_at).toLocaleString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
              <CardDescription>Order owner details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-sm text-slate-400">User ID:</span>
                <Link
                  to={`/admin/users/${order.user_id}`}
                  className="block text-blue-400 hover:text-blue-300 font-mono text-sm mt-1"
                >
                  {order.user_id}
                </Link>
              </div>
            </CardContent>
          </Card>

          {order.download_url && (
            <Card>
              <CardHeader>
                <CardTitle>Download Link</CardTitle>
                <CardDescription>Current download URL</CardDescription>
              </CardHeader>
              <CardContent>
                <a
                  href={order.download_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-400 hover:text-blue-300 break-all"
                >
                  {order.download_url}
                </a>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <RegenerateDownloadDialog
        open={regenerateDialogOpen}
        onOpenChange={setRegenerateDialogOpen}
        onSubmit={handleRegenerateSubmit}
        taskId={taskId || ''}
        isLoading={isRegenerating}
      />
    </div>
  );
}
