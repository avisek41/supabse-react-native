import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useItems, Item } from './hooks/useItems';
import { AuthScreen } from './screens/AuthScreen';
import { supabase } from './lib/supabase';

const PRIORITIES = ['High', 'Medium', 'Low'] as const;
type Priority = typeof PRIORITIES[number];

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const { items, loading, error, createItem, updateItem, deleteItem, fetchHighPriorityTasks, fetchItems } =
    useItems();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
        setUserEmail(session?.user?.email || null);
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      setUserEmail(session?.user?.email || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setIsAuthenticated(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to logout');
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !category.trim()) {
      Alert.alert('Error', 'Please fill in both title and category');
      return;
    }

    setIsSubmitting(true);
    let result;

    if (editingItem) {
      result = await updateItem(editingItem.id, title.trim(), category.trim(), priority);
    } else {
      result = await createItem(title.trim(), category.trim(), priority);
    }

    setIsSubmitting(false);

    if (result.success) {
      setTitle('');
      setCategory('');
      setPriority('Medium');
      setEditingItem(null);
    } else {
      Alert.alert('Error', result.error || 'Something went wrong');
    }
  };

  const handleEdit = (item: Item) => {
    setTitle(item.title);
    setCategory(item.category);
    setPriority(item.priority as Priority);
    setEditingItem(item);
  };

  const handleCancel = () => {
    setTitle('');
    setCategory('');
    setPriority('Medium');
    setEditingItem(null);
  };

  const handleDelete = (item: Item) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteItem(item.id);
            if (!result.success) {
              Alert.alert('Error', result.error || 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return '#dc2626';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const getPriorityBgColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return '#fee2e2';
      case 'medium':
        return '#fef3c7';
      case 'low':
        return '#d1fae5';
      default:
        return '#f3f4f6';
    }
  };

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <SafeAreaView style={styles.container} testID="app-container">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show auth screen if not authenticated
  if (!isAuthenticated) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  // Show main app if authenticated
  return (
    <SafeAreaView style={styles.container} testID="app-container">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>My Items</Text>
              <Text style={styles.headerSubtitle}>
                {editingItem ? 'Edit Item' : 'Create & Manage Items'}
              </Text>
              {userEmail && (
                <Text style={styles.userEmail} testID="user-email">
                  {userEmail}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              testID="logout-button"
            >
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          testID="items-scroll-view"
        >
          {/* Form Section */}
          <View style={styles.formContainer} testID="form-container">
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter item title"
                placeholderTextColor="#999"
                value={title}
                onChangeText={setTitle}
                testID="title-input"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Category</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Shopping, Work, Personal"
                placeholderTextColor="#999"
                value={category}
                onChangeText={setCategory}
                testID="category-input"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Priority</Text>
              <View style={styles.priorityContainer}>
                {PRIORITIES.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.priorityButton,
                      priority === p && [
                        styles.priorityButtonActive,
                        { backgroundColor: getPriorityBgColor(p) },
                      ],
                    ]}
                    onPress={() => setPriority(p)}
                    testID={`priority-button-${p.toLowerCase()}`}
                  >
                    <View
                      style={[
                        styles.priorityDot,
                        { backgroundColor: getPriorityColor(p) },
                      ]}
                    />
                    <Text
                      style={[
                        styles.priorityButtonText,
                        priority === p && { color: getPriorityColor(p) },
                      ]}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.buttonRow}>
              {editingItem && (
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={handleCancel}
                  testID="cancel-button"
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.submitButton,
                  isSubmitting && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={isSubmitting}
                testID="submit-button"
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {editingItem ? 'Update' : 'Create'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {error && (
              <View style={styles.errorContainer} testID="error-message">
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </View>

          {/* Items List Section */}
          <View style={styles.listContainer} testID="items-list-container">
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Items ({items.length})
              </Text>
              <View style={styles.filterButtons}>
                <TouchableOpacity
                  style={[styles.filterButton, styles.filterButtonSecondary]}
                  onPress={fetchItems}
                  testID="filter-all-button"
                >
                  <Text style={styles.filterButtonText}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterButton, styles.filterButtonPrimary]}
                  onPress={fetchHighPriorityTasks}
                  testID="filter-high-priority-button"
                >
                  <Text style={[styles.filterButtonText, styles.filterButtonTextPrimary]}>High Priority</Text>
                </TouchableOpacity>
              </View>
            </View>

            {loading && items.length === 0 ? (
              <View style={styles.loadingContainer} testID="loading-indicator">
                <ActivityIndicator size="large" color="#6366f1" />
                <Text style={styles.loadingText}>Loading items...</Text>
              </View>
            ) : items.length === 0 ? (
              <View style={styles.emptyContainer} testID="empty-state">
                <Text style={styles.emptyText}>No items yet</Text>
                <Text style={styles.emptySubtext}>
                  Create your first item above!
                </Text>
              </View>
            ) : (
              items.map((item) => (
                <View key={item.id} style={styles.itemCard} testID={`item-card-${item.id}`}>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemContent}>
                      <Text style={styles.itemTitle} testID={`item-title-${item.id}`}>
                        {item.title}
                      </Text>
                      {item.created_at && (
                        <Text style={styles.itemDate} testID={`item-date-${item.id}`}>
                          {formatDate(item.created_at)}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.itemMeta}>
                    <View style={styles.categoryBadge} testID={`item-category-${item.id}`}>
                      <Text style={styles.categoryText}>{item.category}</Text>
                    </View>
                    <View
                      style={[
                        styles.priorityBadge,
                        {
                          backgroundColor: getPriorityBgColor(item.priority),
                        },
                      ]}
                      testID={`item-priority-${item.id}`}
                    >
                      <View
                        style={[
                          styles.priorityDotSmall,
                          { backgroundColor: getPriorityColor(item.priority) },
                        ]}
                      />
                      <Text
                        style={[
                          styles.priorityText,
                          { color: getPriorityColor(item.priority) },
                        ]}
                      >
                        {item.priority}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.itemActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.editButton]}
                      onPress={() => handleEdit(item)}
                      testID={`edit-button-${item.id}`}
                    >
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDelete(item)}
                      testID={`delete-button-${item.id}`}
                    >
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default App;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#6366f1',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#e0e7ff',
    fontWeight: '500',
  },
  userEmail: {
    fontSize: 14,
    color: '#c7d2fe',
    fontWeight: '400',
    marginTop: 4,
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  priorityButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    gap: 8,
  },
  priorityButtonActive: {
    borderWidth: 2,
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  submitButton: {
    backgroundColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '500',
  },
  listContainer: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterButtonPrimary: {
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
  },
  filterButtonSecondary: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterButtonTextPrimary: {
    color: '#dc2626',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  itemHeader: {
    marginBottom: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  itemDate: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  itemMeta: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0369a1',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  priorityDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 13,
    fontWeight: '600',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  editButtonText: {
    color: '#0369a1',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  deleteButtonText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
  },
});
