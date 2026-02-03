import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Item {
  id: string;
  title: string;
  category: string;
  priority: string;
  created_at?: string;
}

export const useItems = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .order('id', { ascending: false });

      if (fetchError) throw fetchError;
      setItems(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch items');
    } finally {
      setLoading(false);
    }
  };

  const createItem = async (title: string, category: string, priority: string) => {
    try {
      setError(null);
      const { data, error: createError } = await supabase
        .from('tasks')
        .insert([{ title, category, priority }])
        .select()
        .single();

      if (createError) throw createError;
      if (data) {
        setItems((prev) => [data, ...prev]);
      }
      return { success: true, data };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create item';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const updateItem = async (id: string, title: string, category: string, priority: string) => {
    try {
      setError(null);
      const { data, error: updateError } = await supabase
        .from('tasks')
        .update({ title, category, priority })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      if (data) {
        setItems((prev) =>
          prev.map((item) => (item.id === id ? data : item))
        );
      }
      return { success: true, data };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update item';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const deleteItem = async (id: string) => {
    try {
      setError(null);
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      setItems((prev) => prev.filter((item) => item.id !== id));
      return { success: true };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete item';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const fetchHighPriorityTasks = async () => {
    try {
      setLoading(true);
      setError(null);
  
      const { data, error: fetchError } = await supabase
        .rpc('get_high_priority_tasks', { task_category: '' }); // call RPC
  
      if (fetchError) throw fetchError;
      setItems(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch items');
    } finally {
      setLoading(false);
    }
  };




  useEffect(() => {
    fetchItems();
  }, []);

  return {
    items,
    loading,
    error,
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
    fetchHighPriorityTasks,
  };
};

