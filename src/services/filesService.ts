import { supabase } from './supabaseClient';
import type { Order, StockFileInfo } from '../types';

/**
 * Creates a new order record in the database for a user.
 * @param userId The ID of the user placing the order.
 * @param taskId The task ID received from the stock media API.
 * @param fileInfo The metadata of the file being ordered.
 * @returns The newly created order record.
 */
export const createOrder = async (userId: string, taskId: string, fileInfo: StockFileInfo): Promise<Order> => {
  const { data, error } = await supabase
    .from('stock_order')
    .insert({
      user_id: userId,
      task_id: taskId,
      file_info: fileInfo,
      status: 'processing',
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating order:", error);
    throw new Error('Could not save the order to your account.');
  }
  return data as Order;
};


/**
 * Retrieves all orders for a specific user, sorted by creation date.
 * @param userId The ID of the user.
 * @returns A promise that resolves to an array of orders.
 */
export const getOrders = async (userId: string): Promise<Order[]> => {
    const { data, error } = await supabase
        .from('stock_order')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching orders:", error);
        throw new Error('Could not retrieve your file history.');
    }
    return data as Order[];
}


/**
 * Updates the status or other details of an existing order.
 * @param taskId The task ID of the order to update.
 * @param updates An object containing the fields to update (e.g., { status: 'ready' }).
 */
export const updateOrder = async (taskId: string, updates: Partial<Order>): Promise<void> => {
    const { error } = await supabase
        .from('stock_order')
        .update(updates)
        .eq('task_id', taskId);

    if (error) {
        console.error("Error updating order:", error);
        // We don't throw an error here to prevent a failed UI update from stopping the polling loop.
    }
}
