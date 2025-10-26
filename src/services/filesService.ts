import { supabase } from './supabaseClient';
import type { Order, StockFileInfo } from '../types';

/**
 * Creates a new order record in the database for a user.
 * If an order with the same task_id already exists, it updates it.
 * @param userId The ID of the user placing the order.
 * @param taskId The task ID received from the stock media API.
 * @param fileInfo The metadata of the file being ordered.
 * @returns The newly created or updated order record.
 */
export const createOrder = async (userId: string, taskId: string, fileInfo: StockFileInfo): Promise<Order> => {
  const { data, error } = await supabase
    .from('stock_order')
    .upsert({
      user_id: userId,
      task_id: taskId,
      file_info: fileInfo,
      status: 'processing',
      // Explicitly set the timestamp to "restart" the order on conflict.
      created_at: new Date().toISOString(),
      // Reset download_url in case this is a re-order of a previously completed task.
      download_url: null, 
    }, {
      onConflict: 'task_id',
    })
    .select()
    .single();

  if (error) {
    console.error("Error upserting order:", error);
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

/**
 * Finds the most recent successful order for a given stock file by a user.
 * @param userId The user's ID.
 * @param site The stock media site.
 * @param id The stock media ID.
 * @returns A promise that resolves to the order record or null if not found.
 */
export const findOrderBySiteAndId = async (userId: string, site: string, id: string): Promise<Order | null> => {
    const { data, error } = await supabase
        .from('stock_order')
        .select('*')
        .eq('user_id', userId)
        .eq('file_info->>site', site) // Querying inside JSONB
        .eq('file_info->>id', id)
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error("Error finding previous order:", error);
        // Don't throw, just return null as it's not a critical failure
        return null;
    }

    return data && data.length > 0 ? data[0] as Order : null;
}