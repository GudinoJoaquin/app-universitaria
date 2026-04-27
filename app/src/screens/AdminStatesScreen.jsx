import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import {
  getAllStates,
  createState,
  updateState,
  deleteState,
  setDefaultState,
} from '../services/statesService';

export default function AdminStatesScreen({ navigation }) {
  const { user } = useAuth();
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingState, setEditingState] = useState(null);
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState('#3B82F6');
  const [submitting, setSubmitting] = useState(false);

  // Verificar si el usuario es admin
  useEffect(() => {
    if (user?.role !== 'Admin') {
      Alert.alert('Acceso Denegado', 'Solo los administradores pueden acceder a esta sección.');
      navigation.goBack();
    }
  }, [user, navigation]);

  // Cargar estados
  useEffect(() => {
    loadStates();
  }, []);

  const loadStates = async () => {
    setLoading(true);
    const result = await getAllStates();
    if (result.success) {
      setStates(result.data);
    } else {
      Alert.alert('Error', result.error || 'Error al cargar los estados');
    }
    setLoading(false);
  };

  const openModal = (state = null) => {
    if (state) {
      setEditingState(state);
      setFormName(state.name);
      setFormColor(state.color);
    } else {
      setEditingState(null);
      setFormName('');
      setFormColor('#3B82F6');
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingState(null);
    setFormName('');
    setFormColor('#3B82F6');
  };

  const handleSaveState = async () => {
    if (!formName.trim()) {
      Alert.alert('Validación', 'El nombre del estado es requerido');
      return;
    }

    setSubmitting(true);
    let result;

    if (editingState) {
      result = await updateState(editingState.id, {
        name: formName.trim(),
        color: formColor,
        is_default: editingState.is_default,
      });
    } else {
      result = await createState(formName.trim(), formColor);
    }

    setSubmitting(false);

    if (result.success) {
      Alert.alert('Éxito', editingState ? 'Estado actualizado' : 'Estado creado');
      closeModal();
      loadStates();
    } else {
      Alert.alert('Error', result.error);
    }
  };

  const handleDeleteState = (state) => {
    if (state.is_default) {
      Alert.alert('No permitido', 'No puedes eliminar el estado por defecto');
      return;
    }

    Alert.alert(
      'Confirmar eliminación',
      `¿Estás seguro de que quieres eliminar "${state.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          onPress: async () => {
            const result = await deleteState(state.id);
            if (result.success) {
              Alert.alert('Éxito', 'Estado eliminado');
              loadStates();
            } else {
              Alert.alert('Error', result.error);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleSetDefault = async (state) => {
    if (state.is_default) {
      Alert.alert('Info', 'Este estado ya es el por defecto');
      return;
    }

    Alert.alert(
      'Cambiar estado por defecto',
      `¿Quieres establecer "${state.name}" como el estado por defecto para nuevos usuarios?\n\nLos usuarios actuales no se verán afectados.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cambiar',
          onPress: async () => {
            const result = await setDefaultState(state.id);
            if (result.success) {
              Alert.alert('Éxito', `"${state.name}" es ahora el estado por defecto`);
              loadStates();
            } else {
              Alert.alert('Error', result.error);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" />

      <LinearGradient colors={["#1E3A8A", "#3B82F6"]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Gestionar Estados</Text>
          <Text style={styles.headerSubtitle}>Crea, edita y configura los estados del sistema</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentPadding}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => openModal()}
        >
          <Ionicons name="add-circle" size={24} color="white" />
          <Text style={styles.addButtonText}>Nuevo Estado</Text>
        </TouchableOpacity>

        {states.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="layers-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>No hay estados configurados</Text>
          </View>
        ) : (
          <View style={styles.statesList}>
            {states.map((state) => (
              <View key={state.id} style={styles.stateCard}>
                <View style={styles.stateHeader}>
                  <View style={[styles.colorCircle, { backgroundColor: state.color }]} />
                  <View style={styles.stateInfo}>
                    <Text style={styles.stateName}>{state.name}</Text>
                    {state.is_default && (
                      <View style={styles.defaultBadge}>
                        <Ionicons name="star" size={14} color="#FCD34D" />
                        <Text style={styles.defaultBadgeText}>Estado por defecto</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.stateColor}>{state.color}</Text>
                </View>

                <View style={styles.stateActions}>
                  {!state.is_default && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleSetDefault(state)}
                    >
                      <Ionicons name="star-outline" size={18} color="#FCD34D" />
                      <Text style={styles.actionButtonText}>Hacer defecto</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => openModal(state)}
                  >
                    <Ionicons name="pencil" size={18} color="#3B82F6" />
                    <Text style={styles.actionButtonText}>Editar</Text>
                  </TouchableOpacity>

                  {!state.is_default && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDeleteState(state)}
                    >
                      <Ionicons name="trash" size={18} color="#EF4444" />
                      <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Eliminar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal para crear/editar estado */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingState ? 'Editar Estado' : 'Nuevo Estado'}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nombre del Estado</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Estudiante, Profesor..."
                  value={formName}
                  onChangeText={setFormName}
                  editable={!submitting}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Color (Código HEX)</Text>
                <View style={styles.colorInputRow}>
                  <View style={[styles.colorPreview, { backgroundColor: formColor }]} />
                  <TextInput
                    style={styles.colorInput}
                    placeholder="#3B82F6"
                    value={formColor}
                    onChangeText={setFormColor}
                    editable={!submitting}
                  />
                </View>
              </View>

              <View style={styles.colorPalette}>
                <Text style={styles.label}>Colores sugeridos</Text>
                <View style={styles.colorGrid}>
                  {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#6B7280'].map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        formColor === color && styles.colorOptionSelected,
                      ]}
                      onPress={() => setFormColor(color)}
                    >
                      {formColor === color && (
                        <Ionicons name="checkmark" size={24} color="white" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={closeModal}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleSaveState}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {editingState ? 'Actualizar' : 'Crear'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E0E7FF',
  },
  content: {
    flex: 1,
  },
  contentPadding: {
    padding: 16,
  },
  addButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 12,
  },
  statesList: {
    gap: 12,
  },
  stateCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  stateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  stateInfo: {
    flex: 1,
  },
  stateName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  defaultBadgeText: {
    fontSize: 12,
    color: '#FCD34D',
    fontWeight: '500',
  },
  stateColor: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  stateActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    gap: 6,
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
  },
  actionButtonText: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '500',
  },
  deleteButtonText: {
    color: '#EF4444',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalForm: {
    marginBottom: 20,
  },
  formGroup: {
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
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
  },
  colorInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorPreview: {
    width: 50,
    height: 50,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  colorInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
  },
  colorPalette: {
    marginTop: 20,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorOption: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#1F2937',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
