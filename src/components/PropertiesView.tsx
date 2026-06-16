import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Search, 
  MapPin, 
  DollarSign, 
  Maximize, 
  BedDouble, 
  Bath, 
  Edit3, 
  Trash2, 
  Eye, 
  X,
  Building,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Property, PropertyType, PropertyStatus } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { db, auth } from '../firebase';
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export const PropertiesView: React.FC = () => {
  const { user, apiFetch, t } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  
  // Delete confirm action details
  const [deletePropId, setDeletePropId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [formType, setFormType] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    description: '',
    type: 'house' as PropertyType,
    price: 150000,
    address: '',
    status: 'available' as PropertyStatus,
    bedrooms: 2,
    bathrooms: 2,
    areaSqM: 90,
    imageUrl: ''
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Check action permissions (Rule 10/12)
  const canModify = user && (user.role === 'super_admin' || user.role === 'agent');

  const loadProperties = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    if (auth.currentUser) {
      try {
        const propertiesRef = collection(db, 'properties');
        const q = query(propertiesRef, where('orgId', '==', user.orgId));
        let querySnapshot;
        try {
          querySnapshot = await getDocs(q);
        } catch (rErr) {
          handleFirestoreError(rErr, OperationType.LIST, 'properties');
        }
        const list: Property[] = [];
        querySnapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Property);
        });
        setProperties(list);
      } catch (err: any) {
        setError(err.message || t.common.error);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const res = await apiFetch('/api/properties');
      const data = await res.json();
      if (data.success) {
        setProperties(data.properties || []);
      } else {
        setError(data.error || t.common.error);
      }
    } catch (err: any) {
      setError(err.message || t.common.error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, [user]);

  // Apply Search Filters Reactively
  useEffect(() => {
    let result = [...properties];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        p => p.title.toLowerCase().includes(query) || 
             p.address.toLowerCase().includes(query) || 
             p.description.toLowerCase().includes(query)
      );
    }

    if (typeFilter !== 'all') {
      result = result.filter(p => p.type === typeFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter(p => p.status === statusFilter);
    }

    setFilteredProperties(result);
  }, [properties, searchQuery, typeFilter, statusFilter]);

  const handleOpenCreateForm = () => {
    if (!canModify) return;
    setFormType('create');
    setFormData({
      id: '',
      title: '',
      description: '',
      type: 'house',
      price: 180000,
      address: '',
      status: 'available',
      bedrooms: 3,
      bathrooms: 2,
      areaSqM: 120,
      imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80'
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (property: Property, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canModify) return;
    setFormType('edit');
    setFormData({
      id: property.id,
      title: property.title,
      description: property.description,
      type: property.type,
      price: property.price,
      address: property.address,
      status: property.status,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      areaSqM: property.areaSqM,
      imageUrl: property.imageUrl
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenDetailModal = (property: Property) => {
    setSelectedProperty(property);
    setIsDetailOpen(true);
  };

  const handleFormInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    // Validations (Rule 6/15)
    if (!formData.title.trim()) return setFormError("El título no puede estar vacío.");
    if (!formData.address.trim()) return setFormError("La dirección física es mandatoria.");
    if (formData.price <= 0) return setFormError("El precio debe ser un número positivo.");
    if (formData.areaSqM <= 0) return setFormError("La superficie debe ser un número positivo.");

    setFormSubmitting(true);

    if (auth.currentUser) {
      try {
        const propertiesRef = collection(db, 'properties');
        if (formType === 'create') {
          const newDocDataWithoutId = {
            title: formData.title,
            description: formData.description,
            type: formData.type,
            price: Number(formData.price),
            address: formData.address,
            status: formData.status,
            bedrooms: Number(formData.bedrooms),
            bathrooms: Number(formData.bathrooms),
            areaSqM: Number(formData.areaSqM),
            imageUrl: formData.imageUrl || "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80",
            orgId: user.orgId,
            createdBy: auth.currentUser.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          try {
            await addDoc(propertiesRef, newDocDataWithoutId);
          } catch (wErr) {
            handleFirestoreError(wErr, OperationType.CREATE, 'properties');
          }
        } else {
          const docRef = doc(db, 'properties', formData.id);
          const updateData = {
            title: formData.title,
            description: formData.description,
            type: formData.type,
            price: Number(formData.price),
            address: formData.address,
            status: formData.status,
            bedrooms: Number(formData.bedrooms),
            bathrooms: Number(formData.bathrooms),
            areaSqM: Number(formData.areaSqM),
            imageUrl: formData.imageUrl,
            updatedAt: new Date().toISOString()
          };
          
          try {
            await updateDoc(docRef, updateData);
          } catch (wErr) {
            handleFirestoreError(wErr, OperationType.UPDATE, `properties/${formData.id}`);
          }
        }
        setSuccessMsg(t.properties.save_success);
        setTimeout(() => setSuccessMsg(null), 4000);
        setIsFormOpen(false);
        loadProperties();
      } catch (err: any) {
        setFormError(err.message || t.common.error);
      } finally {
        setFormSubmitting(false);
      }
      return;
    }

    try {
      const endpoint = formType === 'create' ? '/api/properties/create' : '/api/properties/update';
      const body = formType === 'create' 
        ? { ...formData, id: undefined } // ID generated by backend
        : formData;

      const res = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(body)
      });
      const data = await res.json();
      
      if (data.success) {
        setSuccessMsg(t.properties.save_success);
        setTimeout(() => setSuccessMsg(null), 4000);
        setIsFormOpen(false);
        loadProperties();
      } else {
        setFormError(data.error || t.common.error);
      }
    } catch (err: any) {
      setFormError(err.message || t.common.error);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Action Trigger
  const handleTriggerDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canModify) return;
    setDeletePropId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deletePropId) return;
    setIsDeleting(true);

    if (auth.currentUser) {
      try {
        const docRef = doc(db, 'properties', deletePropId);
        try {
          await deleteDoc(docRef);
        } catch (wErr) {
          handleFirestoreError(wErr, OperationType.DELETE, `properties/${deletePropId}`);
        }
        setSuccessMsg(t.properties.delete_success);
        setTimeout(() => setSuccessMsg(null), 4000);
        setDeletePropId(null);
        loadProperties();
      } catch (err: any) {
        alert(err.message || t.common.error);
      } finally {
        setIsDeleting(false);
      }
      return;
    }

    try {
      const res = await apiFetch('/api/properties/delete', {
        method: 'POST',
        body: JSON.stringify({ id: deletePropId })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(t.properties.delete_success);
        setTimeout(() => setSuccessMsg(null), 4000);
        setDeletePropId(null);
        loadProperties();
      } else {
        alert(data.error || t.common.error);
      }
    } catch (err: any) {
      alert(err.message || t.common.error);
    } finally {
      setIsDeleting(false);
    }
  };


  if (!user) return null;

  return (
    <div className="space-y-6" id="properties-view">
      {/* Alert Notices */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-xl flex items-center space-x-3 text-xs shadow-xs animate-fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-800 p-4 rounded-xl flex items-center space-x-3 text-xs shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Filter and Command Strip (Rule 15) */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs dark:bg-slate-900 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Searches */}
        <div className="flex-1 max-w-lg relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
          <input 
            type="text"
            placeholder={t.properties.search_placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition-all dark:bg-slate-800 dark:border-slate-800 dark:text-slate-100"
            id="property-search-input"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:bg-slate-800 dark:border-slate-800 dark:text-slate-200"
            id="filter-type-select"
          >
            <option value="all">Todas las categorías</option>
            <option value="house">{t.properties.types.house}</option>
            <option value="apartment">{t.properties.types.apartment}</option>
            <option value="land">{t.properties.types.land}</option>
            <option value="commercial">{t.properties.types.commercial}</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:bg-slate-800 dark:border-slate-800 dark:text-slate-200"
            id="filter-status-select"
          >
            <option value="all">Todos los estados</option>
            <option value="available">{t.properties.statuses.available}</option>
            <option value="reserved">{t.properties.statuses.reserved}</option>
            <option value="sold">{t.properties.statuses.sold}</option>
          </select>

          {/* Primary Action Button */}
          {canModify && (
            <button
              onClick={handleOpenCreateForm}
              className="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-xs text-white font-bold rounded-xl shadow-md shadow-teal-500/15 hover:opacity-95 flex items-center space-x-1.5 transition-all cursor-pointer"
              id="btn-add-property"
            >
              <Plus className="w-4 h-4" />
              <span>{t.properties.add_new}</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of properties (Fase 5) */}
      {loading ? (
        <div className="flex py-24 justify-center items-center">
          <svg className="animate-spin h-8 w-8 text-teal-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center shadow-xs dark:bg-slate-900 dark:border-slate-800" id="empty-state-properties">
          <Building className="w-12 h-12 text-slate-300 mx-auto opacity-70 mb-4" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1 leading-tight">No se encontraron ofertas</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">{t.properties.empty_state}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="properties-grid-container">
          {filteredProperties.map((p) => (
            <div 
              key={p.id}
              onClick={() => handleOpenDetailModal(p)}
              className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-xs hover:shadow-md hover:border-slate-200/60 transition-all duration-300 flex flex-col group cursor-pointer dark:bg-slate-900 dark:border-slate-800"
              id={`property-card-${p.id}`}
            >
              {/* Photo Area */}
              <div className="relative h-48 bg-slate-100 overflow-hidden shrink-0">
                <img 
                  src={p.imageUrl} 
                  alt={p.title} 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                />
                
                {/* Status sticker */}
                <span className={`absolute top-3 left-3 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-widest rounded-lg shadow-sm ${
                  p.status === 'available' ? 'bg-teal-500 text-white' :
                  p.status === 'reserved' ? 'bg-amber-500 text-white' :
                  'bg-slate-700 text-white'
                }`}>
                  {p.status === 'available' ? t.properties.statuses.available : p.status === 'reserved' ? t.properties.statuses.reserved : t.properties.statuses.sold}
                </span>

                {/* Property Category */}
                <span className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-bold px-2.5 py-1 rounded-lg">
                  {p.type === 'house' ? t.properties.types.house : p.type === 'apartment' ? t.properties.types.apartment : p.type === 'land' ? t.properties.types.land : t.properties.types.commercial}
                </span>
              </div>

              {/* Contents */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-teal-600 transition-colors leading-snug">
                    {p.title}
                  </h3>
                  
                  <div className="flex items-center space-x-1.5 text-slate-400 mt-2">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="text-[10px] uppercase font-bold tracking-tight truncate block leading-none">{p.address}</span>
                  </div>

                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-3 line-clamp-2 leading-relaxed">
                    {p.description}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-50 dark:border-slate-800">
                  {/* Stats line */}
                  <div className="flex items-center justify-between text-slate-500">
                    <div className="flex items-center space-x-4 text-[10px] font-bold text-slate-400 font-mono">
                      {p.bedrooms > 0 && (
                        <div className="flex items-center space-x-1">
                          <BedDouble className="w-3.5 h-3.5 text-slate-400" />
                          <span>{p.bedrooms}D</span>
                        </div>
                      )}
                      {p.bathrooms > 0 && (
                        <div className="flex items-center space-x-1">
                          <Bath className="w-3.5 h-3.5 text-slate-400" />
                          <span>{p.bathrooms}B</span>
                        </div>
                      )}
                      {p.areaSqM > 0 && (
                        <div className="flex items-center space-x-1">
                          <Maximize className="w-3.5 h-3.5 text-slate-400" />
                          <span>{p.areaSqM} m²</span>
                        </div>
                      )}
                    </div>

                    <div className="text-sm font-extrabold text-teal-600 dark:text-teal-400 font-mono">
                      ${p.price.toLocaleString()}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-4 pt-1 flex items-center justify-end space-x-1.5 border-t border-dashed border-slate-50 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleOpenDetailModal(p)}
                      className="px-2.5 py-1 text-[10px] font-bold rounded-lg text-slate-500 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 flex items-center space-x-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>{t.common.view_details}</span>
                    </button>
                    {canModify && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditForm(p, e)}
                          className="px-2.5 py-1 text-[10px] font-bold rounded-lg text-blue-600 bg-blue-50/50 hover:bg-blue-100 dark:bg-slate-800 dark:text-blue-400 dark:hover:bg-slate-700 flex items-center space-x-1"
                          id={`btn-edit-prop-${p.id}`}
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{t.properties.edit}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleTriggerDelete(p.id, e)}
                          className="px-2.5 py-1 text-[10px] font-bold rounded-lg text-rose-600 bg-rose-50/50 hover:bg-rose-100 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-slate-700 flex items-center space-x-1"
                          id={`btn-delete-prop-${p.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>{t.common.delete}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- FORM MODAL: CREATE & EDIT (Rule 15) --- */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div 
            className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden my-6 border border-slate-100 dark:bg-slate-900 dark:border-slate-800 max-h-[85vh] flex flex-col"
            id="property-form-modal"
          >
            {/* Header */}
            <div className="h-16 border-b border-slate-50 px-6 flex items-center justify-between dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                {formType === 'create' ? t.properties.add_new : t.properties.edit}
              </h3>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {formError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-800 p-4 rounded-xl flex items-center space-x-3 text-xs">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                  <span className="font-semibold">{formError}</span>
                </div>
              )}

              {/* Grid 2x2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5Col">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    {t.properties.form.title_label}
                  </label>
                  <input 
                    type="text" 
                    name="title"
                    value={formData.title}
                    onChange={handleFormInputChange}
                    placeholder="Casa moderna frente al lago..."
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:bg-slate-800 dark:border-slate-800 dark:text-slate-100"
                    required
                  />
                </div>

                <div className="space-y-1.5Col">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    {t.properties.form.price_label}
                  </label>
                  <input 
                    type="number" 
                    name="price"
                    value={formData.price}
                    onChange={handleFormInputChange}
                    placeholder="220000"
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:bg-slate-800 dark:border-slate-800 dark:text-slate-100"
                    required
                  />
                </div>

                <div className="space-y-1.5Col">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    {t.properties.form.type_label}
                  </label>
                  <select 
                    name="type"
                    value={formData.type}
                    onChange={handleFormInputChange}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:bg-slate-800 dark:border-slate-800 dark:text-slate-100"
                  >
                    <option value="house">{t.properties.types.house}</option>
                    <option value="apartment">{t.properties.types.apartment}</option>
                    <option value="land">{t.properties.types.land}</option>
                    <option value="commercial">{t.properties.types.commercial}</option>
                  </select>
                </div>

                <div className="space-y-1.5Col">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    {t.properties.form.status_label}
                  </label>
                  <select 
                    name="status"
                    value={formData.status}
                    onChange={handleFormInputChange}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:bg-slate-800 dark:border-slate-800 dark:text-slate-100"
                  >
                    <option value="available">{t.properties.statuses.available}</option>
                    <option value="reserved">{t.properties.statuses.reserved}</option>
                    <option value="sold">{t.properties.statuses.sold}</option>
                  </select>
                </div>
              </div>

              {/* Full Address */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {t.properties.form.address_label}
                </label>
                <input 
                  type="text" 
                  name="address"
                  value={formData.address}
                  onChange={handleFormInputChange}
                  placeholder="Av. del Libertador 4500, CABA..."
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:bg-slate-800 dark:border-slate-800 dark:text-slate-100"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {t.properties.form.desc_label}
                </label>
                <textarea 
                  name="description"
                  value={formData.description}
                  onChange={handleFormInputChange}
                  placeholder="Escriba los detalles de la oferta..."
                  rows={3}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:bg-slate-800 dark:border-slate-800 dark:text-slate-100"
                />
              </div>

              {/* 3 Metrics: Beds, Baths, Area */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    {t.properties.form.beds_label}
                  </label>
                  <input 
                    type="number" 
                    name="bedrooms"
                    value={formData.bedrooms}
                    onChange={handleFormInputChange}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:bg-slate-800 dark:border-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    {t.properties.form.baths_label}
                  </label>
                  <input 
                    type="number" 
                    name="bathrooms"
                    value={formData.bathrooms}
                    onChange={handleFormInputChange}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:bg-slate-800 dark:border-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    {t.properties.form.area_label}
                  </label>
                  <input 
                    type="number" 
                    name="areaSqM"
                    value={formData.areaSqM}
                    onChange={handleFormInputChange}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:bg-slate-800 dark:border-slate-800 dark:text-slate-100"
                    required
                  />
                </div>
              </div>

              {/* Image Url */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {t.properties.form.img_label}
                </label>
                <input 
                  type="text" 
                  name="imageUrl"
                  value={formData.imageUrl}
                  onChange={handleFormInputChange}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:bg-slate-800 dark:border-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Dialog Footer Actions */}
              <div className="p-4 border-t border-slate-50 mt-6 flex justify-end space-x-3 bg-slate-50 dark:bg-slate-900/40 dark:border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white shadow-xs tracking-wide flex items-center justify-center space-x-2"
                  id="property-form-submit-btn"
                >
                  {formSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>{t.common.loading}</span>
                    </>
                  ) : (
                    <span>{t.common.save}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DETAIL READ-ONLY MODAL (Rule 15) --- */}
      {isDetailOpen && selectedProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div 
            className="w-full max-w-xl bg-white rounded-2xl shadow-xl overflow-hidden my-6 border border-slate-100 dark:bg-slate-900 dark:border-slate-800"
            id="property-detail-modal"
          >
            {/* Image banner */}
            <div className="relative h-64 bg-slate-100">
              <img 
                src={selectedProperty.imageUrl} 
                alt={selectedProperty.title} 
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover" 
              />
              <button 
                onClick={() => setIsDetailOpen(false)}
                className="absolute top-4 right-4 p-2 bg-slate-900/60 backdrop-blur-xs text-white rounded-full hover:bg-slate-900 transition-colors"
                id="btn-close-detail-modal"
              >
                <X className="w-4 h-4" />
              </button>
              
              <span className="absolute bottom-4 left-4 bg-teal-600 text-white text-xs font-bold px-3 py-1 rounded-lg">
                USD {selectedProperty.price.toLocaleString()}
              </span>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded uppercase font-mono tracking-widest dark:bg-teal-950/20 dark:text-teal-400">
                  {selectedProperty.type === 'house' ? t.properties.types.house : selectedProperty.type === 'apartment' ? t.properties.types.apartment : selectedProperty.type === 'land' ? t.properties.types.land : selectedProperty.type === 'commercial' ? t.properties.types.commercial : selectedProperty.type}
                </span>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mt-2">{selectedProperty.title}</h3>
                
                <div className="flex items-center space-x-1 text-slate-400 mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="text-xs uppercase font-semibold text-slate-500">{selectedProperty.address}</span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Descripción del Inmueble</h4>
                <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                  {selectedProperty.description}
                </p>
              </div>

              {/* Tech Spec Grid */}
              <div className="grid grid-cols-3 gap-2.5 p-3.5 bg-slate-50 rounded-xl dark:bg-slate-800/50">
                <div className="text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">{t.properties.bedrooms}</span>
                  <span className="text-xs font-extrabold text-slate-700 block mt-1 dark:text-slate-200">{selectedProperty.bedrooms} cuartos</span>
                </div>
                <div className="text-center border-x border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">{t.properties.bathrooms}</span>
                  <span className="text-xs font-extrabold text-slate-700 block mt-1 dark:text-slate-200">{selectedProperty.bathrooms} baños</span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">{t.properties.area}</span>
                  <span className="text-xs font-extrabold text-slate-700 block mt-1 dark:text-slate-200">{selectedProperty.areaSqM} m²</span>
                </div>
              </div>

              {/* Status details */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] text-slate-400 font-bold font-mono">
                  REF: {selectedProperty.id.toUpperCase()}
                </span>
                <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                  selectedProperty.status === 'available' ? 'bg-teal-50 text-teal-600 dark:bg-teal-950/20' :
                  selectedProperty.status === 'reserved' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20' :
                  'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {selectedProperty.status === 'available' ? t.properties.statuses.available : selectedProperty.status === 'reserved' ? t.properties.statuses.reserved : t.properties.statuses.sold}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Confirm modal for destructions */}
      <ConfirmModal 
        isOpen={deletePropId !== null}
        title="¿Eliminar Propiedad?"
        message="Esta acción es definitiva y eliminará permanentemente la oferta de propiedades de la base de datos corporativa. Se registrará en la auditoría técnica del servidor."
        confirmText="Eliminar permanentemente"
        isDanger={true}
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletePropId(null)}
      />
    </div>
  );
};
